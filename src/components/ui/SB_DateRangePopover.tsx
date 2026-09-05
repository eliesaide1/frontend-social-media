"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import SB_Button from "@/components/ui/SB_Button";
import { MAX_SELECTABLE_DAYS } from "@/lib/constants";
import { useDateRange } from "@/contexts/DateRangeContext";

/**
 * From/to picker for the custom range.
 *
 * A popover rather than inline fields: three controls plus a button sitting in
 * the topbar crowded it at every width and left the native date inputs visually
 * mismatched against the pill-shaped select beside them. Here the trigger stays
 * one pill showing the active window, and the editing surface only exists while
 * it is open.
 */
export default function SB_DateRangePopover() {
  const {
    label,
    draftStart,
    draftEnd,
    setDraftStart,
    setDraftEnd,
    maxEndDate,
    applyDraft,
    resetDraft,
    canApply,
    rangeError,
  } = useDateRange();

  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escape closes and discards, matching what Cancel does — leaving a half-typed
  // range in the inputs after dismissing would be applied by a later click.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetDraft();
        setOpen(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        resetDraft();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, resetDraft]);

  const fieldClass =
    "w-full border border-line rounded-[10px] px-3 py-2 text-[13px] text-[#33405a] bg-white " +
    "focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 border border-line bg-white rounded-[12px] px-3.5 py-2.5 text-sm text-[#33405a] cursor-pointer hover:bg-[#f5f7fb] transition-colors"
      >
        <CalendarDays size={15} className="text-[#8a96aa]" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          size={14}
          className={`text-[#8a96aa] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[286px] rounded-[16px] border border-line bg-white shadow-[0_16px_40px_rgba(15,27,47,0.16)] p-4">
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#8a96aa]">
                From
              </span>
              <input
                type="date"
                className={fieldClass}
                value={draftStart}
                // Capped at today, NOT at the current end — picking a start
                // after the end is allowed, and the end reopens a day later.
                max={today}
                onChange={(e) => setDraftStart(e.target.value)}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#8a96aa]">
                To
              </span>
              <input
                type="date"
                className={fieldClass}
                value={draftEnd}
                min={draftStart}
                // start + 90 days, capped at today — an over-long window
                // cannot be picked rather than being rejected afterwards.
                max={maxEndDate}
                onChange={(e) => setDraftEnd(e.target.value)}
              />
            </label>
          </div>

          <p
            className={`text-[11px] leading-relaxed mt-2.5 ${
              rangeError ? "text-red" : "text-muted"
            }`}
          >
            {rangeError ?? `Up to ${MAX_SELECTABLE_DAYS} days, ending today at the latest.`}
          </p>

          <div className="flex justify-end gap-2 mt-3.5">
            <SB_Button
              variant="ghost"
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => {
                resetDraft();
                setOpen(false);
              }}
            >
              Cancel
            </SB_Button>
            <SB_Button
              variant="primary"
              className="!px-3.5 !py-1.5 !text-xs"
              disabled={!canApply}
              onClick={() => {
                applyDraft();
                setOpen(false);
              }}
            >
              Apply
            </SB_Button>
          </div>
        </div>
      )}
    </div>
  );
}
