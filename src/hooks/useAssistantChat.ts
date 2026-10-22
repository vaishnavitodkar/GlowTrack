import { useCallback, useEffect, useState } from "react";
import {
  AssistantMessage,
  resumeAssistantConversation,
  sendAssistantMessage,
} from "@/lib/skincareAssistant";

export function useAssistantChat() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);

  const resume = useCallback(async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const result = await resumeAssistantConversation();
      setConversationId(result.conversationId ?? null);
      setMessages(result.messages ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your conversation.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { void resume(); }, [resume]);

  const send = useCallback(async (raw: string) => {
    const content = raw.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setRetryText(content);
    const optimistic: AssistantMessage = { role: "user", content };
    setMessages((current) => [...current, optimistic]);
    try {
      const result = await sendAssistantMessage(content, conversationId ?? "");
      if (result.conversationId) setConversationId(result.conversationId);
      setMessages((current) => [...current, {
        role: "assistant", content: result.answer ?? "I couldn't form a response.",
        cited_sources: result.citations ?? [], created_at: new Date().toISOString(),
      }]);
      setRetryText(null);
    } catch (cause) {
      setMessages((current) => current.filter((message) => message !== optimistic));
      setError(cause instanceof Error ? cause.message : "The assistant couldn't answer. Please try again.");
    } finally {
      setSending(false);
    }
  }, [conversationId, sending]);

  const retry = useCallback(() => {
    if (retryText) void send(retryText);
    else void resume();
  }, [retryText, send, resume]);

  return { messages, loadingHistory, sending, error, retry, send };
}
