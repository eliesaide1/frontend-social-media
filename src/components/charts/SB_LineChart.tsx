"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface ChartLine {
  dataKey: string;
  color: string;
  name: string;
}

interface SB_LineChartProps {
  data: Record<string, string | number>[];
  lines: ChartLine[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export default function SB_LineChart({
  data,
  lines,
  height = 280,
  showGrid = true,
  showLegend = false,
}: SB_LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {showGrid && (
          <CartesianGrid strokeDasharray="0" stroke="#e8edf5" vertical={false} />
        )}
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#8a96aa" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#8a96aa" }}
          tickLine={false}
          axisLine={false}
          width={45}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e7ebf3",
            borderRadius: 12,
            fontSize: 13,
          }}
        />
        {showLegend && <Legend />}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={3}
            dot={false}
            name={line.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
