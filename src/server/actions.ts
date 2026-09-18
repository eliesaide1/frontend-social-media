"use server";

/**
 * The client-callable surface over direct SQL.
 *
 * Every page in this app is a client component — they use hooks, date-range context
 * and the SignalR connection — so they cannot import src/lib/db.ts, which is
 * `server-only`. Server Actions bridge that: the client calls what looks like an
 * async function, Next runs it on the server, and the database stays there.
 *
 * READS ONLY, and that is enforced two layers down in src/lib/db.ts. Writes belong to
 * the .NET API, which owns the page tokens and calls Meta; a write applied straight to
 * SQL would change the dashboard's copy while Facebook itself knew nothing about it.
 * Publishing, moderation and account linking are therefore still fbApiClient calls.
 *
 * These signatures are deliberately plain (strings, numbers, plain objects): Server
 * Action arguments and return values cross a serialisation boundary, so a Date or a
 * class instance would not survive the trip intact.
 */

import {
  getPageComments as _getPageComments,
  getCommentSummary as _getCommentSummary,
  type CommentFilters,
  type CommentRow,
  type CommentSummary,
} from "@/server/queries/comments";

import {
  getContentPosts as _getContentPosts,
  getContentSummary as _getContentSummary,
  getPageMedia as _getPageMedia,
  type ContentPost,
  type ContentSummary,
  type MediaItem,
  type PostFilters,
} from "@/server/queries/posts";

import {
  getPageAdBreakEarnings as _adBreak,
  getPageCtaClicks as _cta,
  getPageDailyMetrics as _daily,
  getPageReactionsDaily as _reactions,
  getPageSnapshot as _snapshot,
  getPageStoryMetrics as _story,
  getPageVideoMetrics as _videoMetrics,
  getPageViewsBreakdown as _viewsBreakdown,
  getTopPosts as _topPosts,
  type MetricSeries,
  type PageSnapshot,
  type TopPost,
} from "@/server/queries/analytics";

import {
  getApiCalls as _apiCalls,
  getApiCallSummary as _apiCallSummary,
  getCheckpoints as _checkpoints,
  getWarehouseCounts as _warehouseCounts,
  listAccounts as _listAccounts,
  listPages as _listPages,
  resolveAccountId as _resolveAccountId,
  type ApiCallRow,
  type ApiCallSummary,
  type CheckpointRow,
  type WarehouseCounts,
} from "@/server/queries/ops";

export type {
  ApiCallRow,
  ApiCallSummary,
  CheckpointRow,
  CommentFilters,
  CommentRow,
  CommentSummary,
  ContentPost,
  ContentSummary,
  MediaItem,
  MetricSeries,
  PageSnapshot,
  PostFilters,
  TopPost,
  WarehouseCounts,
};

export interface AccountOption {
  accountId: string;
  label: string;
  status: string;
  expiresAt: string | null;
}

export interface PageOption {
  pageId: string;
  name: string | null;
}

/** A SQL failure must read as a failure, not as an empty dashboard. */
function rethrow(context: string, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`${context}: ${message}`);
}

// ── comments ────────────────────────────────────────────────────────────────

export async function fetchComments(
  pageId: string,
  accountId: string | null,
  filters: CommentFilters = {}
): Promise<CommentRow[]> {
  try {
    return await _getPageComments(pageId, accountId, filters);
  } catch (err) {
    rethrow("Could not read comments", err);
  }
}

export async function fetchCommentSummary(
  pageId: string,
  accountId: string | null
): Promise<CommentSummary> {
  try {
    return await _getCommentSummary(pageId, accountId);
  } catch (err) {
    rethrow("Could not read the comment summary", err);
  }
}

// ── content and calendar ────────────────────────────────────────────────────

export async function fetchContentPosts(
  pageId: string,
  accountId: string | null,
  filters: PostFilters = {}
): Promise<ContentPost[]> {
  try {
    return await _getContentPosts(pageId, accountId, filters);
  } catch (err) {
    rethrow("Could not read posts", err);
  }
}

export async function fetchContentSummary(
  pageId: string,
  accountId: string | null
): Promise<ContentSummary> {
  try {
    return await _getContentSummary(pageId, accountId);
  } catch (err) {
    rethrow("Could not read the content summary", err);
  }
}

