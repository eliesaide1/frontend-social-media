"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SB_ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function SB_Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "860px",
}: SB_ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,27,47,0.45)] flex items-center justify-center z-30 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-full max-h-[92vh] overflow-auto bg-white rounded-[22px] shadow-[0_30px_80px_rgba(15,27,47,0.22)] p-[22px]"
        )}
        style={{ maxWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="m-0 text-xl font-bold">{title}</h2>
            {subtitle && (
              <div className="text-[12px] text-muted mt-1">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f3f6fb] border-0 flex items-center justify-center cursor-pointer hover:bg-[#e8ecf3]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
