import { fbApiClient } from "./apiClient";
import { MAX_RANGE_DAYS } from "@/lib/constants";
import { TimeSeriesResponse, MetricSeries } from "@/types/api";
import {
  // Accounts & Auth
  AuthStatus,
  TokenLinkResult,
  MetaAccountDto,
  LinkAccountResultDto,
  UnlinkAccountResultDto,
  // Business & Pages
  BusinessDto,
  BusinessWithPagesDto,
  // Page Analytics
  PageInsightsDto,
  PageFollowersDto,
  PostDto,
  PageVideoDto,
  PagePhotoDto,
  // Page Metrics
  PageVideoMetricsDto,
  PageReactionsDailyDto,
  PageStoryMetricsDto,
  // Extended Metrics
  PageFanChurnDto,
  PageCtaClicksDto,
  PageViewsBreakdownDto,
  PageAdBreakEarningsDto,
  // Post Analytics
  PostInsightsDto,
  PostCommentDto,
  PostLikesDto,
  PostReactionsDto,
  PostAttachmentDto,
  PostEngagementDto,
  PostVideoMetricsDto,
  // Comments
  CommentResultDto,
  PostCommentRequest,
  ReplyToCommentRequest,
  HideCommentRequest,
  // Publishing
  PublishResultDto,
  PublishTextPostRequest,
  PublishPhotoRequest,
  PublishVideoRequest,
  PublishReelRequest,
  UpdatePostRequest,
  ReschedulePostRequest,
  ScheduledPostDto,
  DeleteResultDto,
  ReelStatusDto,
  // Warehouse
  StoredPostDto,
  PostMetricPointDto,
  PageMetricPointDto,
  StoredMediaDto,
  // Operations
  HealthDto,
  IngestionRunResultDto,
  IngestionStatusDto,
  CacheStatusDto,
  WebhookSubscriptionResult,
} from "@/types/facebook";

const BASE = "/api/FacebookAnalytics";

/** Re-exported so callers can type the ranged form without importing @/types/api. */
export type MetricSeriesOf<T> = MetricSeries<T>;

// ─── Helpers ─────────────────────────────────────────────────

// Single source of truth, shared with the date-range picker so the UI and the
// request guard cannot disagree about the limit.
export { MAX_RANGE_DAYS } from "@/lib/constants";

const DAY_MS = 86_400_000;

function toUtcDate(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

/**
 * Meta returns at most ~93 days per insights request and rejects anything
 * longer. Catching it here turns a 400 round trip into an immediate, readable
 * failure — and points at splitDateRange as the fix.
 */
function assertValidRange(startDate: string, endDate: string) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error(
      `Invalid date range: startDate and endDate must be yyyy-MM-dd (got "${startDate}" – "${endDate}").`
    );
  }
  if (end < start) {
    throw new Error(
      `Invalid date range: endDate (${endDate}) is earlier than startDate (${startDate}).`
    );
  }
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  if (start > todayUtc) {
    throw new Error(`Invalid date range: startDate (${startDate}) is in the future.`);
  }

  const days = Math.round((end - start) / DAY_MS);
  if (days > MAX_RANGE_DAYS) {
    throw new Error(
      `Invalid date range: ${days} days requested. Meta returns at most ${MAX_RANGE_DAYS} days per insights request — split the query with splitDateRange().`
    );
  }
}

/**
 * Split a window into <=93-day chunks so a longer range can be fetched as
 * several calls and merged client-side.
 */
export function splitDateRange(
  startDate: string,
  endDate: string,
  chunkDays = MAX_RANGE_DAYS
): { startDate: string; endDate: string }[] {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];

  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const chunks: { startDate: string; endDate: string }[] = [];

  for (let cursor = start; cursor <= end; cursor += (chunkDays + 1) * DAY_MS) {
    const chunkEnd = Math.min(cursor + chunkDays * DAY_MS, end);
    chunks.push({ startDate: iso(cursor), endDate: iso(chunkEnd) });
  }
  return chunks;
}

