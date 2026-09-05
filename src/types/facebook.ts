import type { TimeSeriesResponse, MetricSeries } from "./api";

/**
 * Facebook Analytics API — TypeScript interfaces.
 *
 * Mirrors the DTOs in Facebook.Analytics.Application/DTO. ASP.NET serializes
 * with the default camelCase policy, except where a [JsonPropertyName] says
 * otherwise (noted below). Fields marked optional carry
 * [JsonIgnore(WhenWritingNull)] on the server — they are OMITTED, not zeroed,
 * when Meta no longer reports the metric.
 */

// ─── Accounts ────────────────────────────────────────────────
//
// Every endpoint except /api/accounts, /auth/facebook, /health,
// /privacy-policy and /api/webhook is scoped to a linked Meta account,
// resolved from ?accountId= or the X-Account-Id header. With exactly one
// account linked the header may be omitted; with two or more an unscoped
// request is refused rather than pointed at an arbitrary one.

/** A linked Meta account. Never carries the token — only its last 4 chars. */
export interface MetaAccountDto {
  accountId: string;
  label: string;
  metaUserId: string;
  tokenType: string;
  tokenLast4: string;
  scopes: string | null;
  /** Null for a system user token, which does not expire */
  expiresAt: string | null;
  /** Null when the token does not expire; negative once it has */
  daysUntilExpiry: number | null;
  status: string;
  lastValidatedAt: string | null;
  lastError: string | null;
  createdAt: string;
  /** Pages discovered under this account. Zero means it produces no data. */
  pageCount: number;
}

/** Result of POST /api/accounts and POST /api/accounts/{id}/validate */
export interface LinkAccountResultDto {
  success: boolean;
  error: string | null;
  account: MetaAccountDto | null;
  discoveredPages: number;
  /** Set when the link succeeded but is unlikely to be useful */
  warning: string | null;
}

export interface UnlinkAccountResultDto {
  unlinked: boolean;
  accountId: string;
  note: string;
}

// ─── Auth ────────────────────────────────────────────────────

/**
 * GET /auth/facebook/status.
 *
 * Note the snake_case: this response is an anonymous object, not a DTO, so it
 * escapes the API's usual camelCase convention.
 */
export interface AuthStatus {
  has_account: boolean;
  /** Present only when has_account is true */
  count?: number;
  accounts?: AccountStatus[];
  /** Present only when has_account is false */
  message?: string;
  login_url?: string;
}

export interface AccountStatus {
  account_id: string;
  label: string;
  token_type: string;
  status: string;
  expires_at: string | null;
  expires_in_days: number | null;
  /** Always false for a system user token, which has no expiry */
  is_expiring_soon: boolean;
  pages: number;
  last_error: string | null;
}

/** GET /auth/facebook/callback and POST /auth/facebook/exchange-token */
export interface TokenLinkResult {
  message: string;
  account_id: string | null;
  label: string | null;
  expires_at: string | null;
  pages_reachable: number;
}

// ─── Businesses & Pages ──────────────────────────────────────

export interface BusinessDto {
  id: string;
  name: string;
}

export interface BusinessWithPagesDto {
  businessId: string;
  businessName: string;
  createdAt: string | null;
  pageCount: number;
  pages: PageDto[];
}

/** PageSummaryDto — the shape nested inside BusinessWithPagesDto.pages */
export interface PageDto {
  pageId: string;
  pageName: string;
}

export interface WebhookSubscriptionResult {
  subscribed: number;
  failed: number;
  results: { pageId: string; status: string; error?: string }[];
}

// ─── Page Analytics ──────────────────────────────────────────

/**
 * FacebookPageInsightsDto.
 *
 * contentViews and engagedUsers are gone: page_impressions and
 * page_impressions_unique were verified rejected by Meta at v26.0, so the
 * service no longer requests them.
 */
export interface PageInsightsDto {
  /** page_views_total — profile tab views. Stored as `interest`. */
  pageViews: number;
  postEngagements: number;
}

