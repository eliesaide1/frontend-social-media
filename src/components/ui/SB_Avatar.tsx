import { cn } from "@/lib/utils";

interface SB_AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "w-8 h-8 text-xs",
  md: "w-[38px] h-[38px] text-sm",
  lg: "w-12 h-12 text-base",
};

export default function SB_Avatar({
  initials,
  size = "md",
  className,
}: SB_AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-[#27468f] text-white grid place-items-center font-bold",
        sizeStyles[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
