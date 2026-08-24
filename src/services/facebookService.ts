import { fbApiClient } from "./apiClient";
import { TimeSeriesResponse } from "@/types/api";
import {
  // Auth & Accounts
  AuthStatus,
  LinkedAccount,
  LinkAccountResponse,
  // Business & Pages
  BusinessDto,
  BusinessWithPagesDto,
  // Page Analytics
  PageInsightsDto,
  PageInsightsTimeSeriesPoint,
  PageFollowersDto,
  PostDto,
  PageVideoDto,
  PagePhotoDto,
  // Page Metrics
  PageVideoMetricsDto,
  PageVideoMetricsPointDto,
  PageReactionsDailyDto,
  PageReactionsDailyPointDto,
  PageNegativeFeedbackDto,
  PageDemographicDto,
  PageLikeSourceDto,
  PageStoryMetricsDto,
  // Extended Metrics
  PageFanChurnPointDto,
  PageCtaClicksDto,
  PageCtaClicksPointDto,
  PageViewsBreakdownDto,
  PageViewsBreakdownPointDto,
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
  WebhookSubscriptionResult,
} from "@/types/facebook";

// ─── Helper ──────────────────────────────────────────────────

function dateParams(startDate?: string, endDate?: string): string {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const str = params.toString();
  return str ? `&${str}` : "";
}

// ─── Auth & Accounts ─────────────────────────────────────────

export function getAuthStatus() {
  return fbApiClient.get<AuthStatus>("/auth/facebook/status");
}

export function exchangeToken(accessToken: string) {
  return fbApiClient.post<{ message: string; expires_at: string }>(
    "/auth/facebook/exchange-token",
    { access_token: accessToken }
  );
}

export function listAccounts() {
  return fbApiClient.get<LinkedAccount[]>("/api/accounts");
}

export function getAccount(accountId: string) {
  return fbApiClient.get<LinkedAccount>(`/api/accounts/${accountId}`);
}

export function linkAccount(label: string, accessToken: string) {
  return fbApiClient.post<LinkAccountResponse>("/api/accounts", {
    label,
    accessToken,
  });
}

export function validateAccount(accountId: string) {
  return fbApiClient.post<{ account: LinkedAccount }>(
    `/api/accounts/${accountId}/validate`
  );
}

export function unlinkAccount(accountId: string) {
  return fbApiClient.delete<void>(`/api/accounts/${accountId}`);
}

// ─── Businesses & Pages ──────────────────────────────────────

export function getBusinesses() {
  return fbApiClient.get<BusinessDto[]>(
    "/api/FacebookAnalytics/businesses"
  );
}

export function getBusinessesWithPages() {
  return fbApiClient.get<BusinessWithPagesDto[]>(
    "/api/FacebookAnalytics/businesses-with-pages"
  );
}

export function syncBusinesses() {
  return fbApiClient.post<{ message: string }>(
    "/api/FacebookAnalytics/sync-businesses-as-pages"
  );
}

export function subscribeWebhooks() {
  return fbApiClient.post<WebhookSubscriptionResult>(
    "/api/FacebookAnalytics/subscribe-webhooks"
  );
}

// ─── Page Analytics ──────────────────────────────────────────

export function getPageInsights(
  pageId: string,
  startDate?: string,
  endDate?: string
) {
  if (startDate && endDate) {
    return fbApiClient.get<TimeSeriesResponse<PageInsightsTimeSeriesPoint>>(
      `/api/FacebookAnalytics/insights?pageId=${pageId}${dateParams(startDate, endDate)}`
    );
  }
  return fbApiClient.get<PageInsightsDto>(
    `/api/FacebookAnalytics/insights?pageId=${pageId}`
  );
}

export function getPageFollowers(pageId: string) {
  return fbApiClient.get<PageFollowersDto>(
    `/api/FacebookAnalytics/followers?pageId=${pageId}`
  );
}