/**
 * Current snapshot of follower and fan counts.
 *
 * The service reads both from the Page object
 * (`?fields=followers_count,fan_count`) and maps them independently — but Meta
 * returns the SAME value for both on Pages where Likes and Followers have been
 * merged, which is now the norm. `page_fans` was deprecated on 15 Nov 2025
 * with "use the followers_count field on the Page object" as its replacement.
 *
 * So do not render both as separate figures: it prints one measurement twice
 * under two labels and invites the reader to compare them. Prefer
 * followersCount, and confirm against your own Page before treating fanCount
 * as a distinct number.
 */
export interface PageFollowersDto {
  followersCount: number;
  /** Legacy Page likes. Usually identical to followersCount — see above. */
  fanCount: number;
}

export interface PostDto {
  id: string;
  /** Graph "message" */
  content: string;
  datePosted: string;
  /** Meta status_type vocabulary (added_photos, shared_story, …); null pre-fix */
  type: string | null;
  fullPicture: string | null;
  permalinkUrl: string | null;
  sharesCount: number;
}

export interface PageVideoDto {
  id: string;
  title: string;
  description: string;
  createdTime: string;
}

export interface PagePhotoDto {
  id: string;
  name: string;
  link: string;
  createdTime: string;
}

// ─── Page Metrics ────────────────────────────────────────────

/**
 * page_video_views_unique (removed at v26.0) and page_video_views_10s (removed
 * at v25.0) are no longer requested, so those fields are gone.
 */
export interface PageVideoMetricsDto {
  /** 3s+ views */
  videoViews: number;
  videoViewsPaid: number;
  videoViewsOrganic: number;
  /** int64 — overflows int on active pages */
  videoViewTimeMs: number;
  videoCompleteViews30s: number;
}

export interface PageReactionsDailyDto {
  reactionsLike: number;
  reactionsLove: number;
  reactionsWow: number;
  reactionsHaha: number;
  reactionsSorry: number;
  reactionsAngry: number;
  reactionsTotal: number;
}

/** Facebook's newsfeed "story", not the 24-hour ephemeral feature. */
export interface PageStoryMetricsDto {
  storyAdds: number;
  storyAddsUnique: number;
  actionFan: number;
  actionMention: number;
  actionPagePost: number;
  actionUserPost: number;
  actionCheckin: number;
  actionOther: number;
}

// ─── Extended Metrics ────────────────────────────────────────

/** Measures follows, not Page likes — the page_fan_* family was removed. */
export interface PageFanChurnDto {
  fanAdds: number;
  fanAddsUnique: number;
  fanRemoves: number;
  fanRemovesUnique: number;
  /** Gains minus losses; negative means the page shrank */
  netChange: number;
  /** Losses as a share of gains; above 1 means net shrinkage */
  churnRatio: number;
}

/**
 * Only page_total_actions survives at v26.0. The four click breakdowns, and
 * every replacement variant, were verified rejected by Meta.
 */
export interface PageCtaClicksDto {
  totalActions: number;
}

/** Only page_views_total survives at v26.0; the breakdowns were removed. */
export interface PageViewsBreakdownDto {
  total: number;
}

/**
 * Pages not enrolled in Ad Breaks return zeros rather than an error, so a zero
 * here does not distinguish "no revenue" from "not enrolled".
 */
export interface PageAdBreakEarningsDto {
  earnings: number;
  adImpressions: number;
  cpm: number;
  earningsByCrosspostStatus: Record<string, number>;
}

// ─── Post Analytics ──────────────────────────────────────────

/**
 * Three of these four fields are permanently 0 and the fourth is mislabelled.
 * Use PostEngagementDto for real click and engagement data.
 */
export interface PostInsightsDto {
  /** deprecated at v25.0 — always 0 */
  impressions: number;
  /** deprecated at v25.0 — always 0 */
  reach: number;
  /** NOT engaged users — the sum of all six lifetime reaction totals */
  engagedUsers: number;
  /** deprecated at v25.0 — always 0 */
  clicks: number;
}

/** post-comments returns Facebook's first page only — treat as "at least N". */
export interface PostCommentDto {
  id: string;
  message: string;
  fromName: string;
  createdTime: string;
}

/** post-likes answers with an object, not a bare integer. */
export interface PostLikesDto {
  postId: string;
  likes: number;
}

export interface PostReactionsDto {
  like: number;
  love: number;
  wow: number;
  haha: number;
  sad: number;
  angry: number;
  /** Computed server-side as the sum of the six */
  total: number;
}