/** Build a query string, URL-encoding every value. */
function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

/**
 * A metric endpoint that answers with a flat DTO, or with a daily time series
 * when a date range is supplied. Both dates are required for the ranged form —
 * sending only one gets the flat shape back.
 */
function rangedMetric<T>(path: string) {
  function call(pageId: string): Promise<T>;
  function call(
    pageId: string,
    startDate: string,
    endDate: string
  ): Promise<MetricSeries<T>>;
  function call(
    pageId: string,
    startDate?: string,
    endDate?: string
  ): Promise<T | MetricSeries<T>>;
  function call(
    pageId: string,
    startDate?: string,
    endDate?: string
  ): Promise<T | MetricSeries<T>> {
    // The server switches on either date being present, so sending only one
    // returns a series built from an unvalidated half-range. Send both or none.
    if (startDate || endDate) {
      if (!startDate || !endDate) {
        throw new Error(
          `${path}: startDate and endDate must be supplied together.`
        );
      }
      assertValidRange(startDate, endDate);
      return fbApiClient.get<MetricSeries<T>>(
        `${BASE}/${path}${qs({ pageId, startDate, endDate })}`
      );
    }
    return fbApiClient.get<T>(`${BASE}/${path}${qs({ pageId })}`);
  }
  return call;
}

// ─── Accounts ────────────────────────────────────────────────
//
// Not account-scoped — the middleware skips /api/accounts, so these work
// before anything is linked.

/** Every linked Meta account. */
export function listAccounts() {
  return fbApiClient.get<MetaAccountDto[]>("/api/accounts");
}

export function getAccount(accountId: string) {
  return fbApiClient.get<MetaAccountDto>(
    `/api/accounts/${encodeURIComponent(accountId)}`
  );
}

/**
 * Links a Meta account. The token is verified against Meta first, then
 * encrypted at rest — a bad one fails here rather than hours later inside a
 * background cycle. Check `warning`: a valid token reaching no Pages links
 * successfully but produces no data.
 */
export function linkAccount(label: string, accessToken: string) {
  return fbApiClient.post<LinkAccountResultDto>("/api/accounts", {
    label,
    accessToken,
  });
}

/** Re-checks the stored token against Meta and updates status and expiry. */
export function validateAccount(accountId: string) {
  return fbApiClient.post<LinkAccountResultDto>(
    `/api/accounts/${encodeURIComponent(accountId)}/validate`
  );
}

/**
 * Unlinks an account. This CASCADES — the account's pages and every analytics
 * row beneath them are deleted. Only the audit history survives.
 */
export function unlinkAccount(accountId: string) {
  return fbApiClient.delete<UnlinkAccountResultDto>(
    `/api/accounts/${encodeURIComponent(accountId)}`
  );
}

/** Scope every subsequent API call to this account (X-Account-Id). */
export function setActiveAccount(accountId: string | null) {
  fbApiClient.setAccountId(accountId);
}

// ─── Auth ────────────────────────────────────────────────────

/**
 * Status of every linked account. Always 200 — check `has_account` before
 * trusting an empty page list.
 *
 * GET /auth/facebook/token no longer exists: tokens are encrypted per account
 * and never leave the database.
 */
export function getAuthStatus() {
  return fbApiClient.get<AuthStatus>("/auth/facebook/status");
}

/**
 * Absolute URL of the OAuth dialog. Must be opened in a real browser — a fetch
 * would follow the 302 and land on Facebook's HTML login page.
 */
export function getLoginUrl() {
  const base =
    process.env.NEXT_PUBLIC_FB_API_URL || "http://fbanalyticsapi.tryasp.net";
  return `${base}/auth/facebook/login`;
}

/**
 * Upgrades a SHORT-LIVED user token to a long-lived one and links it as an
 * account. Note the snake_case key — the DTO carries
 * [JsonPropertyName("access_token")]; sending accessToken binds to null.
 *
 * An already-long-lived token (a system user token) cannot be exchanged and is
 * rejected with 400 — link those with linkAccount instead.
 */
