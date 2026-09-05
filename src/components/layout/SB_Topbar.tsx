"use client";

import { Upload, Bell, Menu } from "lucide-react";
import SB_Avatar from "@/components/ui/SB_Avatar";
import SB_Select from "@/components/ui/SB_Select";
import SB_Button from "@/components/ui/SB_Button";
import { CUSTOM_DATE_RANGE, DATE_RANGES } from "@/lib/constants";
import SB_DateRangePopover from "@/components/ui/SB_DateRangePopover";
import { useDateRange } from "@/contexts/DateRangeContext";

interface SB_TopbarProps {
  onExport?: () => void;
  onMenuToggle?: () => void;
}

export default function SB_Topbar({ onExport, onMenuToggle }: SB_TopbarProps) {
  const { rangeKey, setRangeKey, isCustom } = useDateRange();

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
        <div className="flex items-center gap-2">
          <SB_Select
            options={[
              ...DATE_RANGES.map((d) => ({ label: d.label, value: d.value })),
              { label: "Custom range…", value: CUSTOM_DATE_RANGE },
            ]}
            value={rangeKey}
            onChange={setRangeKey}
          />
          {isCustom && <SB_DateRangePopover />}
        </div>

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