export async function fetchPageMedia(
  pageId: string,
  accountId: string | null,
  kind: "video" | "photo",
  limit = 200
): Promise<MediaItem[]> {
  try {
    return await _getPageMedia(pageId, accountId, kind, limit);
  } catch (err) {
    rethrow(`Could not read ${kind}s`, err);
  }
}

// ── page analytics ──────────────────────────────────────────────────────────

export interface RangeInput {
  pageId: string;
  accountId: string | null;
  from?: string | null;
  to?: string | null;
}

export async function fetchPageSnapshot(
  pageId: string,
  accountId: string | null
): Promise<PageSnapshot | null> {
  try {
    return await _snapshot(pageId, accountId);
  } catch (err) {
    rethrow("Could not read the page snapshot", err);
  }
}

export async function fetchPageDailyMetrics(a: RangeInput): Promise<MetricSeries> {
  try {
    return await _daily(a);
  } catch (err) {
    rethrow("Could not read daily page metrics", err);
  }
}

export async function fetchPageReactionsDaily(a: RangeInput): Promise<MetricSeries> {
  try {
    return await _reactions(a);
  } catch (err) {
    rethrow("Could not read daily reactions", err);
  }
}

export async function fetchPageStoryMetrics(a: RangeInput): Promise<MetricSeries> {
  try {
    return await _story(a);
  } catch (err) {
    rethrow("Could not read story metrics", err);
  }
}

export async function fetchPageVideoMetrics(a: RangeInput): Promise<MetricSeries> {
  try {
    return await _videoMetrics(a);
  } catch (err) {
    rethrow("Could not read video metrics", err);
  }
}

export async function fetchPageViewsBreakdown(a: RangeInput): Promise<MetricSeries> {
  try {
    return await _viewsBreakdown(a);
  } catch (err) {
    rethrow("Could not read the page-views breakdown", err);
  }
}

export async function fetchPageCtaClicks(a: RangeInput): Promise<MetricSeries> {
  try {
    return await _cta(a);
  } catch (err) {
    rethrow("Could not read CTA clicks", err);
  }
}

export async function fetchPageAdBreakEarnings(a: RangeInput): Promise<MetricSeries> {
  try {
    return await _adBreak(a);
  } catch (err) {
    rethrow("Could not read ad-break earnings", err);
  }
}

export async function fetchTopPosts(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null,
  limit = 10
): Promise<TopPost[]> {
  try {
    return await _topPosts(pageId, accountId, from, to, limit);
  } catch (err) {
    rethrow("Could not read top posts", err);
  }
}

// ── operations ──────────────────────────────────────────────────────────────

export async function fetchAccounts(): Promise<AccountOption[]> {
  try {
    const rows = await _listAccounts();
    return rows.map((a) => ({
      accountId: a.accountId,
      label: a.label,
      status: a.status,
      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
    }));
  } catch (err) {
    rethrow("Could not read linked accounts", err);
  }
}

export async function fetchPages(accountId: string | null): Promise<PageOption[]> {
  try {
    const resolved = await _resolveAccountId(accountId);
    return await _listPages(resolved);
  } catch (err) {
    rethrow("Could not read pages", err);
  }
}

export async function fetchCheckpoints(
  accountId: string | null
): Promise<CheckpointRow[]> {
  try {
    return await _checkpoints(accountId);
  } catch (err) {
    rethrow("Could not read ingestion checkpoints", err);
  }
}

export async function fetchApiCalls(
  accountId: string | null,
  limit = 100,
  failedOnly = false
): Promise<ApiCallRow[]> {
  try {
    return await _apiCalls(limit, failedOnly, accountId);
  } catch (err) {
    rethrow("Could not read the Meta API call log", err);
  }
}

export async function fetchApiCallSummary(
  accountId: string | null
): Promise<ApiCallSummary> {
  try {
    return await _apiCallSummary(accountId);
  } catch (err) {
    rethrow("Could not read the API call summary", err);
  }
}

export async function fetchWarehouseCounts(
  accountId: string | null
): Promise<WarehouseCounts> {
  try {
    return await _warehouseCounts(accountId);
  } catch (err) {
    rethrow("Could not read warehouse counts", err);
  }
}
