"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  Globe,
  LayoutGrid,
  Calendar,
  Target,
  MessageCircle,
  Users,
  BarChart3,
  Settings,
  Plus,
  X,
} from "lucide-react";
import { NAV_SECTIONS, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  Instagram: Camera,
  Facebook: Globe,
  LayoutGrid,
  Calendar,
  Target,
  MessageCircle,
  Users,
  BarChart3,
};

interface SB_SidebarProps {
  open: boolean;
  onClose: () => void;
  onCreatePost?: () => void;
}

export default function SB_Sidebar({ open, onClose, onCreatePost }: SB_SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[250px] bg-white border-r border-line flex flex-col py-[22px] px-[18px] gap-4 overflow-y-auto z-50 transition-transform",
          "lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand + Mobile Close */}
        <div className="flex items-center justify-between pb-[18px]">
          <div className="flex items-center gap-2.5 font-extrabold text-xl px-2">
            <div className="grid grid-cols-3 gap-[3px] items-end">
              <span className="block w-[5px] h-3 bg-brand rounded-[3px]" />
              <span className="block w-[5px] h-5 bg-brand rounded-[3px]" />
              <span className="block w-[5px] h-4 bg-brand rounded-[3px]" />
            </div>
            {APP_NAME}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-[#f3f6fb] border-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Sections */}
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="text-[11px] font-extrabold text-[#9aa6b9] tracking-[0.08em] uppercase mx-2.5 mb-1.5 mt-2.5">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-[11px] rounded-[12px] my-0.5 text-sm no-underline transition-colors",
                    isActive
                      ? "bg-brand-light text-brand font-bold"
                      : "text-[#44516a] hover:bg-[#f5f7fb]"
                  )}
                >
                  {Icon && <Icon size={18} />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Create Post Button */}
        <div>
          <button
            onClick={() => {
              onCreatePost?.();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-[11px] rounded-[12px] my-0.5 text-sm text-[#44516a] hover:bg-[#f5f7fb] border-0 bg-transparent cursor-pointer"
          >
            <Plus size={18} />
            Create Post
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings */}
        <Link
          href="/settings"
          onClick={onClose}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-[11px] rounded-[12px] my-0.5 text-sm no-underline transition-colors",
            pathname === "/settings"
              ? "bg-brand-light text-brand font-bold"
              : "text-[#44516a] hover:bg-[#f5f7fb]"
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
      </aside>
    </>
  );
}
