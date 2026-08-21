"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { DateRange } from "@/types";

interface DateRangeContextType {
  dateRange: DateRange;
  dateRangeLabel: string;
  setDateRange: (range: DateRange) => void;
  setDateRangeLabel: (label: string) => void;
}

const defaultRange: DateRange = {
  start: "2026-08-01",
  end: "2026-08-31",
};

const DateRangeContext = createContext<DateRangeContextType | undefined>(
  undefined
);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [dateRangeLabel, setDateRangeLabel] = useState("Aug 1 – Aug 31, 2026");

  return (
    <DateRangeContext.Provider
      value={{ dateRange, dateRangeLabel, setDateRange, setDateRangeLabel }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
}