export interface PostAttachmentDto {
  type: string;
  title: string;
  url: string;
  description: string;
}

/**
 * Post clicks and activity.
 *
 * post_engaged_users, post_clicks_unique and post_activity_unique were verified
 * rejected by Meta, so those fields are gone. `activity` is summed from
 * post_activity_by_action_type, which survives.
 */
export interface PostEngagementDto {
  clicks: number;
  activity: number;
  /** "link clicks", "photo view", "video play", "other clicks" */
  clicksByType: Record<string, number>;
}

/**
 * Non-video posts return zeros. post_video_views_unique and
 * post_video_views_10s were removed by Meta and are no longer requested.
 */
export interface PostVideoMetricsDto {
  views: number;
  viewsPaid: number;
  viewsOrganic: number;
  viewsSoundOn: number;
  /** int64 — overflows int on long videos */
  viewTimeMs: number;
  avgTimeWatchedMs: number;
  lengthMs: number;
  /** avgTimeWatched / length, 0-1. Null if length is unknown. */
  completionRate: number | null;
}

// ─── Comments Management ─────────────────────────────────────

export interface CommentResultDto {
  commentId: string;
  success: boolean;
  action: "created" | "replied" | "hidden" | "unhidden" | "deleted";
}

export interface PostCommentRequest {
  postId: string;
  message: string;
}

export interface ReplyToCommentRequest {
  commentId: string;
  message: string;
}

export interface HideCommentRequest {
  commentId: string;
  /** Defaults to true; send false to unhide */
  hidden?: boolean;
}

// ─── Publishing ──────────────────────────────────────────────

export interface PublishResultDto {
  /** Null for video and reel — transcoding is async */
  postId: string | null;
  /** The media object id, which differs from the feed post id */
  mediaId: string | null;
  kind: "post" | "photo" | "video" | "reel";
  published: boolean;
  scheduledPublishTime: string | null;
  mirroredToWarehouse: boolean;
}

/** At least one of message / link is required — 400 otherwise. */
export interface PublishTextPostRequest {
  pageId: string;
  message?: string;
  link?: string;
  /** Default true. Forced to false when scheduledPublishTimeUtc is set. */
  published?: boolean;
  /** ISO-8601; 10 minutes to 6 months out */
  scheduledPublishTimeUtc?: string | null;
}

export interface PublishPhotoRequest {
  pageId: string;
  /** Must be publicly reachable — Meta fetches it server-side */
  photoUrl: string;
  caption?: string;
  published?: boolean;
  scheduledPublishTimeUtc?: string | null;
}

export interface PublishVideoRequest {
  pageId: string;
  videoUrl: string;
  /** Maps to Graph `description` — the post body */
  caption?: string;
  /** The separate video name */
  title?: string;
  published?: boolean;
  scheduledPublishTimeUtc?: string | null;
}

export interface PublishReelRequest {
  pageId: string;
  videoUrl: string;
  caption?: string;
  scheduledPublishTimeUtc?: string | null;
}

/** Only the caption can be edited; media, links and created_time are immutable. */
export interface UpdatePostRequest {
  postId: string;
  message: string;
}

/** scheduledPublishTimeUtc and publishNow are mutually exclusive. */
export interface ReschedulePostRequest {
  postId: string;
  scheduledPublishTimeUtc?: string;
  publishNow?: boolean;
}

export interface ScheduledPostDto {
  id: string;
  message: string;
  scheduledPublishTime: string | null;
  createdTime: string | null;
  /** Negative once the time has passed */
  minutesUntilPublish: number | null;
}

export interface DeleteResultDto {
  id: string;
  deleted: boolean;
  /** False if the row was never ingested or is still in the streaming buffer */
  markedDeletedInWarehouse: boolean;
}

export interface ReelStatusDto {
  videoId: string;
  videoStatus: "processing" | "ready" | "error" | "expired" | (string & {});
  uploadingPhase: string;
  processingPhase: string;
  publishingPhase: string;
  errorMessage: string | null;
  isReady: boolean;
}

// ─── Warehouse ───────────────────────────────────────────────

export interface StoredPostDto {
  postId: string;
  pageId: string;
  pageName: string;
  message: string;
  createdTime: string | null;
  type: string | null;
  fullPicture: string | null;
  permalinkUrl: string | null;
  sharesCount: number;
  deletedAt: string | null;
  isDeleted: boolean;
}

