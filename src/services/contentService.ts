/**
 * Content service — cross-platform content management.
 * Uses Facebook warehouse for stored posts, will add Instagram later.
 */

import * as fb from "./facebookService";
import type { StoredPostDto, ScheduledPostDto } from "@/types/facebook";

/** Warehouse read — no Graph call, so it costs no Meta rate limit. */
export async function getAllContent(
  pageId: string,
  from?: string,
  to?: string,
  includeDeleted = false
): Promise<StoredPostDto[]> {
  return fb.getStoredPosts(pageId, from, to, includeDeleted);
}

export async function getScheduledContent(
  pageId: string
): Promise<ScheduledPostDto[]> {
  return fb.getScheduledPosts(pageId);
}
