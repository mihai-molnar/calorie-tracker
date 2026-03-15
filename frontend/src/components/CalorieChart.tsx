import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

interface CalorieChartProps {
  data: { date: string; total_calories: number }[];
  target: number;
}

export function CalorieChart({ data, target }: CalorieChartProps) {
  const formatted = data
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calories: d.total_calories,
    }))
    .reverse();

  if (formatted.length === 0) {
    return <p className="text-gray-400 text-center py-8">No calorie data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <ReferenceLine y={target} stroke="#ef4444" strokeDasharray="5 5" />
        <Bar dataKey="calories" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
