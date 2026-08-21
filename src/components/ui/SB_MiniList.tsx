import { cn } from "@/lib/utils";

export interface MiniListItem {
  label: React.ReactNode;
  value: React.ReactNode;
}

interface SB_MiniListProps {
  items: MiniListItem[];
  className?: string;
}

export default function SB_MiniList({ items, className }: SB_MiniListProps) {
  return (
    <div className={cn("grid gap-0", className)}>
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between gap-2.5 py-[9px]",
            i < items.length - 1 && "border-b border-line"
          )}
        >
          <span className="text-sm text-[#44516a]">{item.label}</span>
          <span className="text-sm font-bold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
