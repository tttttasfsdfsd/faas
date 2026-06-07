/**
 * useChat — hook لإدارة المحادثة مع المستشار الذكي
 *
 * يعزل: إرسال الرسائل / تاريخ المحادثة / السياق الكامل
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/providers/trpc';
import type { ChatMessage } from '@/types/financial';
import type { ComprehensiveFinancials } from '@/lib/financialEngine';

interface UseChatOptions {
  financials?: ComprehensiveFinancials | null;
  companyName?: string;
  language: 'ar' | 'en';
  targets?: Record<string, number | null>;
  sector?: string;
  sectorBenchmarks?: Record<string, unknown>;
  earningsQualityScore?: number;
  lastScenario?: {
    variable: string;
    changePct: number;
    result: Record<string, unknown>;
  };
}

export function useChat(options: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.chat.send.useMutation();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatMutation.mutateAsync({
        message: messageText,
        financials: options.financials ? (options.financials as unknown as Record<string, unknown>) : undefined,
        companyName: options.companyName,
        history: messages.slice(-8),
        language: options.language,
        // السياق الكامل للمستشار الذكي
        targets: options.targets,
        sector: options.sector,
        sectorBenchmarks: options.sectorBenchmarks as Record<string, unknown> | undefined,
        earningsQualityScore: options.earningsQualityScore,
        lastScenario: options.lastScenario,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.reply || (options.language === 'ar' ? 'لم أستطع الإجابة.' : 'Unable to respond.'),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: options.language === 'ar'
          ? 'حدث خطأ في الاتصال. يرجى المحاولة مجدداً.'
          : 'Connection error. Please try again.',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, options, chatMutation]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    clearChat,
    endRef,
  };
}
