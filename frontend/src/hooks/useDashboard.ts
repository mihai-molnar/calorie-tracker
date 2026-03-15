import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

interface DailyLog {
  date: string;
  weight_kg: number | null;
  total_calories: number;
}

interface DashboardData {
  today: {
    date: string;
    weight_kg: number | null;
    total_calories: number;
    daily_calorie_target: number;
    calories_remaining: number;
  };
  history: DailyLog[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await apiFetch("/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return { data, loading, error };
}
