/**
 * Audience service — cross-platform audience signals.
 *
 * Facebook demographics (gender/age, city, country) and like-sources are NOT
 * available: Meta removed page_fans_gender_age, page_fans_city,
 * page_fans_country and page_fans_by_like_source at Graph API v25.0, and the
 * API dropped those endpoints rather than serving permanent 502s. What the
 * page can still report is follower churn and conversion actions.
 */

import * as fb from "./facebookService";
import type { PageFanChurnDto, PageCtaClicksDto } from "@/types/facebook";

export async function getFanChurn(
  pageId: string,
  startDate?: string,
  endDate?: string
): Promise<PageFanChurnDto | fb.MetricSeriesOf<PageFanChurnDto>> {
  return fb.getPageFanChurn(pageId, startDate, endDate);
}

export async function getCtaClicks(
  pageId: string,
  startDate?: string,
  endDate?: string
): Promise<PageCtaClicksDto | fb.MetricSeriesOf<PageCtaClicksDto>> {
  return fb.getPageCtaClicks(pageId, startDate, endDate);
}
