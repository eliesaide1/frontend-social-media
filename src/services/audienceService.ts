/**
 * Audience service — cross-platform demographics.
 * Currently uses Facebook page demographics endpoint.
 */

import * as fb from "./facebookService";
import type {
  PageDemographicDto,
  PageFanChurnDto,
} from "@/types/facebook";

export async function getDemographics(
  pageId: string
): Promise<PageDemographicDto[]> {
  return fb.getPageDemographics(pageId);
}

export async function getFanChurn(
  pageId: string,
  startDate?: string,
  endDate?: string
): Promise<PageFanChurnDto> {
  return fb.getPageFanChurn(pageId, startDate, endDate);
}
