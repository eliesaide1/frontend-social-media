"use client";

import { Upload, Bell, Menu } from "lucide-react";
import SB_Avatar from "@/components/ui/SB_Avatar";
import SB_Select from "@/components/ui/SB_Select";
import SB_Button from "@/components/ui/SB_Button";
import { DATE_RANGES } from "@/lib/constants";

interface SB_TopbarProps {
  selectedDateRange: string;
  onDateRangeChange: (value: string) => void;
  onExport?: () => void;
  onMenuToggle?: () => void;
}

export default function SB_Topbar({
  selectedDateRange,
  onDateRangeChange,
  onExport,
  onMenuToggle,
}: SB_TopbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-[10px] border-b border-line px-4 py-3 lg:px-7 flex flex-wrap items-center justify-between gap-3 lg:h-[72px]">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[12px] border border-line bg-white cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <SB_Select
          options={DATE_RANGES.map((d) => ({
            label: d.label,
            value: d.value,
          }))}
          value={selectedDateRange}
          onChange={onDateRangeChange}
        />
        <SB_Button variant="ghost" onClick={onExport} className="hidden sm:inline-flex">
          <Upload size={16} />
          <span className="hidden md:inline">Export Report</span>
        </SB_Button>
        <SB_Button variant="ghost">
          <Bell size={16} />
        </SB_Button>
        <SB_Avatar initials="RK" />
      </div>
    </div>
  );
}
