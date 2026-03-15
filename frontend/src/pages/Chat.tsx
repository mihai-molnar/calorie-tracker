import { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { StatsBar } from "../components/StatsBar";
import { ChatMessage } from "../components/ChatMessage";
import { apiFetch } from "../lib/api";

export function Chat() {
  const { messages, loading, stats, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const [dailyTarget, setDailyTarget] = useState(2000);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTarget() {
      const res = await apiFetch("/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDailyTarget(data.today.daily_calorie_target);
      }
    }
    fetchTarget();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen">
      <StatsBar
        totalCalories={stats.totalCalories}
        dailyTarget={dailyTarget}
        weightKg={stats.weightKg}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">Tell me what you ate today</p>
            <p className="text-sm mt-2">
              e.g. "I had 2 boiled eggs and a coffee for breakfast"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-200 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white px-4 py-3 mb-16"
      >
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What did you eat?"
            className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
