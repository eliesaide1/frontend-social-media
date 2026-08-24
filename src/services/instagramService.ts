import { igApiClient } from "./apiClient";
import type {
  IgAd,
  IgAdCampaign,
  IgAdInsight,
  IgAdSet,
  IgComment,
  IgContainer,
  IgDeleteProductTagsRequest,
  IgHashtag,
  IgInsight,
  IgInsightPeriod,
  IgMedia,
  IgPagedResult,
  IgPostProductTagsRequest,
  IgProductAppeal,
  IgProductTag,
  IgPublishMediaRequest,
  IgPublishResult,
  IgSubscribeWebhookRequest,
  IgUserProfile,
  IgWebhookSubscription,
} from "@/types/instagram";

/**
 * Instagram Analytics Service — covers all 40 endpoints exposed by
 * iganalyticsapi.tryasp.net.
 *
 * Every route is a live Graph API passthrough: the service holds one system
 * access token and appends it to each outbound call. There is no warehouse
 * read path and no per-request auth header, so these functions return live
 * data or nothing.
 */

// ─── Helper ──────────────────────────────────────────────────

function qs(
  params: Record<string, string | number | boolean | undefined | null>
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

// ─── Account — /api/accounts ─────────────────────────────────

export function getProfile(igUserId: string) {
  return igApiClient.get<IgUserProfile>(`/api/accounts/${igUserId}`);
}

export function getAccountMedia(
  igUserId: string,
  limit?: number,
  after?: string
) {
  return igApiClient.get<IgPagedResult<IgMedia>>(
    `/api/accounts/${igUserId}/media${qs({ limit, after })}`
  );
}

export function getStories(igUserId: string) {
  return igApiClient.get<IgMedia[]>(`/api/accounts/${igUserId}/stories`);
}

export function getLiveMedia(igUserId: string) {
  return igApiClient.get<IgMedia[]>(`/api/accounts/${igUserId}/live-media`);
}

export function getTaggedMedia(igUserId: string) {
  return igApiClient.get<IgMedia[]>(`/api/accounts/${igUserId}/tagged`);
}

export function getMentionedMedia(igUserId: string) {
  return igApiClient.get<IgMedia[]>(`/api/accounts/${igUserId}/mentioned-media`);
}

export function getMentionedComments(igUserId: string) {
  return igApiClient.get<IgComment[]>(
    `/api/accounts/${igUserId}/mentioned-comments`
  );
}

export function getRecentlySearchedHashtags(igUserId: string) {
  return igApiClient.get<IgHashtag[]>(
    `/api/accounts/${igUserId}/recently-searched-hashtags`
  );
}

// ─── Media — /api/media ──────────────────────────────────────

export function getMedia(igMediaId: string) {
  return igApiClient.get<IgMedia>(`/api/media/${igMediaId}`);
}

export function getMediaComments(igMediaId: string, after?: string) {
  return igApiClient.get<IgPagedResult<IgComment>>(
    `/api/media/${igMediaId}/comments${qs({ after })}`
  );
}

export function getMediaChildren(igMediaId: string) {
  return igApiClient.get<IgMedia[]>(`/api/media/${igMediaId}/children`);
}

// ─── Comments — /api/comments ────────────────────────────────

export function getComment(igCommentId: string) {
  return igApiClient.get<IgComment>(`/api/comments/${igCommentId}`);
}

export function getCommentReplies(igCommentId: string, after?: string) {
  return igApiClient.get<IgPagedResult<IgComment>>(
    `/api/comments/${igCommentId}/replies${qs({ after })}`
  );
}

export function postComment(igMediaId: string, message: string) {
  return igApiClient.post<IgComment>(`/api/comments/media/${igMediaId}`, {
    message,
  });
}

export function replyToComment(igCommentId: string, message: string) {
  return igApiClient.post<IgComment>(`/api/comments/${igCommentId}/replies`, {
    message,
  });
}

/** Returns 204 No Content on success. */
export function hideComment(igCommentId: string, hidden = true) {
  return igApiClient.post<void>(
    `/api/comments/${igCommentId}/hide${qs({ hidden })}`
  );
}

/** Returns 204 No Content on success. */
export function deleteComment(igCommentId: string) {
  return igApiClient.delete<void>(`/api/comments/${igCommentId}`);
}

// ─── Insights — /api/insights ────────────────────────────────

/**
 * Account insights.
 *
 * `since` and `until` are Unix timestamps in seconds, not dates — the Graph
 * API takes them that way and the service passes them straight through.
 */
export function getAccountInsights(
  igUserId: string,
  metrics: string[],
  period: IgInsightPeriod = "day",
  since?: number,
  until?: number
) {
  return igApiClient.get<IgInsight[]>(
    `/api/insights/account/${igUserId}${qs({
      metrics: metrics.join(","),
      period,
      since,
      until,
    })}`
  );
}

/**
 * Media insights. Valid metrics depend on the media type:
 *  - IMAGE / VIDEO / CAROUSEL: views, reach, likes, comments, shares, saved,
 *    total_interactions
 *  - REEL: the above plus ig_reels_avg_watch_time,
 *    ig_reels_video_view_total_time
 *  - STORY: views, reach, exits, replies, taps_forward, taps_back
 */
export function getMediaInsights(igMediaId: string, metrics: string[]) {
  return igApiClient.get<IgInsight[]>(
    `/api/insights/media/${igMediaId}${qs({ metrics: metrics.join(",") })}`
  );
}

// ─── Ads — /api/ads ──────────────────────────────────────────

export function getAdCampaigns(adAccountId: string) {
  return igApiClient.get<IgAdCampaign[]>(`/api/ads/${adAccountId}/campaigns`);
}

export function getAdSets(adAccountId: string) {
  return igApiClient.get<IgAdSet[]>(`/api/ads/${adAccountId}/adsets`);
}

export function getAds(adAccountId: string) {
  return igApiClient.get<IgAd[]>(`/api/ads/${adAccountId}/ads`);
}

/** Here `since` and `until` are yyyy-MM-dd strings, unlike account insights. */
export function getAdInsights(
  adAccountId: string,
  since: string,
  until: string
) {
  return igApiClient.get<IgAdInsight[]>(
    `/api/ads/${adAccountId}/insights${qs({ since, until })}`
  );
}

// ─── Hashtags — /api/hashtags ────────────────────────────────

export function searchHashtag(igUserId: string, q: string) {
  return igApiClient.get<IgHashtag>(
    `/api/hashtags/search${qs({ userId: igUserId, q })}`
  );
}

export function getHashtagTopMedia(
  hashtagId: string,
  igUserId: string,
  after?: string
) {
  return igApiClient.get<IgPagedResult<IgMedia>>(
    `/api/hashtags/${hashtagId}/top-media${qs({ userId: igUserId, after })}`
  );
}

export function getHashtagRecentMedia(
  hashtagId: string,
  igUserId: string,
  after?: string
) {
  return igApiClient.get<IgPagedResult<IgMedia>>(
    `/api/hashtags/${hashtagId}/recent-media${qs({ userId: igUserId, after })}`
  );
}

// ─── Business discovery — /api/business-discovery ────────────

export function discoverAccount(igUserId: string, username: string) {
  return igApiClient.get<IgUserProfile>(
    `/api/business-discovery/${igUserId}/discover${qs({ username })}`
  );
}

export function getDiscoveredAccountMedia(
  igUserId: string,
  username: string,
  after?: string
) {
  return igApiClient.get<IgPagedResult<IgMedia>>(
    `/api/business-discovery/${igUserId}/discover/media${qs({
      username,
      after,
    })}`
  );
}

// ─── Content publishing — /api/publishing ────────────────────

/** Step 1: create a media container. */
export function createMediaContainer(
  igUserId: string,
  request: IgPublishMediaRequest
) {
  return igApiClient.post<IgContainer>(
    `/api/publishing/${igUserId}/containers`,
    request as unknown as Record<string, unknown>
  );
}

/** Step 2: publish the container once its status reads "Finished". */
export function publishMedia(igUserId: string, containerId: string) {
  return igApiClient.post<IgPublishResult>(
    `/api/publishing/${igUserId}/publish/${containerId}`
  );
}

export function getContainerStatus(containerId: string) {
  return igApiClient.get<IgContainer>(
    `/api/publishing/containers/${containerId}/status`
  );
}

// ─── Product tags — /api/media/{id}/product-tags ─────────────

export function getProductTags(igMediaId: string) {
  return igApiClient.get<IgProductTag[]>(
    `/api/media/${igMediaId}/product-tags`
  );
}

/** Returns 204 No Content on success. */
export function postProductTags(
  igMediaId: string,
  request: IgPostProductTagsRequest
) {
  return igApiClient.post<void>(
    `/api/media/${igMediaId}/product-tags`,
    request as unknown as Record<string, unknown>
  );
}

/**
 * Returns 204 No Content on success. The product ids travel in the request
 * body rather than the query string, so this uses deleteWithBody.
 */
export function deleteProductTags(
  igMediaId: string,
  request: IgDeleteProductTagsRequest
) {
  return igApiClient.deleteWithBody<void>(
    `/api/media/${igMediaId}/product-tags`,
    request as unknown as Record<string, unknown>
  );
}

export function getProductAppeal(igMediaId: string) {
  return igApiClient.get<IgProductAppeal>(
    `/api/media/${igMediaId}/product-appeal`
  );
}

// ─── Webhooks — /api/webhooks ────────────────────────────────

/** Returns 204 No Content on success. */
export function subscribeWebhook(
  appId: string,
  request: IgSubscribeWebhookRequest
) {
  return igApiClient.post<void>(
    `/api/webhooks/${appId}/subscribe`,
    request as unknown as Record<string, unknown>
  );
}

export function getWebhookSubscriptions(appId: string) {
  return igApiClient.get<IgWebhookSubscription[]>(
    `/api/webhooks/${appId}/subscriptions`
  );
}

/** Returns 204 No Content on success. */
export function unsubscribeWebhook(appId: string) {
  return igApiClient.delete<void>(`/api/webhooks/${appId}/unsubscribe`);
}
