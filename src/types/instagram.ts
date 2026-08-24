/**
 * Instagram Analytics API types.
 *
 * Mirrors the DTOs in Instagram.Analytics.Service.Application/DTOs.
 * ASP.NET serializes the C# records camelCase, so property names match
 * the record parameter names with a lowercase first letter.
 *
 * Every endpoint is a live Graph API passthrough — there is no warehouse
 * read path on this service, so nothing here is served from SQL.
 */

// ─── Shared envelopes ────────────────────────────────────────

/** PagedResultDto<T> — cursor pagination, `after` feeds the next request. */
export interface IgPagedResult<T> {
  data: T[];
  nextCursor: string | null;
  previousCursor: string | null;
}

// ─── Account ─────────────────────────────────────────────────

/** UserProfileDto */
export interface IgUserProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  website: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string;
  accountType: string;
}

// ─── Media ───────────────────────────────────────────────────

/**
 * MediaDto.mediaType is `MediaType.ToString()` on the C# enum, so it arrives
 * PascalCase ("CarouselAlbum") — not the Graph API's "CAROUSEL_ALBUM".
 */
export type IgMediaType =
  | "Image"
  | "Video"
  | "CarouselAlbum"
  | "Reel"
  | "Story";

/** MediaDto */
export interface IgMedia {
  id: string;
  caption: string;
  mediaType: IgMediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string; // ISO 8601
  likeCount: number;
  commentsCount: number;
  children?: IgMedia[] | null;
}

// ─── Comments ────────────────────────────────────────────────

/** CommentDto */
export interface IgComment {
  id: string;
  text: string;
  timestamp: string; // ISO 8601
  username: string;
  repliesCount: number;
  hidden: boolean;
}

/** Body for POST /api/comments/media/{id} and /api/comments/{id}/replies */
export interface IgPostCommentRequest {
  message: string;
}

// ─── Insights ────────────────────────────────────────────────

/** InsightDataPointDto */
export interface IgInsightDataPoint {
  endTime: string; // ISO 8601
  value: number;
}

/** InsightDto */
export interface IgInsight {
  name: string;
  period: string;
  title: string;
  description: string;
  values: IgInsightDataPoint[];
}

/** Account metrics available on the `day` period. */
export type IgAccountMetric =
  | "views"
  | "accounts_engaged"
  | "total_interactions"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "replies";

/** Insight periods accepted by the Graph API. */
export type IgInsightPeriod = "day" | "week" | "days_28" | "month" | "lifetime";

// ─── Hashtags ────────────────────────────────────────────────

/** HashtagDto */
export interface IgHashtag {
  id: string;
  name: string;
}

// ─── Content publishing ──────────────────────────────────────

/** ContainerStatusDto — status is `ContainerStatus.ToString()`, so PascalCase. */
export type IgContainerStatus = "InProgress" | "Finished" | "Error" | "Expired";

export interface IgContainer {
  id: string;
  status: IgContainerStatus;
}

/** PublishMediaRequest */
export interface IgPublishMediaRequest {
  imageUrl?: string | null;
  videoUrl?: string | null;
  caption?: string | null;
  /** "IMAGE" | "VIDEO" | "REELS" | "STORIES" | "CAROUSEL" */
  mediaType: string;
  /** Container ids of the children, for a CAROUSEL container. */
  childrenIds?: string[] | null;
}

/** POST /api/publishing/{igUserId}/publish/{containerId} */
export interface IgPublishResult {
  mediaId: string;
}

// ─── Product tags ────────────────────────────────────────────

/** ProductTagDto */
export interface IgProductTag {
  productId: string;
  merchantId: string;
  name: string;
  x: number | null;
  y: number | null;
}

/** ProductAppealDto */
export interface IgProductAppeal {
  productId: string;
  status: string;
}

/** ProductTagItem */
export interface IgProductTagItem {
  productId: string;
  merchantId: string;
  x?: number | null;
  y?: number | null;
}

export interface IgPostProductTagsRequest {
  tags: IgProductTagItem[];
}

export interface IgDeleteProductTagsRequest {
  productIds: string[];
}

// ─── Ads (Meta Marketing API) ────────────────────────────────

/**
 * Budgets and times stay as the API's own strings — the Marketing API returns
 * budgets in minor currency units and times as ISO 8601, and the service does
 * not coerce either.
 */
export interface IgAdCampaign {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  startTime: string | null;
  stopTime: string | null;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  budgetRemaining: string | null;
}

export interface IgAdSet {
  id: string;
  name: string;
  campaignId: string | null;
  status: string;
  startTime: string | null;
  endTime: string | null;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  optimizationGoal: string | null;
  billingEvent: string | null;
  bidStrategy: string | null;
}

export interface IgAd {
  id: string;
  name: string;
  adsetId: string | null;
  campaignId: string | null;
  status: string;
}

export interface IgAdInsight {
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  dateStart: string;
  dateStop: string | null;
}

// ─── Webhooks ────────────────────────────────────────────────

/** WebhookSubscriptionDto */
export interface IgWebhookSubscription {
  object: string;
  callbackUrl: string;
  fields: string[];
  active: boolean;
}

export interface IgSubscribeWebhookRequest {
  callbackUrl: string;
  verifyToken: string;
  fields: string[];
}

// ─── Frontend-only ───────────────────────────────────────────

/**
 * An Instagram account the dashboard can show.
 *
 * The service has no account-list endpoint — every route takes `{igUserId}`
 * as a path param — so the list is configured on the frontend instead.
 * See IG_ACCOUNTS in `@/lib/constants`.
 */
export interface IgAccount {
  igUserId: string;
  name: string;
  adAccountId?: string;
}