export function exchangeToken(accessToken: string) {
  return fbApiClient.post<TokenLinkResult>("/auth/facebook/exchange-token", {
    access_token: accessToken,
  });
}

// ─── Businesses & Pages ──────────────────────────────────────

/** Live proxy for /me/businesses. An empty array genuinely means "none". */
export function getBusinesses() {
  return fbApiClient.get<BusinessDto[]>(`${BASE}/businesses`);
}

/**
 * Reads SQL Server directly, so it works even with an expired user token.
 * This is the correct call to populate a page selector.
 */
export function getBusinessesWithPages() {
  return fbApiClient.get<BusinessWithPagesDto[]>(
    `${BASE}/businesses-with-pages`
  );
}

/** Discovery + persistence. Slow — run once before the page-level endpoints. */
export function syncBusinesses() {
  return fbApiClient.post<{ message: string }>(
    `${BASE}/sync-businesses-as-pages`
  );
}

export function subscribeWebhooks() {
  return fbApiClient.post<WebhookSubscriptionResult>(
    `${BASE}/subscribe-webhooks`
  );
}

// ─── Page Analytics ──────────────────────────────────────────

/**
 * Day-period page metrics. Pass both dates for a daily series — without them
 * Meta returns only its default two-day window.
 */
export const getPageInsights = rangedMetric<PageInsightsDto>("insights");

/**
 * The flat (un-ranged) form of insights, with the option to bypass the cache.
 * The ranged form always reads live, so refresh does not apply there.
 */
export function getPageInsightsFresh(pageId: string) {
  return fbApiClient.get<PageInsightsDto>(
    `${BASE}/insights${qs({ pageId, refresh: true })}`
  );
}

/** Current snapshot, not a time series. Use getPageMetricsHistory for trends. */
export function getPageFollowers(pageId: string, refresh = false) {
  return fbApiClient.get<PageFollowersDto>(
    `${BASE}/followers${qs({ pageId, refresh: refresh || undefined })}`
  );
}

/** Follows every cursor to completion — slow and large on an active page. */
export function getPagePosts(pageId: string, refresh = false) {
  return fbApiClient.get<PostDto[]>(
    `${BASE}/posts${qs({ pageId, refresh: refresh || undefined })}`
  );
}

/** The whole timeline, including posts by other people. First page only. */
export function getPageFeed(pageId: string, refresh = false) {
  return fbApiClient.get<PostDto[]>(
    `${BASE}/feed${qs({ pageId, refresh: refresh || undefined })}`
  );
}

/** Page-published content only. First page only, no cursor following. */
export function getPublishedPosts(pageId: string, refresh = false) {
  return fbApiClient.get<PostDto[]>(
    `${BASE}/published-posts${qs({ pageId, refresh: refresh || undefined })}`
  );
}

export function getPageVideos(pageId: string, refresh = false) {
  return fbApiClient.get<PageVideoDto[]>(
    `${BASE}/videos${qs({ pageId, refresh: refresh || undefined })}`
  );
}

/** Follows every cursor — can be very slow on photo-heavy pages. */
export function getPagePhotos(pageId: string, refresh = false) {
  return fbApiClient.get<PagePhotoDto[]>(
    `${BASE}/photos${qs({ pageId, refresh: refresh || undefined })}`
  );
}

// ─── Page Metrics ────────────────────────────────────────────

export const getPageVideoMetrics =
  rangedMetric<PageVideoMetricsDto>("page-video-metrics");

export const getPageReactionsDaily = rangedMetric<PageReactionsDailyDto>(
  "page-reactions-daily"
);

// page-demographics, page-like-sources and page-negative-feedback have no
// route: every metric behind them (page_fans_gender_age / _city / _country,
// page_fans_by_like_source, page_negative_feedback) was removed by Meta, so
// the endpoints were deleted rather than left returning 502. Their daily
// history is still written to SQL Server and reachable only by querying it.

