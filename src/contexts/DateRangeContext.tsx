"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  CUSTOM_DATE_RANGE,
  DATE_RANGES,
  DEFAULT_DATE_RANGE,
  MAX_SELECTABLE_DAYS,
} from "@/lib/constants";

/** How a series is bucketed for display. */
export type Grouping = "day" | "month";

interface DateRangeContextType {
  /** The selected option key: a preset value, or "custom" */
  rangeKey: string;
  setRangeKey: (key: string) => void;
  /** yyyy-MM-dd, inclusive — always a VALID window, even mid-edit */
  startDate: string;
  endDate: string;
  days: number;
  label: string;
  isCustom: boolean;
  /** What the from/to inputs display, until Apply is pressed */
  draftStart: string;
  draftEnd: string;
  setDraftStart: (value: string) => void;
  setDraftEnd: (value: string) => void;
  /** Latest selectable end date for the current start (start + 90 days, capped at today) */
  maxEndDate: string;
  /** Commits the draft; no requests are made until this runs */
  applyDraft: () => void;
  /** Discards edits and puts the inputs back to the applied window */
  resetDraft: () => void;
  /** False when the draft is invalid or already applied */
  canApply: boolean;
  /** Why the draft cannot be applied, or null */
  rangeError: string | null;
  grouping: Grouping;
  setGrouping: (grouping: Grouping) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(
  undefined
);

/** yyyy-MM-dd in UTC — the format the API's date parameters expect. */
function isoDay(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;
const parse = (value: string) => Date.parse(`${value}T00:00:00Z`);

/** Inclusive day count, matching how the API counts a window. */
function daysBetween(start: string, end: string) {
  return Math.round((parse(end) - parse(start)) / DAY_MS) + 1;
}

/**
 * The same rules the API enforces, applied before the request rather than
 * after a 400 comes back.
 */
function validateRange(start: string, end: string): string | null {
  if (!start || !end) return "Pick both a start and an end date.";
  if (Number.isNaN(parse(start)) || Number.isNaN(parse(end)))
    return "Dates must be valid.";
  if (parse(end) < parse(start)) return "The end date is before the start date.";
  if (parse(start) > parse(isoDay())) return "The start date is in the future.";

  const span = daysBetween(start, end);
  if (span > MAX_SELECTABLE_DAYS)
    return `${span} days selected. The maximum window is ${MAX_SELECTABLE_DAYS} days.`;

  return null;
}

/** Shifts a yyyy-MM-dd date by whole days. */
function addDays(value: string, delta: number): string {
  return new Date(parse(value) + delta * DAY_MS).toISOString().slice(0, 10);
}

/** start + 90 days, never past today. */
function maxEndFor(start: string): string {
  const today = isoDay();
  if (!start || Number.isNaN(parse(start))) return today;
  const limit = new Date(parse(start) + (MAX_SELECTABLE_DAYS - 1) * DAY_MS)
    .toISOString()
    .slice(0, 10);
  return limit < today ? limit : today;
}

function formatLabel(start: string, end: string) {
  const fmt = (iso: string, withYear: boolean) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
}

/**
 * One date range for the whole dashboard, owned by the topbar selector.
 *
 * Preset dates are derived rather than stored, so they cannot drift out of sync
 * with the selection and a session left open overnight rolls forward.
 *
 * A custom range is held as a DRAFT until it validates. The inputs show what is
 * being typed while startDate/endDate keep the last good window, so a half-typed
 * date never fires a request that Meta would reject.
 */
export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [rangeKey, setRangeKeyRaw] = useState<string>(DEFAULT_DATE_RANGE);
  const [grouping, setGrouping] = useState<Grouping>("day");

  const [draftStart, setDraftStart] = useState(isoDay(-29));
  const [draftEnd, setDraftEnd] = useState(isoDay());
  const [applied, setApplied] = useState({
    start: isoDay(-29),
    end: isoDay(),
  });

  const rangeError = useMemo(
    () => (rangeKey === CUSTOM_DATE_RANGE ? validateRange(draftStart, draftEnd) : null),
    [rangeKey, draftStart, draftEnd]
  );

  // Editing the draft fires nothing. Every consumer reads `applied`, so the
  // charts keep their current window until Apply is pressed — typing a date one
  // keystroke at a time would otherwise fire a request per character, most of
  // them for windows the user never meant to ask for.
  const updateStart = useCallback((value: string) => {
    if (!value || Number.isNaN(parse(value))) return;
    setDraftStart(value);

    // Moving the start can strand the end on either side of a usable window.
    setDraftEnd((currentEnd) => {
      const limit = maxEndFor(value);

      // Start pushed past the end: reopen the window at one day after the new
      // start, rather than leaving an inverted range the user has to repair.
      if (currentEnd < value) {
        const next = addDays(value, 1);
        return next > limit ? limit : next;
      }

      // Start pulled back far enough that the old end now breaks the 90-day cap.
      if (currentEnd > limit) return limit;

      return currentEnd;
    });
  }, []);

  /**
   * The native min/max attributes only constrain the calendar UI — a date typed
   * straight into the field ignores them, so the same bounds are enforced here.
   */
  const updateEnd = useCallback(
    (value: string) => {
      if (!value || Number.isNaN(parse(value))) return;

      const limit = maxEndFor(draftStart);
      if (value < draftStart) return setDraftEnd(draftStart);
      if (value > limit) return setDraftEnd(limit);
      setDraftEnd(value);
    },
    [draftStart]
  );

  const canApply =
    validateRange(draftStart, draftEnd) === null &&
    (draftStart !== applied.start || draftEnd !== applied.end);

  const applyDraft = useCallback(() => {
    if (validateRange(draftStart, draftEnd) === null) {
      setApplied({ start: draftStart, end: draftEnd });
    }
  }, [draftStart, draftEnd]);

  const resetDraft = useCallback(() => {
    setDraftStart(applied.start);
    setDraftEnd(applied.end);
  }, [applied]);

  const setRangeKey = useCallback(
    (key: string) => {
      setRangeKeyRaw(key);
      // Entering custom mode starts from the window already on screen, so the
      // charts do not jump before anything has been chosen.
      if (key === CUSTOM_DATE_RANGE) {
        const preset = DATE_RANGES.find((r) => r.value === rangeKey);
        if (preset) {
          const start = isoDay(-(preset.days - 1));
          const end = isoDay();
          setDraftStart(start);
          setDraftEnd(end);
          setApplied({ start, end });
        }
      }
    },
    [rangeKey]
  );

  const value = useMemo<DateRangeContextType>(() => {
    const isCustom = rangeKey === CUSTOM_DATE_RANGE;

    const startDate = isCustom
      ? applied.start
      : isoDay(
          -(
            (DATE_RANGES.find((r) => r.value === rangeKey) ?? DATE_RANGES[1])
              .days - 1
          )
        );
    const endDate = isCustom ? applied.end : isoDay();

    return {
      rangeKey,
      setRangeKey,
      startDate,
      endDate,
      days: daysBetween(startDate, endDate),
      label: isCustom
        ? formatLabel(startDate, endDate)
        : (DATE_RANGES.find((r) => r.value === rangeKey) ?? DATE_RANGES[1]).label,
      isCustom,
      draftStart,
      draftEnd,
      setDraftStart: updateStart,
      setDraftEnd: updateEnd,
      maxEndDate: maxEndFor(draftStart),
      applyDraft,
      resetDraft,
      canApply,
      rangeError,
      grouping,
      setGrouping,
    };
  }, [
    rangeKey,
    setRangeKey,
    applied,
    draftStart,
    draftEnd,
    updateStart,
    updateEnd,
    applyDraft,
    resetDraft,
    canApply,
    rangeError,
    grouping,
  ]);

  return (
    <DateRangeContext.Provider value={value}>
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