export function getPagePosts(pageId: string) {
  return fbApiClient.get<PostDto[]>(
    `/api/FacebookAnalytics/posts?pageId=${pageId}`
  );
}

export function getPageFeed(pageId: string) {
  return fbApiClient.get<PostDto[]>(
    `/api/FacebookAnalytics/feed?pageId=${pageId}`
  );
}

export function getPublishedPosts(pageId: string) {
  return fbApiClient.get<PostDto[]>(
    `/api/FacebookAnalytics/published-posts?pageId=${pageId}`
  );
}

export function getPageVideos(pageId: string) {
  return fbApiClient.get<PageVideoDto[]>(
    `/api/FacebookAnalytics/videos?pageId=${pageId}`
  );
}

export function getPagePhotos(pageId: string) {
  return fbApiClient.get<PagePhotoDto[]>(
    `/api/FacebookAnalytics/photos?pageId=${pageId}`
  );
}

// ─── Page Metrics ────────────────────────────────────────────

/** With a date range this returns one point per day; without, a single total. */
export function getPageVideoMetrics(
  pageId: string,
  startDate?: string,
  endDate?: string
) {
  if (startDate && endDate) {
    return fbApiClient.get<TimeSeriesResponse<PageVideoMetricsPointDto>>(
      `/api/FacebookAnalytics/page-video-metrics?pageId=${pageId}${dateParams(startDate, endDate)}`
    );
  }
  return fbApiClient.get<PageVideoMetricsDto>(
    `/api/FacebookAnalytics/page-video-metrics?pageId=${pageId}`
  );
}

/** With a date range this returns one point per day; without, a single total. */
export function getPageReactionsDaily(
  pageId: string,
  startDate?: string,
  endDate?: string
) {
  if (startDate && endDate) {
    return fbApiClient.get<TimeSeriesResponse<PageReactionsDailyPointDto>>(
      `/api/FacebookAnalytics/page-reactions-daily?pageId=${pageId}${dateParams(startDate, endDate)}`
    );
  }
  return fbApiClient.get<PageReactionsDailyDto>(
    `/api/FacebookAnalytics/page-reactions-daily?pageId=${pageId}`
  );
}

/**
 * NOT DEPLOYED — returns 404.
 *
 * This route and the two below are absent from the deployed API's swagger
 * (58 paths, checked 2026-08-24). They are kept because they match the
 * documented service surface and will work unchanged if the backend ships
 * them, but no page calls them today. Re-check before wiring them into UI.
 */
export function getPageNegativeFeedback(pageId: string) {
  return fbApiClient.get<PageNegativeFeedbackDto>(
    `/api/FacebookAnalytics/page-negative-feedback?pageId=${pageId}`
  );
}

/** NOT DEPLOYED — returns 404. See getPageNegativeFeedback above. */
export function getPageDemographics(pageId: string) {
  return fbApiClient.get<PageDemographicDto[]>(
    `/api/FacebookAnalytics/page-demographics?pageId=${pageId}`
  );
}

/** NOT DEPLOYED — returns 404. See getPageNegativeFeedback above. */
export function getPageLikeSources(pageId: string) {
  return fbApiClient.get<PageLikeSourceDto[]>(
    `/api/FacebookAnalytics/page-like-sources?pageId=${pageId}`
  );
}

export function getPageStoryMetrics(pageId: string) {
  return fbApiClient.get<PageStoryMetricsDto>(
    `/api/FacebookAnalytics/page-story-metrics?pageId=${pageId}`
  );
}

// ─── Extended Metrics ────────────────────────────────────────

/** Requires startDate/endDate — the API 502s without them. */
export function getPageFanChurn(
  pageId: string,
  startDate?: string,
  endDate?: string
) {
  return fbApiClient.get<TimeSeriesResponse<PageFanChurnPointDto>>(
    `/api/FacebookAnalytics/page-fan-churn?pageId=${pageId}${dateParams(startDate, endDate)}`
  );
}

