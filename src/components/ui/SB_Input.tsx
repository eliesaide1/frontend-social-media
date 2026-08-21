"use client";

import { cn } from "@/lib/utils";

interface SB_InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function SB_Input({
  label,
  className,
  ...props
}: SB_InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs text-[#6d7a90] font-bold">{label}</label>
      )}
      <input
        className={cn(
          "w-full border border-line rounded-[12px] px-3 py-[11px] bg-white text-[#2c3951] text-sm outline-none focus:border-brand transition-colors",
          className
        )}
        {...props}
      />
    </div>
  );
}
