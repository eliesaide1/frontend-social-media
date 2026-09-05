/**
 * Overview service — aggregates data from multiple platform services.
 * Currently uses Facebook API as the primary data source.
 * When Instagram/TikTok APIs are added, this will combine them.
 */

import { MetricData, ChartDataPoint } from "@/types";
import * as fb from "./facebookService";

export interface OverviewData {
  metrics: MetricData[];
  performanceChart: ChartDataPoint[];
  platformSplit: { name: string; value: number; color: string }[];
  topContent: { title: string; platform: string; reach: number }[];
  scheduledPosts: { title: string; platform: string; time: string }[];
  recentComments: { user: string; comment: string; time: string }[];
}

/**
 * Fetch overview data by combining Facebook API endpoints.
 * Future: will also combine Instagram + TikTok data.
 */
export async function getOverviewData(
  pageId: string,
  startDate?: string,
  endDate?: string
) {
  // allSettled, not all: insights depends on metrics Meta has deprecated and
  // can 502 on its own, which should not blank the follower count beside it.
  const [followersRes, insightsRes, historyRes] = await Promise.allSettled([
    fb.getPageFollowers(pageId),
    // Both dates or neither — a half-range silently changes the response shape.
    startDate && endDate
      ? fb.getPageInsights(pageId, startDate, endDate)
      : fb.getPageInsights(pageId),
    fb.getPageMetricsHistory(pageId, startDate, endDate),
  ]);

  return {
    followers: followersRes.status === "fulfilled" ? followersRes.value : null,
    insights: insightsRes.status === "fulfilled" ? insightsRes.value : null,
    pageMetrics: historyRes.status === "fulfilled" ? historyRes.value : null,
  };
}