/** Daily story generation, broken down by action type. */
export function getPageStoryMetrics(pageId: string) {
  return fbApiClient.get<PageStoryMetricsDto>(
    `${BASE}/page-story-metrics${qs({ pageId })}`
  );
}

// ─── Extended Metrics ────────────────────────────────────────

/** Follower gains and losses. Now measures follows, not Page likes. */
export const getPageFanChurn = rangedMetric<PageFanChurnDto>("page-fan-churn");

export const getPageCtaClicks =
  rangedMetric<PageCtaClicksDto>("page-cta-clicks");

/**
 * page_views_total is a daily metric — without a range you get one day's
 * views, not a running total.
 */
export const getPageViewsBreakdown = rangedMetric<PageViewsBreakdownDto>(
  "page-views-breakdown"
);

/** Requires the System User to hold the Page admin role; 502 otherwise. */
export function getPageAdBreakEarnings(pageId: string) {
  return fbApiClient.get<PageAdBreakEarningsDto>(
    `${BASE}/page-ad-break-earnings${qs({ pageId })}`
  );
}

// ─── Post Analytics ──────────────────────────────────────────
//
// postId must be in {pageId}_{postId} form. The read endpoints do not validate
// it — a malformed id surfaces as a confusing 502 about tokens, not a 400.

/**
 * Three fields are always 0 and engagedUsers is really the reaction sum.
 * Use getPostEngagement for real numbers.
 */
export function getPostInsights(postId: string, refresh = false) {
  return fbApiClient.get<PostInsightsDto>(
    `${BASE}/post-insights${qs({ postId, refresh: refresh || undefined })}`
  );
}

/** First page only — capped at 25. Treat the length as "at least N". */
export function getPostComments(postId: string, refresh = false) {
  return fbApiClient.get<PostCommentDto[]>(
    `${BASE}/post-comments${qs({ postId, refresh: refresh || undefined })}`
  );
}

export function getPostLikes(postId: string, refresh = false) {
  return fbApiClient.get<PostLikesDto>(
    `${BASE}/post-likes${qs({ postId, refresh: refresh || undefined })}`
  );
}

/**
 * Six sequential Graph calls — the most rate-limit-expensive endpoint here.
 * Cache it; never poll it.
 */
export function getPostReactions(postId: string, refresh = false) {
  return fbApiClient.get<PostReactionsDto>(
    `${BASE}/post-reactions${qs({ postId, refresh: refresh || undefined })}`
  );
}

export function getPostAttachments(postId: string) {
  return fbApiClient.get<PostAttachmentDto[]>(
    `${BASE}/post-attachments${qs({ postId })}`
  );
}

/** The real engagement and click data, unlike post-insights. */
export function getPostEngagement(postId: string) {
  return fbApiClient.get<PostEngagementDto>(
    `${BASE}/post-engagement${qs({ postId })}`
  );
}

export function getPostVideoMetrics(postId: string) {
  return fbApiClient.get<PostVideoMetricsDto>(
    `${BASE}/post-video-metrics${qs({ postId })}`
  );
}

// ─── Comments Management ─────────────────────────────────────
// Requires pages_manage_engagement — a different scope from publishing.

export function postComment(payload: PostCommentRequest) {
  return fbApiClient.post<CommentResultDto>(`${BASE}/post-comment`, {
    ...payload,
  });
}

export function replyToComment(payload: ReplyToCommentRequest) {
  return fbApiClient.post<CommentResultDto>(`${BASE}/reply-to-comment`, {
    ...payload,
  });
}

/**
 * Prefer hiding to deleting — a hidden comment stays visible to its author,
 * so they are not alerted that it was moderated.
 */
export function hideComment(payload: HideCommentRequest) {
  return fbApiClient.post<CommentResultDto>(`${BASE}/hide-comment`, {
    ...payload,
  });
}