/** With a date range this returns one point per day; without, a single total. */
export function getPageCtaClicks(
  pageId: string,
  startDate?: string,
  endDate?: string
) {
  if (startDate && endDate) {
    return fbApiClient.get<TimeSeriesResponse<PageCtaClicksPointDto>>(
      `/api/FacebookAnalytics/page-cta-clicks?pageId=${pageId}${dateParams(startDate, endDate)}`
    );
  }
  return fbApiClient.get<PageCtaClicksDto>(
    `/api/FacebookAnalytics/page-cta-clicks?pageId=${pageId}`
  );
}

/** With a date range this returns one point per day; without, a single total. */
export function getPageViewsBreakdown(
  pageId: string,
  startDate?: string,
  endDate?: string
) {
  if (startDate && endDate) {
    return fbApiClient.get<TimeSeriesResponse<PageViewsBreakdownPointDto>>(
      `/api/FacebookAnalytics/page-views-breakdown?pageId=${pageId}${dateParams(startDate, endDate)}`
    );
  }
  return fbApiClient.get<PageViewsBreakdownDto>(
    `/api/FacebookAnalytics/page-views-breakdown?pageId=${pageId}`
  );
}

export function getPageAdBreakEarnings(pageId: string) {
  return fbApiClient.get<PageAdBreakEarningsDto>(
    `/api/FacebookAnalytics/page-ad-break-earnings?pageId=${pageId}`
  );
}

// ─── Post Analytics ──────────────────────────────────────────

export function getPostInsights(postId: string) {
  return fbApiClient.get<PostInsightsDto>(
    `/api/FacebookAnalytics/post-insights?postId=${postId}`
  );
}

export function getPostComments(postId: string) {
  return fbApiClient.get<PostCommentDto[]>(
    `/api/FacebookAnalytics/post-comments?postId=${postId}`
  );
}

export function getPostLikes(postId: string) {
  return fbApiClient.get<PostLikesDto>(
    `/api/FacebookAnalytics/post-likes?postId=${postId}`
  );
}

export function getPostReactions(postId: string) {
  return fbApiClient.get<PostReactionsDto>(
    `/api/FacebookAnalytics/post-reactions?postId=${postId}`
  );
}

export function getPostAttachments(postId: string) {
  return fbApiClient.get<PostAttachmentDto[]>(
    `/api/FacebookAnalytics/post-attachments?postId=${postId}`
  );
}

export function getPostEngagement(postId: string) {
  return fbApiClient.get<PostEngagementDto>(
    `/api/FacebookAnalytics/post-engagement?postId=${postId}`
  );
}

export function getPostVideoMetrics(postId: string) {
  return fbApiClient.get<PostVideoMetricsDto>(
    `/api/FacebookAnalytics/post-video-metrics?postId=${postId}`
  );
}

// ─── Comments Management ─────────────────────────────────────

export function postComment(payload: PostCommentRequest) {
  return fbApiClient.post<CommentResultDto>(
    "/api/FacebookAnalytics/post-comment",
    payload as unknown as Record<string, unknown>
  );
}

export function replyToComment(payload: ReplyToCommentRequest) {
  return fbApiClient.post<CommentResultDto>(
    "/api/FacebookAnalytics/reply-to-comment",
    payload as unknown as Record<string, unknown>
  );
}

export function hideComment(payload: HideCommentRequest) {
  return fbApiClient.post<CommentResultDto>(
    "/api/FacebookAnalytics/hide-comment",
    payload as unknown as Record<string, unknown>
  );
}

export function deleteComment(commentId: string) {
  return fbApiClient.delete<CommentResultDto>(
    `/api/FacebookAnalytics/delete-comment?commentId=${commentId}`
  );
}

// ─── Publishing ──────────────────────────────────────────────

export function publishTextPost(payload: PublishTextPostRequest) {
  return fbApiClient.post<PublishResultDto>(
    "/api/FacebookAnalytics/publish-post",
    payload as unknown as Record<string, unknown>
  );
}

