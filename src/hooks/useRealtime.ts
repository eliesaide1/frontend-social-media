"use client";

import { useEffect, useRef, useState } from "react";
import {
  HubConnectionState,
  onConnectionStateChange,
  onRealtimeEvent,
  subscribeToPage,
  type RealtimeEvent,
  type RealtimeEventName,
} from "@/services/realtimeClient";

interface UseRealtimeOptions {
  /** The page whose events to receive. Nothing is subscribed while this is empty. */
  pageId: string | null | undefined;
  /** Which events to react to. Omit for all of them. */
  events?: RealtimeEventName[];
  /** Called for each matching event. */
  onEvent?: (event: RealtimeEvent, name: RealtimeEventName) => void;
  enabled?: boolean;
}

interface UseRealtimeReturn {
  /** True once the hub connection is established. */
  connected: boolean;
  state: HubConnectionState;
  /** The most recent matching event, handy for a "just updated" flash. */
  lastEvent: { event: RealtimeEvent; name: RealtimeEventName } | null;
}

/**
 * Subscribes to a page's live events for the lifetime of the component.
 *
 * onEvent is held in a ref rather than listed as an effect dependency. Callers
 * naturally pass an inline arrow function, which is a new value on every render; as a
 * dependency it would tear down and rebuild the subscription on each one, and the hub
 * group would be left and re-joined constantly.
 */
export function useRealtime({
  pageId,
  events,
  onEvent,
  enabled = true,
}: UseRealtimeOptions): UseRealtimeReturn {
  const [state, setState] = useState<HubConnectionState>(
    HubConnectionState.Disconnected
  );
  const [lastEvent, setLastEvent] =
    useState<UseRealtimeReturn["lastEvent"]>(null);

  const onEventRef = useRef(onEvent);
  // Assigned in an effect, not during render: writing to a ref while rendering is
  // unsafe under concurrent rendering, since a render can be discarded or replayed.
  // No dependency array — this must track the latest callback on every render.
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const eventsKey = events ? events.join(",") : "";

  useEffect(() => onConnectionStateChange(setState), []);

  useEffect(() => {
    if (!enabled || !pageId) return;

    let unsubscribePage: (() => void) | null = null;
    let cancelled = false;

    subscribeToPage(pageId).then((release) => {
      // The component may already have unmounted while the connection was being
      // established; releasing immediately keeps the ref count honest.
      if (cancelled) release();
      else unsubscribePage = release;
    });

    const allowed = eventsKey ? new Set(eventsKey.split(",")) : null;

    const unsubscribeEvents = onRealtimeEvent((event, name) => {
      if (event.pageId !== pageId) return;
      if (allowed && !allowed.has(name)) return;

      setLastEvent({ event, name });
      onEventRef.current?.(event, name);
    });

    return () => {
      cancelled = true;
      unsubscribeEvents();
      unsubscribePage?.();
    };
  }, [pageId, eventsKey, enabled]);

  return {
    connected: state === HubConnectionState.Connected,
    state,
    lastEvent,
  };
}
