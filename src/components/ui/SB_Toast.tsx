"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface SB_ToastProps {
  message: string;
  show: boolean;
  onHide: () => void;
  duration?: number;
}

export default function SB_Toast({
  message,
  show,
  onHide,
  duration = 1800,
}: SB_ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onHide, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onHide, duration]);

  return (
    <div
      className={cn(
        "fixed right-6 bottom-6 bg-[#172033] text-white px-4 py-3 rounded-[12px] z-50 transition-all duration-250",
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2.5 pointer-events-none"
      )}
    >
      {message}
    </div>
  );
}
