"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface SB_SparkLineProps {
  data: number[];
  color?: string;
  height?: number;
}

export default function SB_SparkLine({
  data,
  color = "#7c5cff",
  height = 42,
}: SB_SparkLineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.4}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
