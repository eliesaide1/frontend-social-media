import { TimeSeriesPoint } from "./common";

export interface InstagramOverview {
  followers: number;
  reach: number;
  impressions: number;
  interactions: number;
}

export interface InstagramEngagement {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface InstagramPerformance {
  timeSeries: TimeSeriesPoint[];
  engagement: InstagramEngagement;
}

export interface InstagramContent {
  id: string;
  title: string;
  type: "image" | "video" | "reel" | "carousel" | "story";
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  publishedAt: string;
}

export interface InstagramAudience {
  ageGroups: { range: string; percentage: number }[];
  genderSplit: { male: number; female: number; other: number };
  topCities: { city: string; percentage: number }[];
  topCountries: { country: string; percentage: number }[];
}
