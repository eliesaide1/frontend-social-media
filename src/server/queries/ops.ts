import "server-only";

import { p, query, type QueryParam } from "@/lib/db";
import { listAccounts, listPages, resolveAccountId } from "@/lib/tenancy";

/**
 * Operational reads for the settings page: what is linked, whether ingestion is
 * advancing, and what the service has been saying to Meta.
 *
 * ops.meta_api_calls is the interesting one. It is the service's own log of every
 * Graph request — status, duration, error — and nothing in the API exposes it, so
 * until now the only way to see why a metric was empty was to read server logs. It
 * answers "is this zero because Meta refused us?" directly.
 */

export { listAccounts, listPages, resolveAccountId };

export interface CheckpointRow {
  pageId: string;
  pageName: string | null;
  jobType: string;
  status: string | null;
  lastWatermarkAt: string | null;
  updatedAt: string | null;
  lastError: string | null;
  attemptCount: number;
  /** Nothing for over 48h — the same threshold the API's status endpoint uses. */
  isStale: boolean;
}

export async function getCheckpoints(
  accountId?: string | null
): Promise<CheckpointRow[]> {
  const account = await resolveAccountId(accountId);

  const rows = await query<{
    page_id: string;
    page_name: string | null;
    job_type: string;
    status: string | null;
    last_watermark_at: Date | null;
    updated_at: Date | null;
    last_error: string | null;
    attempt_count: number | null;
  }>(
    `
    SELECT p.page_id, p.[name] AS page_name, c.job_type, c.[status],
           c.last_watermark_at, c.updated_at, c.last_error, c.attempt_count
    FROM ops.ingestion_checkpoints AS c
    JOIN meta.pages AS p ON p.page_ref_id = c.page_ref_id
    WHERE p.account_id = @accountId
    ORDER BY c.updated_at DESC;
    `,
    [p.uuid("accountId", account)],
    { label: "ops.checkpoints" }
  );

  const staleBefore = Date.now() - 48 * 60 * 60 * 1000;

  return rows.map((r) => ({
    pageId: r.page_id,
    pageName: r.page_name,
    jobType: r.job_type,
    status: r.status,
    lastWatermarkAt: r.last_watermark_at ? r.last_watermark_at.toISOString() : null,
    updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
    lastError: r.last_error,
    attemptCount: r.attempt_count ?? 0,
    isStale: r.updated_at ? r.updated_at.getTime() < staleBefore : true,
  }));
}

export interface ApiCallRow {
  calledAt: string | null;
  pageId: string | null;
  jobStep: string | null;
  httpMethod: string | null;
  requestUrl: string | null;
  statusCode: number | null;
  success: boolean;
  durationMs: number | null;
  errorMessage: string | null;
  recordsReturned: number | null;
}

/** Recent Graph calls, newest first. Failures only when `failedOnly`. */
export async function getApiCalls(
  limit = 100,
  failedOnly = false,
  accountId?: string | null
): Promise<ApiCallRow[]> {
  const capped = Math.min(Math.max(limit, 1), 500);
  const account = await resolveAccountId(accountId);

  // Scoped by account OR by one of that account's pages.
  //
  // The column exists but ApiCallLogger does not populate it — every row in the
  // live database has account_id NULL — so scoping on it alone returns an empty
  // log, which looks like "nothing ever called Meta" rather than "this is not
  // attributed". Falling back to page_id keeps the view useful today and starts
  // working on account_id the moment the logger fills it in.
  //
  // Rows with NEITHER set are account-level calls such as /me/accounts. They are
  // excluded rather than shown to everyone; getApiCallSummary counts them so the
  // omission is visible instead of silent.
  const scope = `(account_id = @accountId
                  OR page_id IN (SELECT page_id FROM meta.pages WHERE account_id = @accountId))`;
  const where = failedOnly
    ? `WHERE ${scope} AND success = 0`
    : `WHERE ${scope}`;

  const rows = await query<{
    called_at: Date | null;
    page_id: string | null;
    job_step: string | null;
    http_method: string | null;
    request_url: string | null;
    http_status: number | null;
    success: boolean | null;
    duration_ms: number | null;
    error_message: string | null;
    records_returned: number | null;
  }>(
    `
    SELECT TOP (@limit)
      called_at, page_id, job_step, http_method, request_url,
      http_status, success, duration_ms, error_message, records_returned
    FROM ops.meta_api_calls
    ${where}
    ORDER BY called_at DESC;
    `,
    [p.int("limit", capped), p.uuid("accountId", account)],
    { label: "ops.apiCalls" }
  );

  return rows.map((r) => ({
    calledAt: r.called_at ? r.called_at.toISOString() : null,
    pageId: r.page_id,
    jobStep: r.job_step,
    httpMethod: r.http_method,
    // Access tokens ride in the query string of Graph URLs. The log stores them
    // masked, but a second pass here means a logging change upstream cannot
    // quietly start sending credentials to a browser.
    requestUrl: r.request_url ? maskToken(r.request_url) : null,
    statusCode: r.http_status,
    success: Boolean(r.success),
    durationMs: r.duration_ms,
    errorMessage: r.error_message,
    recordsReturned: r.records_returned,
  }));
}

