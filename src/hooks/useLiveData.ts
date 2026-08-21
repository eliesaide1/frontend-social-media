"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseLiveDataOptions {
  /** Polling interval in milliseconds (default: 15000 = 15s) */
  interval?: number;
  /** Whether live updates are enabled (default: true) */
  enabled?: boolean;
}

interface UseLiveDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Timestamp of the last successful fetch */
  lastUpdated: Date | null;
  /** Whether live polling is currently active */
  isLive: boolean;
  /** Toggle live updates on/off */
  setLive: (live: boolean) => void;
  /** Force an immediate refresh */
  refresh: () => void;
}

/**
 * Generic hook for live-updating data.
 * Fetches data once, then re-fetches at a configurable interval.
 * Only triggers a re-render when the fetched data actually changes
 * (compared by JSON serialization).
 */
export function useLiveData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: UseLiveDataOptions = {}
): UseLiveDataReturn<T> {
  const { interval = 15000, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setLive] = useState(enabled);

  // Keep a ref to the last serialized data to avoid unnecessary re-renders
  const lastJsonRef = useRef<string>("");
  const mountedRef = useRef(true);

  const doFetch = useCallback(
    async (isInitial: boolean) => {
      if (isInitial) setLoading(true);
      try {
        const result = await fetcher();
        if (!mountedRef.current) return;

        const json = JSON.stringify(result);
        // Only update state if data actually changed
        if (json !== lastJsonRef.current) {
          lastJsonRef.current = json;
          setData(result);
        }
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        if (isInitial) {
          setError(err instanceof Error ? err.message : "Fetch failed");
        }
        // On poll errors, keep showing last good data (don't overwrite)
      } finally {
        if (mountedRef.current && isInitial) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true;
    lastJsonRef.current = "";
    doFetch(true);

    let timer: ReturnType<typeof setInterval> | null = null;
    if (isLive) {
      timer = setInterval(() => doFetch(false), interval);
    }

    return () => {
      mountedRef.current = false;
      if (timer) clearInterval(timer);
    };
  }, [doFetch, isLive, interval]);

  const refresh = useCallback(() => doFetch(false), [doFetch]);

  return { data, loading, error, lastUpdated, isLive, setLive, refresh };
}
