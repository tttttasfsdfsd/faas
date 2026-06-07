import { Hono } from "hono";
import { env } from "../lib/env.js";
import { requireAuth, getUser } from "../middleware/auth.js";
import { CheckoutSchema, MoyasarCheckoutSchema } from "../middleware/validation.js";

const billing = new Hono();

// ==================== UNIFIED PLAN DEFINITIONS ====================
// Single source of truth for plans — used by Stripe, Moyasar, and webhooks

export const PLANS = {
  free: { reports_limit: 3, label: "Free" },
  starter: { reports_limit: 20, label: "Starter" },
  professional: { reports_limit: 9999, label: "Professional" },
} as const;

export type PlanName = keyof typeof PLANS;

// Aliases for incoming webhook plan names → canonical plan
export const PLAN_ALIASES: Record<string, PlanName> = {
  free: "free",
  starter: "starter",
  pro: "professional",      // legacy Stripe name
  professional: "professional",
  enterprise: "professional", // legacy Stripe name — maps to professional
};

export function canonicalizePlan(raw: string): PlanName {
  const lower = raw?.toLowerCase() ?? "free";
  return PLAN_ALIASES[lower] ?? "free";
}

// ==================== STRIPE CHECKOUT ====================

billing.post("/stripe/checkout", requireAuth, async (c) => {
  try {
    if (!env.stripeSecretKey) {
      return c.json({ success: false, error: "Stripe not configured." }, 503);
    }

    const user = getUser(c);
    const body = await c.req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "Invalid input", details: parsed.error.errors }, 400);
    }

    const { plan, successUrl, cancelUrl } = parsed.data;
    const stripe = await import("stripe").then((m) => new m.default(env.stripeSecretKey));

    const priceId = plan === "professional"
      ? env.stripePriceIdProfessional
      : env.stripePriceIdStarter;

    if (!priceId) {
      return c.json({ success: false, error: `Stripe price not configured for plan: ${plan}` }, 503);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${env.appBaseUrl}/dashboard?upgraded=1`,
      cancel_url: cancelUrl || `${env.appBaseUrl}/pricing`,
      metadata: { user_id: user.id, plan },
      customer_email: user.email,
    });

    return c.json({ success: true, url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return c.json({ success: false, error: "Failed to create checkout session." }, 500);
  }
});

// ==================== STRIPE CUSTOMER PORTAL ====================

billing.post("/stripe/portal", requireAuth, async (c) => {
  try {
    if (!env.stripeSecretKey) {
      return c.json({ success: false, error: "Stripe not configured." }, 503);
    }

    const user = getUser(c);

    // Get Stripe customer ID from DB
    const dbRes = await fetch(
      `${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${user.id}&select=stripe_customer_id&limit=1`,
      {
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }
    );

    const rows = await dbRes.json() as Array<{ stripe_customer_id?: string }>;
    const customerId = rows?.[0]?.stripe_customer_id;

    if (!customerId) {
      return c.json({ success: false, error: "No active subscription found." }, 404);
    }

    const stripe = await import("stripe").then((m) => new m.default(env.stripeSecretKey));
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.appBaseUrl}/dashboard`,
    });

    return c.json({ success: true, url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return c.json({ success: false, error: "Failed to create portal session." }, 500);
  }
});

// ==================== STRIPE WEBHOOK ====================

billing.post("/stripe/webhook", async (c) => {
  try {
    if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
      return c.json({ error: "Stripe not configured." }, 503);
    }

    const body = await c.req.text();
    const sig = c.req.header("stripe-signature");
    if (!sig) return c.json({ error: "Missing signature." }, 400);

    const stripe = await import("stripe").then((m) => new m.default(env.stripeSecretKey));
    let event: import("stripe").Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret);
    } catch {
      return c.json({ error: "Invalid signature." }, 400);
    }

    await handleStripeEvent(event);
    return c.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return c.json({ error: "Webhook processing failed." }, 500);
  }
});

