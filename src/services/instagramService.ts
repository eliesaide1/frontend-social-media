/**
 * Instagram Analytics Service — placeholder.
 * Will be wired to real Instagram API endpoints when available.
 * The functions below define the expected interface.
 */

export interface InstagramOverviewData {
  followers: number;
  reach: number;
  impressions: number;
  interactions: number;
}

export interface InstagramEngagementData {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

// Placeholder — replace with real API calls when Instagram endpoints are available

export async function getInstagramOverview(
  _pageId: string,
  _dateRange?: string
): Promise<InstagramOverviewData> {
  // TODO: Wire to real Instagram API
  throw new Error("Instagram API not yet integrated");
}

export async function getInstagramEngagement(
  _pageId: string
): Promise<InstagramEngagementData> {
  // TODO: Wire to real Instagram API
  throw new Error("Instagram API not yet integrated");
}