export interface PostMetricPointDto {
  date: string;
  /** deprecated upstream — always 0 */
  impressions: number;
  /** deprecated upstream — always 0 */
  reach: number;
  /** actually the sum of reactions */
  engagedUsers: number;
  /** deprecated upstream — always 0 */
  clicks: number;
  likes: number;
  reactionsLike: number;
  reactionsLove: number;
  reactionsWow: number;
  reactionsHaha: number;
  reactionsSad: number;
  reactionsAngry: number;
  comments: number;
  shares: number;
}

export interface PageMetricPointDto {
  date: string;
  /** Legacy Page likes; usually mirrors followersCount — see PageFollowersDto */
  fanCount: number;
  followersCount: number;
  /** page_impressions_unique — 0, since the metric was deprecated */
  reach: number;
  /** page_views_total, renamed for BI clarity */
  interest: number;
  postEngagements: number;
  /** Derived on read; null on the first point of a series */
  followersDelta: number | null;
}

export interface StoredMediaDto {
  id: string;
  pageId: string;
  pageName: string;
  /** Video title, or photo name */
  title: string;
  /** Video description, or the photo's Facebook link */
  description: string;
  createdTime: string | null;
}

// ─── Operations ──────────────────────────────────────────────

export interface HealthDto {
  status: "healthy" | "degraded";
  timestamp: string;
  environment: string;
  /** facebookToken, pageTokenCache, ingestion */
  checks: Record<string, string>;
}

export interface IngestionRunResultDto {
  /** False when a cycle was already in flight — a no-op, not an error */
  started: boolean;
  reason: string | null;
  pageId: string | null;
  startedAt: string;
}

export interface IngestionCheckpoint {
  pageId: string;
  pageName: string;
  jobType: string;
  lastSuccessfulDate: string | null;
  updatedAt: string | null;
  /** True when the checkpoint has not advanced in over 48 hours */
  isStale: boolean;
}

export interface IngestionStatusDto {
  isRunning: boolean;
  currentRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunOutcome: string | null;
  nextScheduledRun: string;
  stalePageCount: number;
  /** Set when the checkpoint read failed; the run state above is still accurate */
  checkpointError: string | null;
  checkpoints: IngestionCheckpoint[];
}

/** GET /api/operations/cache-status — what the next read of each resource does. */
export interface CacheStatusDto {
  pageId: string;
  cacheEnabled: boolean;
  webhookRefreshMode: string;
  resources: CacheResourceStatus[];
}

export interface CacheResourceStatus {
  kind: string;
  key: string | null;
  isFetched: boolean;
  isStale: boolean;
  lastFetchedAt: string | null;
  staleSince: string | null;
  staleReason: string | null;
  ttlMinutes: number | null;
  expiresAt: string | null;
  /** True when the next read will call Meta rather than serve stored data */
  nextReadCallsMeta: boolean;
}

// ─── Ranged metric responses ─────────────────────────────────

/**
 * Five metric endpoints accept startDate + endDate. Supplying a range changes
 * the response shape: instead of the flat DTO you get a TimeSeriesResponse of
 * daily points, with the DTO nested under each point's `metrics`.
 *
 * This matters — without a range Meta returns only its default two-day window,
 * which is why these endpoints look permanently near-zero.
 */
export type PageInsightsSeries = MetricSeries<PageInsightsDto>;
export type PageVideoMetricsSeries = MetricSeries<PageVideoMetricsDto>;
export type PageReactionsDailySeries = MetricSeries<PageReactionsDailyDto>;
export type PageFanChurnSeries = MetricSeries<PageFanChurnDto>;
export type PageCtaClicksSeries = MetricSeries<PageCtaClicksDto>;
export type PageViewsBreakdownSeries = MetricSeries<PageViewsBreakdownDto>;

/** Narrows the union returned by the ranged metric service functions. */
export function isMetricSeries<T>(
  result: T | MetricSeries<T>
): result is MetricSeries<T> {
  return (
    typeof result === "object" &&
    result !== null &&
    Array.isArray((result as MetricSeries<T>).points)
  );
}

export type { TimeSeriesResponse, MetricSeries };
