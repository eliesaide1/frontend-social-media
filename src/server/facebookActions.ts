"use server";

/**
 * Server Actions for the /facebook page.
 *
 * The page is a client component, so it cannot import the query modules directly —
 * they are `server-only`. These are the thin bridge: same names and same return
 * types as the equivalent facebookService functions, so the page's fetchers change
 * their import and nothing else.
 *
 * Reads only. Publishing, moderation and account linking stay on fbApiClient,
 * because they have to reach Meta.
 */

import {
  getPageCtaClicksSeries as _cta,
  getPageFanChurnSeries as _churn,
  getPageFollowers as _followers,
  getPageInsightsSeries as _insights,
  getPageMetricsHistory as _history,
  getPageReactionsDailySeries as _reactions,
  getPageVideoMetricsSeries as _videoMetrics,
  getPageVideos as _videos,
  getStoredPosts as _storedPosts,
} from "@/server/queries/facebookPage";
import { getPostDetail as _postDetail, type PostDetail } from "@/server/queries/postDetail";
import { getBusinessesWithPages as _businesses } from "@/server/queries/registry";

import type {
  BusinessWithPagesDto,
  PageCtaClicksSeries,
  PageFanChurnSeries,
  PageFollowersDto,
  PageInsightsSeries,
  PageMetricPointDto,
  PageReactionsDailySeries,
  PageVideoDto,
  PageVideoMetricsSeries,
  StoredPostDto,
  TimeSeriesResponse,
} from "@/types/facebook";

/**
 * A SQL failure must surface as a failure, not as an empty chart.
 *
 * The page uses Promise.allSettled and shows a per-card message on rejection, so a
 * thrown error lands in the right place; swallowing it and returning empty points
 * would render as "no activity", which is a different and wrong claim.
 */
function rethrow(context: string, err: unknown): never {
  throw new Error(`${context}: ${err instanceof Error ? err.message : String(err)}`);
}

export async function sqlPageInsights(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null
): Promise<PageInsightsSeries> {
  try {
    return await _insights({ pageId, accountId, from, to });
  } catch (err) {
    rethrow("Page insights unavailable", err);
  }
}

export async function sqlPageFollowers(
  pageId: string,
  accountId: string | null
): Promise<PageFollowersDto> {
  try {
    return await _followers(pageId, accountId);
  } catch (err) {
    rethrow("Follower counts unavailable", err);
  }
}

export async function sqlPageVideoMetrics(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null
): Promise<PageVideoMetricsSeries> {
  try {
    return await _videoMetrics({ pageId, accountId, from, to });
  } catch (err) {
    rethrow("Video metrics unavailable", err);
  }
}

export async function sqlPageReactionsDaily(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null
): Promise<PageReactionsDailySeries> {
  try {
    return await _reactions({ pageId, accountId, from, to });
  } catch (err) {
    rethrow("Daily reactions unavailable", err);
  }
}

export async function sqlPageFanChurn(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null
): Promise<PageFanChurnSeries> {
  try {
    return await _churn({ pageId, accountId, from, to });
  } catch (err) {
    rethrow("Follower churn unavailable", err);
  }
}

export async function sqlPageCtaClicks(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null
): Promise<PageCtaClicksSeries> {
  try {
    return await _cta({ pageId, accountId, from, to });
  } catch (err) {
    rethrow("CTA clicks unavailable", err);
  }
}

export async function sqlPageMetricsHistory(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null
): Promise<TimeSeriesResponse<PageMetricPointDto>> {
  try {
    return await _history({ pageId, accountId, from, to });
  } catch (err) {
    rethrow("Page metrics history unavailable", err);
  }
}

export async function sqlStoredPosts(
  pageId: string,
  accountId: string | null,
  from?: string | null,
  to?: string | null
): Promise<StoredPostDto[]> {
  try {
    return await _storedPosts({ pageId, accountId, from, to });
  } catch (err) {
    rethrow("Posts unavailable", err);
  }
}

export async function sqlPageVideos(
  pageId: string,
  accountId: string | null
): Promise<PageVideoDto[]> {
  try {
    return await _videos(pageId, accountId);
  } catch (err) {
    rethrow("Videos unavailable", err);
  }
}

export async function sqlPostDetail(
  pageId: string,
  postId: string,
  accountId: string | null
): Promise<PostDetail> {
  try {
    return await _postDetail(pageId, postId, accountId);
  } catch (err) {
    rethrow("Post metrics unavailable", err);
  }
}

export async function sqlBusinessesWithPages(
  accountId: string | null
): Promise<BusinessWithPagesDto[]> {
  try {
    return await _businesses(accountId);
  } catch (err) {
    rethrow("Page list unavailable", err);
  }
}
