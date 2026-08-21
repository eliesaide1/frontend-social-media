"use client";

import { cn } from "@/lib/utils";

interface SelectOption {
  label: string;
  value: string;
}

interface SB_SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SB_Select({
  options,
  value,
  onChange,
  className,
}: SB_SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "border border-line bg-white rounded-[12px] px-3.5 py-2.5 text-[#33405a] text-sm cursor-pointer appearance-auto",
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
