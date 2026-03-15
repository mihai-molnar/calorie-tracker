import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface WeightChartProps {
  data: { date: string; weight_kg: number | null }[];
}

export function WeightChart({ data }: WeightChartProps) {
  const filtered = data
    .filter((d) => d.weight_kg !== null)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: d.weight_kg,
    }))
    .reverse();

  if (filtered.length === 0) {
    return <p className="text-gray-400 text-center py-8">No weight data yet. Log your weight in the chat!</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={filtered}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
