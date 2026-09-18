"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import type { RealtimeEventName } from "@/services/realtimeClient";

interface UseLiveDataRealtimeOptions {
  /** Page whose hub events should trigger a refresh. */
  pageId: string | null | undefined;
  /** Which events matter to this widget. Omit for all of them. */
  events?: RealtimeEventName[];
}

interface UseLiveDataOptions {
  /** Polling interval in milliseconds (default: 15000 = 15s) */
  interval?: number;
  /** Whether live updates are enabled (default: true) */
  enabled?: boolean;
  /**
   * Refresh when the API pushes a change for this page, instead of waiting for
   * the next poll.
   */
  realtime?: UseLiveDataRealtimeOptions;
  /**
   * How long to keep polling for once the hub is connected, in milliseconds.
   * Default 300000 (5 minutes). 0 disables polling entirely while connected.
   */
  connectedInterval?: number;
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
  /** True when the SignalR hub is connected and pushing changes. */
  realtimeConnected: boolean;
}

/** Events arriving together are coalesced into one refetch after this long. */
const REALTIME_DEBOUNCE_MS = 1500;

/**
 * Generic hook for live-updating data.
 *
 * POLLING IS NOW THE FALLBACK, NOT THE MECHANISM
 * Every endpoint behind these fetchers calls the Meta Graph API live and takes many
 * seconds. Polling all of them every 15s was already expensive; once the hub is
 * connected it is also redundant, because the API pushes the moment anything changes.
 * So while connected the interval stretches to `connectedInterval` — a slow safety net
 * for the figures that have no webhook at all — and refreshes are driven by events.
 * If the hub drops, the original interval resumes on its own.
 *
 * Only triggers a re-render when the fetched data actually changes (compared by JSON
 * serialization).
 */
export function useLiveData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: UseLiveDataOptions = {}
): UseLiveDataReturn<T> {
  const {
    interval = 15000,
    enabled = true,
    realtime,
    connectedInterval = 300000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  // Which `deps` the initial fetch last completed for. `loading` is derived from
  // it, so a new date range reads as loading at once without setting state
  // inside an effect.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setLive] = useState(enabled);

  // Keep a ref to the last serialized data to avoid unnecessary re-renders
  const lastJsonRef = useRef<string>("");
  const mountedRef = useRef(true);
  // These fetches take seconds. Without a guard, a burst of events would stack
  // overlapping requests against the same slow endpoint.
  const inFlightRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The caller's fetcher is a new function every render; it is read through a ref
  // so that only a change in `deps` starts a new fetch cycle.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // `deps` as a stable key. The callback below is keyed on it, and each fetch
  // remembers the key it started under: a slow response for an old date range
  // must not land on top of the new range's data.
  const depsKey = JSON.stringify(deps);
  const activeKeyRef = useRef(depsKey);
  const loading = loadedKey !== depsKey;

  const doFetch = useCallback(
    async (isInitial: boolean) => {
      if (inFlightRef.current && !isInitial) return;
      inFlightRef.current = true;
      const startedUnder = depsKey;

      try {
        const result = await fetcherRef.current();
        if (!mountedRef.current || activeKeyRef.current !== startedUnder) return;

        const json = JSON.stringify(result);
        // Only update state if data actually changed
        if (json !== lastJsonRef.current) {
          lastJsonRef.current = json;
          setData(result);
        }
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (!mountedRef.current || activeKeyRef.current !== startedUnder) return;
        if (isInitial) {
          setError(err instanceof Error ? err.message : "Fetch failed");
        }
        // On poll errors, keep showing last good data (don't overwrite)
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current && isInitial && activeKeyRef.current === startedUnder)
          setLoadedKey(startedUnder);
      }
    },
    [depsKey]
  );

  // ── realtime ─────────────────────────────────────────────────────────────
  // A single post gaining reactions produces one event per change, and a refresh
  // cycle can emit a burst across many posts. Debouncing turns that into one
  // refetch rather than one per event.
  const scheduleRealtimeRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (mountedRef.current) doFetch(false);
    }, REALTIME_DEBOUNCE_MS);
  }, [doFetch]);

  const { connected: realtimeConnected } = useRealtime({
    pageId: realtime?.pageId,
    events: realtime?.events,
    enabled: Boolean(realtime?.pageId) && isLive,
    onEvent: scheduleRealtimeRefresh,
  });

  // Initial fetch — once per `deps`. Kept apart from polling so that the live
  // connection coming up or dropping only changes the interval; it used to re-run
  // a full load, spinner and all, on every connection change.
  useEffect(() => {
    mountedRef.current = true;
    activeKeyRef.current = depsKey;
    lastJsonRef.current = "";
    doFetch(true);

    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [doFetch, depsKey]);

  // Polling. Connected to the hub: stretch the interval right out, since pushes
  // now do the work. Not connected: poll as before.
  useEffect(() => {
    const effectiveInterval = realtimeConnected ? connectedInterval : interval;
    if (!isLive || effectiveInterval <= 0) return;

    const timer = setInterval(() => doFetch(false), effectiveInterval);
    return () => clearInterval(timer);
  }, [doFetch, isLive, interval, realtimeConnected, connectedInterval]);

  const refresh = useCallback(() => doFetch(false), [doFetch]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    isLive,
    setLive,
    refresh,
    realtimeConnected,
  };
}
