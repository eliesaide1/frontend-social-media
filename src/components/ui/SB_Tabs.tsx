"use client";

import { cn } from "@/lib/utils";

export interface Tab {
  label: string;
  value: string;
}

interface SB_TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function SB_Tabs({
  tabs,
  activeTab,
  onTabChange,
}: SB_TabsProps) {
  return (
    <div className="flex gap-2 flex-wrap my-3.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-colors",
            activeTab === tab.value
              ? "bg-brand border-brand text-white"
              : "bg-white border-line text-[#5b677d] hover:bg-[#f5f7fb]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
