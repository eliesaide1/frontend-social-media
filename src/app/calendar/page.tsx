"use client";

import { useMemo } from "react";
import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Card from "@/components/ui/SB_Card";
import SB_Badge from "@/components/ui/SB_Badge";
import SB_Button from "@/components/ui/SB_Button";
import SB_MiniList from "@/components/ui/SB_MiniList";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  day: number;
  title: string;
  type: "ig" | "fb" | "mix";
}

const events: CalendarEvent[] = [
  { day: 5, title: "IG · Reel 10:00", type: "ig" },
  { day: 7, title: "IG+FB · Promo", type: "mix" },
  { day: 12, title: "FB · Video 14:00", type: "fb" },
  { day: 16, title: "IG+FB · Promo", type: "mix" },
  { day: 19, title: "IG · Reel 10:00", type: "ig" },
  { day: 28, title: "FB · Video 14:00", type: "fb" },
  { day: 31, title: "IG+FB · Promo", type: "mix" },
];

const eventColors = {
  ig: "bg-[#fff0f7] text-[#bd2d7d]",
  fb: "bg-[#eef4ff] text-[#2b60c8]",
  mix: "bg-[#f0ecff] text-[#654bd3]",
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const days = useMemo(() => {
    // August 2026 starts on Saturday (day 6)
    const startDay = 6;
    const totalDays = 31;
    const cells: (number | null)[] = [];

    // Empty cells before the 1st
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    return cells;
  }, []);

  return (
    <>
      <SB_PageHeader
        title="Content Calendar"
        description="Plan, review and manage scheduled publishing."
        actionLabel="＋ Schedule Content"
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        {/* Calendar */}
        <SB_Card>
          <div className="flex justify-between items-center mb-3">
            <strong>August 2026</strong>
            <div className="flex gap-2">
              <SB_Button variant="ghost">‹</SB_Button>
              <SB_Button variant="ghost">Today</SB_Button>
              <SB_Button variant="ghost">›</SB_Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-line border border-line rounded-[16px] overflow-hidden">
            {/* Headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="bg-white p-2.5 text-xs text-[#7a879c] font-bold text-center"
              >
                {day}
              </div>
            ))}

            {/* Day cells */}
            {days.map((day, i) => {
              const dayEvents = day
                ? events.filter((e) => e.day === day)
                : [];
              return (
                <div
                  key={i}
                  className={cn(
                    "bg-white p-1 sm:p-2.5 min-h-[60px] sm:min-h-[100px]",
                    !day && "bg-[#fafbfd]"
                  )}
                >
                  {day && (
                    <>
                      <div className="text-xs text-[#7b879a] mb-1.5">
                        {day}
                      </div>
                      {dayEvents.map((ev, j) => (
                        <div
                          key={j}
                          className={cn(
                            "rounded-lg px-1 sm:px-[7px] py-1 sm:py-1.5 text-[9px] sm:text-[11px] mb-1 cursor-pointer truncate",
                            eventColors[ev.type]
                          )}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </SB_Card>

        {/* Selected Post Sidebar */}
        <SB_Card>
          <strong>Selected Post</strong>
          <div className="h-[180px] rounded-[14px] bg-gradient-to-br from-[#c89cd9] to-[#f0d8e5] my-4" />
          <h3 className="m-0">New Collection Launch</h3>
          <div className="text-xs text-muted mt-1">Facebook · Video</div>
          <SB_MiniList
            className="mt-4"
            items={[
              {
                label: "Status",
                value: <SB_Badge variant="good">Scheduled</SB_Badge>,
              },
              { label: "Date", value: <b>Aug 12</b> },
            ]}
          />
          <div className="grid gap-2 mt-3">
            <SB_Button variant="ghost" className="w-full justify-center">
              Edit
            </SB_Button>
            <SB_Button variant="ghost" className="w-full justify-center">
              Reschedule
            </SB_Button>
          </div>
        </SB_Card>
      </div>
    </>
  );
}
