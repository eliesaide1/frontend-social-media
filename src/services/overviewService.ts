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
  const [followers, insights, pageMetrics] = await Promise.all([
    fb.getPageFollowers(pageId),
    fb.getPageInsights(pageId),
    fb.getPageMetricsHistory(pageId),
  ]);

  return { followers, insights, pageMetrics };
}
