/**
 * Content service — cross-platform content management.
 * Uses Facebook warehouse for stored posts, will add Instagram later.
 */

import * as fb from "./facebookService";
import type { StoredPostDto, ScheduledPostDto } from "@/types/facebook";

export async function getAllContent(
  pageId: string,
  from?: string,
  to?: string
): Promise<StoredPostDto[]> {
  return fb.getStoredPosts(pageId, from, to);
}

export async function getScheduledContent(
  pageId: string
): Promise<ScheduledPostDto[]> {
  return fb.getScheduledPosts(pageId);
}
