import { Platform } from "./common";

export interface AdsOverview {
  adSpend: number;
  paidReach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: string;
  spend: number;
  reach: number;
  clicks: number;
  ctr: number;
  status: "active" | "paused" | "completed";
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  budget: number;
  spend: number;
  reach: number;
  clicks: number;
  ctr: number;
}
