import { useState, useCallback } from 'react';
import type { ChatMessage, ChatAction } from '@/components/chat/types';
import { sendChatMessage } from '@/services/chat-api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating) return;

      const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        sender: 'user',
        text: trimmed,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      // Prepare history for AI context
      const history = messages.slice(-10).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      try {
        const result = await sendChatMessage(trimmed, history);

        // Mark user message as sent
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId ? { ...msg, status: 'sent' } : msg,
          ),
        );

        // Append Marty's answer
        const assistantMessage: ChatMessage = {
          id: `marty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: 'marty',
          text: result.response,
          timestamp: new Date().toISOString(),
          actions: result.actions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        // Mark user message with error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId ? { ...msg, status: 'error' } : msg,
          ),
        );

        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          sender: 'marty',
          text: "I ran into a problem connecting to your financial data. Please check your connection and tap 'Retry'.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsGenerating(false);
      }
    },
    [messages, isGenerating],
  );

  const retryMessage = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (msg) {
        // Remove the failed message and any error response immediately after it
        setMessages((prev) => prev.filter((m) => m.id !== messageId && !m.id.startsWith('error-')));
        void sendMessage(msg.text);
      }
    },
    [messages, sendMessage],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const handleAction = useCallback(
    (action: ChatAction) => {
      if (action.action === 'send') {
        void sendMessage(action.target);
      }
    },
    [sendMessage],
  );

  return {
    messages,
    isGenerating,
    sendMessage,
    retryMessage,
    clearMessages,
    handleAction,
  };
}
