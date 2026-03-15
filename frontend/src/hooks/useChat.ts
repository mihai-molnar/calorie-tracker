import { useState, useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatStats {
  totalCalories: number;
  weightKg: number | null;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ChatStats>({
    totalCalories: 0,
    weightKg: null,
  });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        const errorMsg: ChatMessage = {
          role: "assistant",
          content: `Error: ${err.detail || "Something went wrong"}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                const assistantMsg: ChatMessage = {
                  role: "assistant",
                  content: data.text,
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStats({
                  totalCalories: data.total_calories ?? statsRef.current.totalCalories,
                  weightKg: data.weight_kg ?? statsRef.current.weightKg,
                });
              }
            } catch {
              // Skip non-JSON SSE data
            }
          }
        }
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Failed to connect. Please check your internet connection.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, stats, sendMessage };
}
