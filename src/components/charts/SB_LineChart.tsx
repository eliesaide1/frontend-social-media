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
  /**
   * Explicit y-axis bounds. Recharts defaults to starting at 0, which flattens
   * any series whose movement is small relative to its magnitude — a follower
   * count wandering between 23,939 and 23,943 draws as a straight line on a
   * 0–24,000 axis. Pass a fitted domain to show the shape instead.
   */
  yDomain?: [number, number];
  /** Formats the y-axis ticks, e.g. compact follower counts. */
  yTickFormatter?: (value: number) => string;
}

export default function SB_LineChart({
  data,
  lines,
  height = 280,
  showGrid = true,
  showLegend = false,
  yDomain,
  yTickFormatter,
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
          width={yDomain ? 60 : 45}
          domain={yDomain}
          // A fitted domain must not be widened back out to round numbers,
          // or the zoom it exists to provide is undone.
          allowDataOverflow={false}
          allowDecimals={false}
          tickFormatter={yTickFormatter}
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
