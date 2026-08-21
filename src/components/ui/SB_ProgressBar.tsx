import { cn } from "@/lib/utils";

interface SB_ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
}

export default function SB_ProgressBar({
  value,
  color,
  className,
}: SB_ProgressBarProps) {
  return (
    <div
      className={cn(
        "h-2 bg-[#edf1f8] rounded-full overflow-hidden",
        className
      )}
    >
      <span
        className="block h-full rounded-full transition-all duration-300"
        style={{
          width: `${Math.min(Math.max(value, 0), 100)}%`,
          backgroundColor: color || "var(--blue)",
        }}
      />
    </div>
  );
}