async function handleStripeEvent(event: import("stripe").Stripe.Event) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return;

  const supabaseHeaders = {
    "Content-Type": "application/json",
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
  };

  if (event.type === "checkout.session.completed" || event.type === "invoice.payment_succeeded") {
    const session = event.data.object as {
      customer?: string;
      customer_email?: string;
      metadata?: { plan?: string; user_id?: string };
    };

    const userId = session.metadata?.user_id;
    const rawPlan = session.metadata?.plan ?? "starter";
    const plan = canonicalizePlan(rawPlan);
    const planConfig = PLANS[plan];

    if (userId) {
      await fetch(`${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${userId}`, {
        method: "PATCH",
        headers: supabaseHeaders,
        body: JSON.stringify({
          plan,
          reports_limit: planConfig.reports_limit,
          stripe_customer_id: session.customer,
        }),
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as {
      metadata?: { user_id?: string; plan?: string };
      status?: string;
    };
    const userId = sub.metadata?.user_id;
    const plan = canonicalizePlan(sub.metadata?.plan ?? "free");
    if (userId) {
      await fetch(`${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${userId}`, {
        method: "PATCH",
        headers: supabaseHeaders,
        body: JSON.stringify({ plan, reports_limit: PLANS[plan].reports_limit }),
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as { metadata?: { user_id?: string } };
    const userId = sub.metadata?.user_id;
    if (userId) {
      await fetch(`${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${userId}`, {
        method: "PATCH",
        headers: supabaseHeaders,
        body: JSON.stringify({ plan: "free", reports_limit: PLANS.free.reports_limit }),
      });
    }
  }
}

// ==================== MOYASAR CHECKOUT (Saudi Arabia) ====================

billing.post("/moyasar/checkout", requireAuth, async (c) => {
  try {
    if (!env.moyasarPublishableKey || !env.moyasarSecretKey) {
      return c.json({ success: false, error: "Moyasar not configured." }, 503);
    }

    const user = getUser(c);
    const body = await c.req.json();
    const parsed = MoyasarCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "Invalid input", details: parsed.error.errors }, 400);
    }

    const { plan, callbackUrl } = parsed.data;
    const planConfig = PLANS[plan];
    const amountHalala = plan === "professional" ? 19900 : 4900; // SAR amounts in halala

    const moyasarRes = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(env.moyasarSecretKey + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        amount: amountHalala,
        currency: "SAR",
        description: `EEXA ${planConfig.label} Plan`,
        callback_url: callbackUrl || `${env.appBaseUrl}/billing/callback`,
        metadata: { user_id: user.id, plan },
      }),
    });

    if (!moyasarRes.ok) {
      const err = await moyasarRes.json();
      console.error("Moyasar error:", err);
      return c.json({ success: false, error: "Payment initiation failed." }, 502);
    }

    const invoice = await moyasarRes.json() as { id: string; url: string };
    return c.json({ success: true, invoiceId: invoice.id, url: invoice.url });
  } catch (err) {
    console.error("Moyasar checkout error:", err);
    return c.json({ success: false, error: "Failed to create payment." }, 500);
  }
});

// ==================== MOYASAR WEBHOOK ====================

billing.post("/moyasar/webhook", async (c) => {
  try {
    if (!env.moyasarSecretKey) {
      return c.json({ error: "Moyasar not configured." }, 503);
    }

    const body = await c.req.json() as {
      type?: string;
      data?: {
        status?: string;
        metadata?: { user_id?: string; plan?: string };
      };
    };

    // Verify the event is a completed payment
    if (body.type === "invoice_paid" || body.data?.status === "paid") {
      const userId = body.data?.metadata?.user_id;
      const rawPlan = body.data?.metadata?.plan ?? "starter";
      const plan = canonicalizePlan(rawPlan);
      const planConfig = PLANS[plan];

      if (userId && env.supabaseUrl && env.supabaseServiceRoleKey) {
        await fetch(`${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: env.supabaseServiceRoleKey,
            Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
          },
          body: JSON.stringify({ plan, reports_limit: planConfig.reports_limit }),
        });
      }
    }

    return c.json({ received: true });
  } catch (err) {
    console.error("Moyasar webhook error:", err);
    return c.json({ error: "Webhook processing failed." }, 500);
  }
});

export default billing;
