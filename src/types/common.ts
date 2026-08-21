/** Platform types */
export type Platform = "instagram" | "facebook" | "tiktok";

/** Metric card data */
export interface MetricData {
  title: string;
  value: string;
  change?: string;
  changeDirection?: "up" | "down";
  sparkData?: number[];
}

/** Chart data point */
export interface ChartDataPoint {
  label: string;
  [key: string]: string | number;
}

/** Time series data point */
export interface TimeSeriesPoint {
  date: string;
  value: number;
}

/** Comment from any platform */
export interface SocialComment {
  id: string;
  user: string;
  platform: Platform;
  comment: string;
  timestamp: string;
  postTitle?: string;
}

/** Scheduled post */
export interface ScheduledPost {
  id: string;
  title: string;
  platform: Platform;
  scheduledTime: string;
  type: ContentType;
  status: "scheduled" | "draft" | "published";
}

/** Content types */
export type ContentType = "image" | "video" | "reel" | "carousel" | "story";
