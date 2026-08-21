"use client";

import SB_Card from "./SB_Card";
import SB_SparkLine from "@/components/charts/SB_SparkLine";
import { cn } from "@/lib/utils";

interface SB_MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeDirection?: "up" | "down";
  sparkData?: number[];
  sparkColor?: string;
}

export default function SB_MetricCard({
  title,
  value,
  change,
  changeDirection = "up",
  sparkData,
  sparkColor,
}: SB_MetricCardProps) {
  return (
    <SB_Card>
      <div className="text-[13px] text-[#68758b]">{title}</div>
      <div className="text-xl sm:text-[28px] font-extrabold mt-2.5 mb-1">{value}</div>
      {change && (
        <div
          className={cn(
            "text-xs font-bold",
            changeDirection === "up" ? "text-green" : "text-red"
          )}
        >
          {changeDirection === "up" ? "↑" : "↓"} {change}
        </div>
      )}
      {sparkData && sparkData.length > 0 && (
        <div className="mt-2.5">
          <SB_SparkLine data={sparkData} color={sparkColor} height={42} />
        </div>
      )}
    </SB_Card>
  );
}
