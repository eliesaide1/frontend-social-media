"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface SB_DonutChartProps {
  data: DonutSegment[];
  centerValue?: string;
  centerLabel?: string;
  size?: number;
}

export default function SB_DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 180,
}: SB_DonutChartProps) {
  return (
    <div className="relative" style={{ width: size, height: size, margin: "0 auto" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            dataKey="value"
            stroke="none"
          >
            {data.map((segment, i) => (
              <Cell key={i} fill={segment.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex items-center justify-center z-[2] text-center pointer-events-none">
          <div>
            <div className="font-extrabold text-[25px]">{centerValue}</div>
            {centerLabel && (
              <div className="text-xs text-muted font-medium">
                {centerLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