function maskToken(url: string): string {
  return url.replace(/(access_token=)[^&]*/gi, "$1***");
}

export interface ApiCallSummary {
  total: number;
  failed: number;
  last24h: number;
  failed24h: number;
  avgDurationMs: number | null;
  lastCallAt: string | null;
  /**
   * Calls the logger attributed to neither an account nor a page, so they cannot be
   * shown in a scoped list. Surfaced so "the log looks short" has an explanation.
   */
  unattributed: number;
}

export async function getApiCallSummary(
  accountId?: string | null
): Promise<ApiCallSummary> {
  const account = await resolveAccountId(accountId);
  const rows = await query<{
    total: number;
    failed: number;
    last24h: number;
    failed24h: number;
    avg_ms: number | null;
    last_call: Date | null;
    unattributed: number;
  }>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN called_at >= DATEADD(HOUR,-24,SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS last24h,
      SUM(CASE WHEN success = 0 AND called_at >= DATEADD(HOUR,-24,SYSUTCDATETIME())
               THEN 1 ELSE 0 END) AS failed24h,
      AVG(CAST(duration_ms AS FLOAT)) AS avg_ms,
      MAX(called_at) AS last_call,
      SUM(CASE WHEN account_id IS NULL AND page_id IS NULL THEN 1 ELSE 0 END) AS unattributed
    FROM ops.meta_api_calls
    WHERE account_id = @accountId
       OR page_id IN (SELECT page_id FROM meta.pages WHERE account_id = @accountId)
       OR (account_id IS NULL AND page_id IS NULL);
  `,
    [p.uuid("accountId", account)],
    { label: "ops.apiCallSummary" }
  );

  const r = rows[0];
  return {
    total: r?.total ?? 0,
    failed: r?.failed ?? 0,
    last24h: r?.last24h ?? 0,
    failed24h: r?.failed24h ?? 0,
    avgDurationMs: r?.avg_ms == null ? null : Math.round(r.avg_ms),
    lastCallAt: r?.last_call ? r.last_call.toISOString() : null,
    unattributed: r?.unattributed ?? 0,
  };
}

export interface WarehouseCounts {
  posts: number;
  postMetrics: number;
  comments: number;
  videos: number;
  photos: number;
  pageDailyMetrics: number;
  newestPost: string | null;
  newestMetric: string | null;
}

/** Row counts for this account's pages — "is there actually data in here?". */
export async function getWarehouseCounts(
  accountId?: string | null
): Promise<WarehouseCounts> {
  const account = await resolveAccountId(accountId);
  const param: QueryParam[] = [p.uuid("accountId", account)];

  const rows = await query<{
    posts: number;
    post_metrics: number;
    comments: number;
    videos: number;
    photos: number;
    page_daily: number;
    newest_post: Date | null;
    newest_metric: Date | null;
  }>(
    `
    WITH pages AS (
      SELECT page_ref_id FROM meta.pages WHERE account_id = @accountId
    )
    SELECT
      (SELECT COUNT(*) FROM analytics.posts         WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS posts,
      (SELECT COUNT(*) FROM analytics.post_metrics  WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS post_metrics,
      (SELECT COUNT(*) FROM analytics.post_comments WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS comments,
      (SELECT COUNT(*) FROM analytics.page_videos   WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS videos,
      (SELECT COUNT(*) FROM analytics.page_photos   WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS photos,
      (SELECT COUNT(*) FROM analytics.page_daily_metrics WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS page_daily,
      (SELECT MAX(created_time) FROM analytics.posts WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS newest_post,
      (SELECT MAX(metric_date)  FROM analytics.page_daily_metrics WHERE page_ref_id IN (SELECT page_ref_id FROM pages)) AS newest_metric;
    `,
    param,
    { label: "ops.warehouseCounts" }
  );

  const r = rows[0];
  return {
    posts: r?.posts ?? 0,
    postMetrics: r?.post_metrics ?? 0,
    comments: r?.comments ?? 0,
    videos: r?.videos ?? 0,
    photos: r?.photos ?? 0,
    pageDailyMetrics: r?.page_daily ?? 0,
    newestPost: r?.newest_post ? r.newest_post.toISOString() : null,
    newestMetric: r?.newest_metric
      ? r.newest_metric.toISOString().slice(0, 10)
      : null,
  };
}
