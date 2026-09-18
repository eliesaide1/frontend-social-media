"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type ILogger,
} from "@microsoft/signalr";

/**
 * Live updates from the Facebook Analytics API's SignalR hub.
 *
 * WHY THIS DOES NOT GO THROUGH /api/fb
 * Every other call is proxied through the Next route handler to dodge CORS. A hub
 * connection cannot be: it upgrades to a WebSocket, and a route handler has no way to
 * carry that through. So the browser talks to the API directly and the API's
 * Cors:AllowedOrigins must name this origin. NEXT_PUBLIC_FB_API_URL is therefore the
 * real API base here, not the proxy path.
 *
 * ONE CONNECTION FOR THE WHOLE APP
 * Several widgets on a page each want the same events. Opening a connection per widget
 * would mean several sockets and several copies of every message, so this module owns a
 * single connection and fans out to local listeners. Page subscriptions are reference
 * counted: the hub group is left only when the last interested component unmounts.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_FB_API_URL || "http://fbanalyticsapi.tryasp.net";

export const HUB_URL = `${API_BASE.replace(/\/$/, "")}/hubs/analytics`;

/** Server-sent event names, exactly as AnalyticsHub sends them. */
export type RealtimeEventName =
  | "PostChanged"
  | "EngagementChanged"
  | "CommentChanged"
  | "VideosChanged"
  | "PageInsightsChanged";

export const ALL_REALTIME_EVENTS: RealtimeEventName[] = [
  "PostChanged",
  "EngagementChanged",
  "CommentChanged",
  "VideosChanged",
  "PageInsightsChanged",
];

/** Fields shared by every event. */
export interface RealtimeEventBase {
  pageId: string;
  /** "add" | "edited" | "remove" | "refresh" — what produced the event. */
  verb: string | null;
  occurredAt: string;
}

export interface PostChangedEvent extends RealtimeEventBase {
  postId: string;
  message?: string | null;
  createdTime?: string | null;
  type?: string | null;
  fullPicture?: string | null;
  permalinkUrl?: string | null;
  sharesCount?: number;
}

export interface EngagementChangedEvent extends RealtimeEventBase {
  postId: string;
  likes: number;
  reactionsLike: number;
  reactionsLove: number;
  reactionsWow: number;
  reactionsHaha: number;
  reactionsSad: number;
  reactionsAngry: number;
  reactionsTotal: number;
  commentsCount: number;
  sharesCount: number;
}

export interface CommentChangedEvent extends RealtimeEventBase {
  postId: string;
  commentId: string | null;
  message?: string | null;
  fromName?: string | null;
  createdTime?: string | null;
  commentsCount: number;
}

export interface VideosChangedEvent extends RealtimeEventBase {
  videoId: string | null;
}

export interface PageInsightsChangedEvent extends RealtimeEventBase {
  contentViews: number;
  engagedUsers: number;
  pageViews: number;
  postEngagements: number;
  followersCount: number;
  fanCount: number;
  followersDelta: number | null;
}

export type RealtimeEvent =
  | PostChangedEvent
  | EngagementChangedEvent
  | CommentChangedEvent
  | VideosChangedEvent
  | PageInsightsChangedEvent;

export type RealtimeListener = (event: RealtimeEvent, name: RealtimeEventName) => void;
export type ConnectionListener = (state: HubConnectionState) => void;

let connection: HubConnection | null = null;
let starting: Promise<void> | null = null;

/**
 * SignalR's default logger reports a dropped socket through console.error, which the
 * Next.js dev overlay counts as an application error — every API restart or deploy
 * lit it up. A lost connection is expected and recovered from here (the page falls
 * back to polling meanwhile), so it is reported as a warning instead.
 */
const realtimeLogger: ILogger = {
  log(level, message) {
    if (level >= LogLevel.Warning) console.warn(`[realtime] ${message}`);
  },
};

/**
 * Retry delays after the connection is lost for good.
 *
 * withAutomaticReconnect only covers a connection that was once up, and only for its
 * own short schedule. An API that is down when the page loads, or down for longer
 * than that schedule, would otherwise leave live updates off until a reload.
 */
