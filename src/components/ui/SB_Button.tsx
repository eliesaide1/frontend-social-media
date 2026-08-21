"use client";

import { cn } from "@/lib/utils";

interface SB_ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  loading?: boolean;
}

const variantStyles = {
  primary:
    "bg-brand text-white border-brand font-bold hover:bg-brand/90",
  ghost:
    "bg-white text-[#33405a] border-line hover:bg-[#f5f7fb]",
  outline:
    "bg-transparent text-[#33405a] border-line hover:bg-[#f5f7fb]",
};

export default function SB_Button({
  variant = "ghost",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: SB_ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] border text-sm cursor-pointer transition-colors",
        variantStyles[variant],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