/** Permanent and not reversible. Consider hideComment instead. */
export function deleteComment(commentId: string) {
  return fbApiClient.delete<CommentResultDto>(
    `${BASE}/delete-comment${qs({ commentId })}`
  );
}

// ─── Publishing ──────────────────────────────────────────────
// All of these write to a live Page. Requires pages_manage_posts.
// Publishes are never retried — if one fails on the network, check the Page
// before re-sending.

/**
 * At least one of message / link is required. Setting scheduledPublishTimeUtc
 * forces published to false.
 */
export function publishTextPost(payload: PublishTextPostRequest) {
  return fbApiClient.post<PublishResultDto>(`${BASE}/publish-post`, {
    ...payload,
  });
}

/** photoUrl must be publicly reachable — Meta fetches it server-side. */
export function publishPhoto(payload: PublishPhotoRequest) {
  return fbApiClient.post<PublishResultDto>(`${BASE}/publish-photo`, {
    ...payload,
  });
}

export function publishPhotoUpload(
  pageId: string,
  file: File,
  caption?: string,
  published = true,
  scheduledPublishTimeUtc?: string
) {
  const formData = new FormData();
  formData.append("pageId", pageId);
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  formData.append("published", String(published));
  if (scheduledPublishTimeUtc)
    formData.append("scheduledPublishTimeUtc", scheduledPublishTimeUtc);
  return fbApiClient.postFormData<PublishResultDto>(
    `${BASE}/publish-photo-upload`,
    formData
  );
}

/**
 * postId comes back null — transcoding is async, so the warehouse mirror is
 * skipped and the nightly job or a webhook picks the post up later.
 */
export function publishVideo(payload: PublishVideoRequest) {
  return fbApiClient.post<PublishResultDto>(`${BASE}/publish-video`, {
    ...payload,
  });
}

export function publishVideoUpload(
  pageId: string,
  file: File,
  caption?: string,
  title?: string,
  published = true,
  scheduledPublishTimeUtc?: string
) {
  const formData = new FormData();
  formData.append("pageId", pageId);
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  if (title) formData.append("title", title);
  formData.append("published", String(published));
  if (scheduledPublishTimeUtc)
    formData.append("scheduledPublishTimeUtc", scheduledPublishTimeUtc);
  return fbApiClient.postFormData<PublishResultDto>(
    `${BASE}/publish-video-upload`,
    formData
  );
}

/**
 * 200 does not mean the Reel is live — poll getReelStatus until isReady.
 * Reels must be vertical and 3–90 seconds.
 */
export function publishReel(payload: PublishReelRequest) {
  return fbApiClient.post<PublishResultDto>(`${BASE}/publish-reel`, {
    ...payload,
  });
}

export function publishReelUpload(
  pageId: string,
  file: File,
  caption?: string,
  scheduledPublishTimeUtc?: string
) {
  const formData = new FormData();
  formData.append("pageId", pageId);
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  if (scheduledPublishTimeUtc)
    formData.append("scheduledPublishTimeUtc", scheduledPublishTimeUtc);
  return fbApiClient.postFormData<PublishResultDto>(
    `${BASE}/publish-reel-upload`,
    formData
  );
}

/**
 * Only the caption can be edited. The warehouse copy stays stale until the
 * nightly reconciliation — do not expect a re-read to show the new text.
 */
export function updatePost(payload: UpdatePostRequest) {
  return fbApiClient.post<{ postId: string; updated: boolean }>(
    `${BASE}/update-post`,
    { ...payload }
  );
}

/** The one publishing-adjacent endpoint that is safe to poll. */
export function getReelStatus(pageId: string, videoId: string) {
  return fbApiClient.get<ReelStatusDto>(
    `${BASE}/reel-status${qs({ pageId, videoId })}`
  );
}

/**
 * Scheduled posts do not appear in posts / feed / published-posts until they
 * go live, so this is the only way to see the queue.
 */
export function getScheduledPosts(pageId: string) {
  return fbApiClient.get<ScheduledPostDto[]>(
    `${BASE}/scheduled-posts${qs({ pageId })}`
  );
}

