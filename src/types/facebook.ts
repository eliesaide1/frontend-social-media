/**
 * Facebook Analytics API — TypeScript interfaces
 * Matches the real API at http://fbanalyticsapi.tryasp.net
 * All 61 endpoints covered.
 */

// ─── Auth & Accounts ─────────────────────────────────────────

export interface AuthStatus {
  has_account: boolean;
  count?: number;
  accounts?: AccountStatus[];
  message?: string;
  login_url?: string;
}

export interface AccountStatus {
  account_id: string;
  label: string;
  token_type: "system_user" | "user";
  status: "active" | "invalid" | "expired";
  expires_at: string | null;
  expires_in_days: number | null;
  is_expiring_soon: boolean;
  pages: number;
  last_error: string | null;
}

export interface LinkedAccount {
  accountId: string;
  label: string;
  metaUserId: string;
  tokenType: string;
  tokenLast4: string;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  status: string;
  pageCount: number;
}

export interface LinkAccountResponse {
  success: boolean;
  account: LinkedAccount;
  discoveredPages: number;
  warning: string | null;
}

// ─── Businesses & Pages ──────────────────────────────────────

export interface BusinessDto {
  id: string;
  name: string;
}

export interface BusinessWithPagesDto {
  businessId: string;
  businessName: string;
  createdAt: string;
  pageCount: number;
  pages: PageDto[];
}

export interface PageDto {
  pageId: string;
  pageName: string;
}

// ─── Page Analytics ──────────────────────────────────────────

export interface PageInsightsDto {
  contentViews: number;
  engagedUsers: number;
  pageViews: number;
  postEngagements: number;
}

export interface PageInsightsTimeSeriesPoint {
  date: string;
  metrics: {
    pageViews: number;
    postEngagements: number;
    [key: string]: number;
  };
}

export interface PageFollowersDto {
  followersCount: number;
  fanCount: number;
}

export interface PostDto {
  id: string;
  content: string;
  datePosted: string;
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

export interface PageVideoMetricsDto {
  videoViews: number;
  videoViewsPaid: number;
  videoViewsOrganic: number;
  videoViewsUnique: number;
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

export interface PageNegativeFeedbackDto {
  totalNegative: number;
  hideClicks: number;
  hideAllClicks: number;
  reportSpamClicks: number;
  unlikePageClicks: number;
}

export interface PageDemographicDto {
  demographicType: "gender_age" | "city" | "country";
  dimension: string;
  count: number;
}

export interface PageLikeSourceDto {
  source: string;
  fanCount: number;
}

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

export interface PageFanChurnDto {
  fanAdds: number;
  fanAddsUnique: number;
  fanRemoves: number;
  fanRemovesUnique: number;
  netChange: number;
  churnRatio: number;
}

export interface PageCtaClicksDto {
  totalActions: number;
  unavailableMetrics: string[];
}

export interface PageViewsBreakdownDto {
  total: number;
  unavailableMetrics: string[];
}

export interface PageAdBreakEarningsDto {
  earnings: number;
  adImpressions: number;
  cpm: number;
  earningsByCrosspostStatus: {
    original: number;
    crosspost: number;
  };
}

// ─── Post Analytics ──────────────────────────────────────────

export interface PostInsightsDto {
  impressions: number;
  reach: number;
  engagedUsers: number;
  clicks: number;
}

export interface PostCommentDto {
  id: string;
  message: string;
  fromName: string;
  createdTime: string;
}

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
  total: number;
}

export interface PostAttachmentDto {
  type: string;
  title: string;
  url: string;
  description: string;
}

export interface PostEngagementDto {
  engagedUsers: number;
  clicks: number;
  clicksUnique: number;
  activity: number;
  activityUnique: number;
  clicksByType: Record<string, number>;
}

export interface PostVideoMetricsDto {
  views: number;
  viewsUnique: number;
  viewsPaid: number;
  viewsOrganic: number;
  views10s: number;
  viewsSoundOn: number;
  viewTimeMs: number;
  avgTimeWatchedMs: number;
  lengthMs: number;
  completionRate: number;
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
  hidden?: boolean;
}

// ─── Publishing ──────────────────────────────────────────────

export interface PublishResultDto {
  postId: string | null;
  mediaId: string | null;
  kind: "post" | "photo" | "video" | "reel";
  published: boolean;
  scheduledPublishTime: string | null;
  mirroredToWarehouse: boolean;
}

export interface PublishTextPostRequest {
  pageId: string;
  message?: string;
  link?: string;
  published?: boolean;
  scheduledPublishTimeUtc?: string | null;
}

export interface PublishPhotoRequest {
  pageId: string;
  photoUrl: string;
  caption?: string;
  published?: boolean;
  scheduledPublishTimeUtc?: string | null;
}

export interface PublishVideoRequest {
  pageId: string;
  videoUrl: string;
  caption?: string;
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

export interface UpdatePostRequest {
  postId: string;
  message: string;
}

export interface ReschedulePostRequest {
  postId: string;
  scheduledPublishTimeUtc?: string;
  publishNow?: boolean;
}

export interface ScheduledPostDto {
  id: string;
  message: string;
  scheduledPublishTime: string;
  createdTime: string;
  minutesUntilPublish: number;
}

export interface DeleteResultDto {
  id: string;
  deleted: boolean;
  markedDeletedInWarehouse: boolean;
}

export interface ReelStatusDto {
  videoId: string;
  videoStatus: "processing" | "ready" | "error" | "expired";
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
  createdTime: string;
  type: string;
  fullPicture: string | null;
  permalinkUrl: string | null;
  sharesCount: number;
  deletedAt: string | null;
  isDeleted: boolean;
}

export interface PostMetricPointDto {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  reactionsLike: number;
  reactionsLove: number;
  reactionsWow: number;
  reactionsHaha: number;
  reactionsSad: number;
  reactionsAngry: number;
  impressions: number;
  reach: number;
  clicks: number;
}

export interface PageMetricPointDto {
  date: string;
  fanCount: number;
  followersCount: number;
  reach: number;
  interest: number;
  postEngagements: number;
  followersDelta: number | null;
}

export interface StoredMediaDto {
  id: string;
  pageId: string;
  pageName: string;
  title: string;
  description: string;
  createdTime: string;
}

// ─── Operations ──────────────────────────────────────────────

export interface HealthDto {
  status: "healthy" | "degraded";
  timestamp: string;
  environment: string;
  checks: {
    facebookToken: string;
    pageTokenCache: string;
    ingestion: string;
  };
}

export interface IngestionRunResultDto {
  started: boolean;
  reason: string;
  pageId: string | null;
  startedAt: string;
}

export interface IngestionCheckpoint {
  pageId: string;
  pageName: string;
  jobType: string;
  lastSuccessfulDate: string;
  isStale: boolean;
}

export interface IngestionStatusDto {
  isRunning: boolean;
  currentRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunOutcome: string;
  nextScheduledRun: string;
  stalePageCount: number;
  checkpointError: string | null;
  checkpoints: IngestionCheckpoint[];
}

// ─── Webhooks ────────────────────────────────────────────────

export interface WebhookSubscriptionResult {
  subscribed: number;
  failed: number;
  results: { pageId: string; status: string; error?: string }[];
}
