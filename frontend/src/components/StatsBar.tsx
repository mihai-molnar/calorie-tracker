interface StatsBarProps {
  totalCalories: number;
  dailyTarget: number;
  weightKg: number | null;
}

export function StatsBar({ totalCalories, dailyTarget, weightKg }: StatsBarProps) {
  const remaining = Math.max(0, dailyTarget - totalCalories);
  const percentage = Math.min(100, (totalCalories / dailyTarget) * 100);
  const isOver = totalCalories > dailyTarget;

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCalories}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm"> / {dailyTarget} kcal</span>
          </div>
          {weightKg && (
            <div className="text-right">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{weightKg} kg</span>
            </div>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-green-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isOver
            ? `${totalCalories - dailyTarget} kcal over target`
            : `${remaining} kcal remaining`}
        </p>
      </div>
    </div>
  );
}