/**
 * scheduledPublishTimeUtc and publishNow are mutually exclusive; supplying
 * both or neither is a 400. To cancel instead, call deleteContent.
 */
export function reschedulePost(payload: ReschedulePostRequest) {
  return fbApiClient.post<{
    postId: string;
    updated: boolean;
    published: boolean;
    scheduledPublishTime: string | null;
  }>(`${BASE}/reschedule-post`, { ...payload });
}

/**
 * pageId is optional for a {pageId}_{postId} post id, required for a bare
 * media id. deleted:true with markedDeletedInWarehouse:false still means the
 * content is gone from Facebook.
 */
export function deleteContent(objectId: string, pageId?: string) {
  return fbApiClient.delete<DeleteResultDto>(
    `${BASE}/delete-content${qs({ objectId, pageId })}`
  );
}

// ─── Warehouse ───────────────────────────────────────────────
// Stored history. None of these call Meta, so they are fast, cost no rate
// limit, and keep working when the Graph API or the token is unavailable.

/** Every persisted field, including the share count, permalink and image. */
export function getStoredPosts(
  pageId: string,
  from?: string,
  to?: string,
  includeDeleted = false
) {
  return fbApiClient.get<StoredPostDto[]>(
    `/api/warehouse/posts${qs({
      pageId,
      from,
      to,
      includeDeleted: includeDeleted ? "true" : undefined,
    })}`
  );
}

/** The only way to see how a post accumulated engagement over time. */
export function getPostMetricsHistory(
  postId: string,
  from?: string,
  to?: string
) {
  return fbApiClient.get<TimeSeriesResponse<PostMetricPointDto>>(
    `/api/warehouse/post-metrics-history${qs({ postId, from, to })}`
  );
}

/**
 * Daily page series. followersDelta is derived on read and null on the
 * first point.
 */
export function getPageMetricsHistory(
  pageId: string,
  from?: string,
  to?: string
) {
  return fbApiClient.get<TimeSeriesResponse<PageMetricPointDto>>(
    `/api/warehouse/page-metrics-history${qs({ pageId, from, to })}`
  );
}

export function getStoredVideos(pageId: string) {
  return fbApiClient.get<StoredMediaDto[]>(
    `/api/warehouse/videos${qs({ pageId })}`
  );
}

/** Note: description carries the photo's Facebook link, not a caption. */
export function getStoredPhotos(pageId: string) {
  return fbApiClient.get<StoredMediaDto[]>(
    `/api/warehouse/photos${qs({ pageId })}`
  );
}

// ─── Operations ──────────────────────────────────────────────

/** Always 200 — read `status` for the verdict. Does not touch the database. */
export function getHealth() {
  return fbApiClient.get<HealthDto>("/health");
}

/**
 * Returns immediately; the cycle continues in the background. Poll
 * getIngestionStatus for progress. A second call while one is in flight
 * answers 200 with started:false.
 */
export function runIngestion(
  pageId?: string,
  startDate?: string,
  endDate?: string
) {
  // Unlike the metric endpoints, ingestion has no 93-day cap — it only rejects
  // an inverted range or a future start, so the full check is not applied here.
  if (startDate && endDate && endDate < startDate) {
    throw new Error(
      `Invalid date range: endDate (${endDate}) is earlier than startDate (${startDate}).`
    );
  }
  return fbApiClient.post<IngestionRunResultDto>(
    `/api/operations/run-ingestion${qs({ pageId, startDate, endDate })}`
  );
}

export function getIngestionStatus() {
  return fbApiClient.get<IngestionStatusDto>(
    "/api/operations/ingestion-status"
  );
}

/**
 * Which of a page's resources are served from SQL Server and which will call
 * Meta on the next read — the answer to "why is this number old?".
 */
export function getCacheStatus(pageId: string) {
  return fbApiClient.get<CacheStatusDto>(
    `/api/operations/cache-status${qs({ pageId })}`
  );
}