export function publishPhoto(payload: PublishPhotoRequest) {
  return fbApiClient.post<PublishResultDto>(
    "/api/FacebookAnalytics/publish-photo",
    payload as unknown as Record<string, unknown>
  );
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
    "/api/FacebookAnalytics/publish-photo-upload",
    formData
  );
}

export function publishVideo(payload: PublishVideoRequest) {
  return fbApiClient.post<PublishResultDto>(
    "/api/FacebookAnalytics/publish-video",
    payload as unknown as Record<string, unknown>
  );
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
    "/api/FacebookAnalytics/publish-video-upload",
    formData
  );
}

export function publishReel(payload: PublishReelRequest) {
  return fbApiClient.post<PublishResultDto>(
    "/api/FacebookAnalytics/publish-reel",
    payload as unknown as Record<string, unknown>
  );
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
    "/api/FacebookAnalytics/publish-reel-upload",
    formData
  );
}

export function updatePost(payload: UpdatePostRequest) {
  return fbApiClient.post<{ postId: string; updated: boolean }>(
    "/api/FacebookAnalytics/update-post",
    payload as unknown as Record<string, unknown>
  );
}

export function getReelStatus(pageId: string, videoId: string) {
  return fbApiClient.get<ReelStatusDto>(
    `/api/FacebookAnalytics/reel-status?pageId=${pageId}&videoId=${videoId}`
  );
}

export function getScheduledPosts(pageId: string) {
  return fbApiClient.get<ScheduledPostDto[]>(
    `/api/FacebookAnalytics/scheduled-posts?pageId=${pageId}`
  );
}

export function reschedulePost(payload: ReschedulePostRequest) {
  return fbApiClient.post<{ postId: string; updated: boolean }>(
    "/api/FacebookAnalytics/reschedule-post",
    payload as unknown as Record<string, unknown>
  );
}

export function deleteContent(objectId: string, pageId?: string) {
  const params = new URLSearchParams({ objectId });
  if (pageId) params.set("pageId", pageId);
  return fbApiClient.delete<DeleteResultDto>(
    `/api/FacebookAnalytics/delete-content?${params.toString()}`
  );
}

// ─── Warehouse ───────────────────────────────────────────────

export function getStoredPosts(
  pageId: string,
  from?: string,
  to?: string,
  includeDeleted = false
) {
  const params = new URLSearchParams({ pageId });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (includeDeleted) params.set("includeDeleted", "true");
  return fbApiClient.get<StoredPostDto[]>(
    `/api/warehouse/posts?${params.toString()}`
  );
}

export function getPostMetricsHistory(postId: string) {
  return fbApiClient.get<TimeSeriesResponse<PostMetricPointDto>>(
    `/api/warehouse/post-metrics-history?postId=${postId}`
  );
}

export function getPageMetricsHistory(pageId: string) {
  return fbApiClient.get<TimeSeriesResponse<PageMetricPointDto>>(
    `/api/warehouse/page-metrics-history?pageId=${pageId}`
  );
}

export function getStoredVideos(pageId: string) {
  return fbApiClient.get<StoredMediaDto[]>(
    `/api/warehouse/videos?pageId=${pageId}`
  );
}

export function getStoredPhotos(pageId: string) {
  return fbApiClient.get<StoredMediaDto[]>(
    `/api/warehouse/photos?pageId=${pageId}`
  );
}

// ─── Operations ──────────────────────────────────────────────

export function getHealth() {
  return fbApiClient.get<HealthDto>("/health");
}

export function runIngestion(
  pageId?: string,
  startDate?: string,
  endDate?: string
) {
  const params = new URLSearchParams();
  if (pageId) params.set("pageId", pageId);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();
  return fbApiClient.post<IngestionRunResultDto>(
    `/api/operations/run-ingestion${qs ? `?${qs}` : ""}`
  );
}

export function getIngestionStatus() {
  return fbApiClient.get<IngestionStatusDto>(
    "/api/operations/ingestion-status"
  );
}