const RESTART_DELAYS_MS = [5_000, 10_000, 30_000, 60_000];
let restartAttempt = 0;
let restartTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRestart() {
  // Nobody is listening: stay down until a component subscribes again.
  if (restartTimer || pageRefCounts.size === 0) return;

  const delay = RESTART_DELAYS_MS[Math.min(restartAttempt, RESTART_DELAYS_MS.length - 1)];
  restartAttempt++;
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    try {
      await ensureStarted();
      await rejoinAll();
    } catch {
      scheduleRestart();
    }
  }, delay);
}

/** Group membership is per connection id, so a new connection must re-join every page. */
function rejoinAll() {
  return Promise.all([...pageRefCounts.keys()].map((pageId) => invokeSubscribe(pageId)));
}

/** pageId -> how many components currently care about it. */
const pageRefCounts = new Map<string, number>();
const listeners = new Set<RealtimeListener>();
const connectionListeners = new Set<ConnectionListener>();

function notifyConnectionState() {
  const state = connection?.state ?? HubConnectionState.Disconnected;
  connectionListeners.forEach((l) => l(state));
}

function getConnection(): HubConnection {
  if (connection) return connection;

  connection = new HubConnectionBuilder()
    .withUrl(HUB_URL)
    // Reconnect with backoff rather than giving up: a laptop waking from sleep or a
    // redeployed API should recover on its own, not require a page reload.
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(realtimeLogger)
    .build();

  ALL_REALTIME_EVENTS.forEach((name) => {
    connection!.on(name, (payload: RealtimeEvent) => {
      listeners.forEach((l) => {
        try {
          l(payload, name);
        } catch {
          // One bad listener must not stop the others from seeing the event.
        }
      });
    });
  });

  connection.onreconnected(async () => {
    notifyConnectionState();
    // Group membership does not survive a reconnect — the server sees a new
    // connection id — so every page this tab cares about has to be re-joined, or
    // the socket would look healthy while silently delivering nothing.
    await rejoinAll();
  });

  connection.onreconnecting(notifyConnectionState);
  connection.onclose(() => {
    notifyConnectionState();
    // Automatic reconnect has given up; keep trying on a slower schedule.
    scheduleRestart();
  });

  return connection;
}

async function ensureStarted(): Promise<void> {
  const conn = getConnection();
  if (conn.state === HubConnectionState.Connected) return;

  // Collapse concurrent starts: several widgets mounting together must not each
  // call start() on the same connection, which throws.
  if (!starting) {
    starting = conn
      .start()
      .then(() => {
        restartAttempt = 0;
        notifyConnectionState();
      })
      .catch((err) => {
        notifyConnectionState();
        scheduleRestart();
        throw err;
      })
      .finally(() => {
        starting = null;
      });
  }

  return starting;
}

async function invokeSubscribe(pageId: string) {
  try {
    await getConnection().invoke("SubscribeToPage", pageId);
  } catch {
    // Swallowed deliberately: live updates are an enhancement, and the polling
    // fallback in useLiveData still carries the UI if this never succeeds.
  }
}

/**
 * Join a page's event group, and leave it when the returned function is called.
 * Safe to call from several components for the same page.
 */
export async function subscribeToPage(pageId: string): Promise<() => void> {
  if (!pageId) return () => {};

  const next = (pageRefCounts.get(pageId) ?? 0) + 1;
  pageRefCounts.set(pageId, next);

  try {
    await ensureStarted();
    if (next === 1) await invokeSubscribe(pageId);
  } catch {
    // Connection failed; the ref count still stands and scheduleRestart re-joins
    // every counted page once the API is reachable again.
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const remaining = (pageRefCounts.get(pageId) ?? 1) - 1;
    if (remaining > 0) {
      pageRefCounts.set(pageId, remaining);
      return;
    }

    pageRefCounts.delete(pageId);
    if (connection?.state === HubConnectionState.Connected) {
      connection.invoke("UnsubscribeFromPage", pageId).catch(() => {});
    }
  };
}

/** Listen to every realtime event. Returns an unsubscribe function. */
export function onRealtimeEvent(listener: RealtimeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Watch the connection state, for a status indicator. */
export function onConnectionStateChange(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);
  listener(connection?.state ?? HubConnectionState.Disconnected);
  return () => connectionListeners.delete(listener);
}

export function getConnectionState(): HubConnectionState {
  return connection?.state ?? HubConnectionState.Disconnected;
}

export { HubConnectionState };
