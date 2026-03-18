import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function Settings() {
  const [calorieTarget, setCalorieTarget] = useState("");

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">Daily Calorie Target</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current target: {calorieTarget} kcal</p>
      </div>
    </div>
  );
}
