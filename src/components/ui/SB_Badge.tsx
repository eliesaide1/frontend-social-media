import { cn } from "@/lib/utils";

type BadgeVariant = "instagram" | "facebook" | "tiktok" | "good" | "paid";

interface SB_BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  instagram: "bg-[#fff0f7] text-[#d92f8b]",
  facebook: "bg-[#eef4ff] text-[#2f67da]",
  tiktok: "bg-[#f0f0f0] text-[#000]",
  good: "bg-[#eaf8f1] text-[#178654]",
  paid: "bg-[#fff6e9] text-[#d77a00]",
};

export default function SB_Badge({
  variant,
  children,
  className,
}: SB_BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-[5px] rounded-full text-[11px] font-bold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
