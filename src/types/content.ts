import { Platform, ContentType } from "./common";

export interface ContentItem {
  id: string;
  title: string;
  platform: Platform;
  type: ContentType;
  reach: number;
  likes: number;
  isPaid: boolean;
  spend?: number;
  publishedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  platform: Platform | "multi";
  type: ContentType;
  date: string;
  time: string;
  status: "scheduled" | "draft" | "published";
}

export interface CreatePostPayload {
  platforms: Platform[];
  contentType: ContentType;
  caption: string;
  publishOption: "now" | "schedule" | "draft";
  scheduledDate?: string;
  media?: File[];
}
