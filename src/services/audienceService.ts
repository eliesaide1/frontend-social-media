/**
 * Audience service — cross-platform demographics.
 * Currently uses Facebook page demographics endpoint.
 */

import * as fb from "./facebookService";
import type {
  PageDemographicDto,
  PageFanChurnPointDto,
} from "@/types/facebook";
import type { TimeSeriesResponse } from "@/types/api";

/**
 * NOT DEPLOYED — page-demographics returns 404 on the deployed API.
 * See getPageNegativeFeedback in facebookService for the full note.
 */
export async function getDemographics(
  pageId: string
): Promise<PageDemographicDto[]> {
  return fb.getPageDemographics(pageId);
}

/**
 * Fan churn arrives as one row per day, not a flat total, and startDate and
 * endDate are required — the API 502s without them.
 */
export async function getFanChurn(
  pageId: string,
  startDate?: string,
  endDate?: string
): Promise<TimeSeriesResponse<PageFanChurnPointDto>> {
  return fb.getPageFanChurn(pageId, startDate, endDate);
}
