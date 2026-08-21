/**
 * Ads service — placeholder for Meta Ads API integration.
 * The Facebook Analytics API does not include ads endpoints.
 * This will be wired when the Meta Ads API is available.
 */

export interface AdsOverviewData {
  adSpend: number;
  paidReach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
}

export interface CampaignData {
  id: string;
  name: string;
  platform: string;
  spend: number;
  reach: number;
  clicks: number;
  ctr: number;
  status: "active" | "paused" | "completed";
}

// Placeholder — replace with real Meta Ads API calls

export async function getAdsOverview(
  _clientId: string,
  _dateRange?: string
): Promise<AdsOverviewData> {
  // TODO: Wire to real Meta Ads API
  throw new Error("Ads API not yet integrated");
}

export async function getCampaigns(
  _clientId: string
): Promise<CampaignData[]> {
  // TODO: Wire to real Meta Ads API
  throw new Error("Ads API not yet integrated");
}
