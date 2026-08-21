import { cn } from "@/lib/utils";

interface SB_CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function SB_Card({ children, className }: SB_CardProps) {
  return (
    <div
      className={cn(
        "bg-panel border border-line rounded-[18px] shadow-card p-[18px]",
        className
      )}
    >
      {children}
    </div>
  );
}
