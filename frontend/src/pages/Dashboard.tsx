import { useDashboard } from "../hooks/useDashboard";
import { WeightChart } from "../components/WeightChart";
import { CalorieChart } from "../components/CalorieChart";

export function Dashboard() {
  const { data, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-4 text-center text-red-600 dark:text-red-400">{error || "Failed to load dashboard"}</div>;
  }

  const weeklyAvg =
    data.history.length > 0
      ? Math.round(
          data.history.slice(0, 7).reduce((sum, d) => sum + d.total_calories, 0) /
            Math.min(7, data.history.length)
        )
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {/* Summary cards — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Today</h2>
          <div className="flex justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.today.total_calories}
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal"> / {data.today.daily_calorie_target} kcal</span>
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">{data.today.calories_remaining} remaining</p>
            </div>
            {data.today.weight_kg && (
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.today.weight_kg}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">kg</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">7-Day Average</h2>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{weeklyAvg} kcal/day</p>
        </div>
      </div>

      {/* Charts — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Weight Trend</h2>
          <WeightChart data={data.history} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Daily Calories</h2>
          <CalorieChart data={data.history} target={data.today.daily_calorie_target} />
        </div>
      </div>
    </div>
  );
}
