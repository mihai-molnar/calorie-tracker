import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const res = await apiFetch("/dashboard");
      if (res.ok) {
        const data = await res.json();
        setCalorieTarget(String(data.today.daily_calorie_target));
      }
    }
    loadProfile();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.startsWith("sk-")) return;
    setSaving(true);
    const res = await apiFetch("/settings/api-key", {
      method: "PATCH",
      body: JSON.stringify({ openai_api_key: apiKey }),
    });
    setSaving(false);
    setMessage(res.ok ? "API key updated!" : "Failed to update API key");
    setApiKey("");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {message && (
        <div className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 text-sm p-3 rounded-lg">{message}</div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">OpenAI API Key</h2>
        <input
          type="password"
          placeholder="sk-... (leave blank to keep current)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
        />
        <button
          onClick={handleSaveApiKey}
          disabled={!apiKey.startsWith("sk-") || saving}
          className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Update API Key
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">Daily Calorie Target</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current target: {calorieTarget} kcal</p>
      </div>
    </div>
  );
}
