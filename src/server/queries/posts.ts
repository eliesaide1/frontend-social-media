import "server-only";

import { p, query, type QueryParam } from "@/lib/db";
import { requirePageRef } from "@/lib/tenancy";

/**
 * Post reads for the content library and the calendar.
 *
 * analytics.posts carries two columns the .NET API never exposes — is_published and
 * scheduled_publish_time — which is what makes a calendar possible from storage at
 * all: the API's /scheduled-posts asks Meta, so a month view would be a Graph call
 * per navigation.
 *
 * Metrics are joined from the latest post_metrics row rather than the whole series,
 * because a library row shows one current number per post, not a history.
 */

export interface ContentPost {
  postId: string;
  message: string | null;
  createdTime: string | null;
  type: string | null;
  fullPicture: string | null;
  permalinkUrl: string | null;
  sharesCount: number;
  isPublished: boolean;
  scheduledPublishTime: string | null;
  /** From the most recent analytics.post_metrics row; zeroes when never measured. */
  likes: number;
  reactionsTotal: number;
  comments: number;
  impressions: number;
  reach: number;
  engagedUsers: number;
  metricsDate: string | null;
}

export interface PostFilters {
  from?: string | null;
  to?: string | null;
  /** "published" | "scheduled" | "all" (default). */
  status?: "published" | "scheduled" | "all";
  type?: string | null;
  limit?: number;
}

/**
 * Posts with their latest metrics.
 *
 * The metrics join uses OUTER APPLY rather than a GROUP BY: each post needs the whole
 * newest row, and picking MAX per column independently would blend numbers from
 * different days into a row that never existed.
 */
export async function getContentPosts(
  pageId: string,
  accountId: string | null | undefined,
  filters: PostFilters = {}
): Promise<ContentPost[]> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000);

  const where: string[] = ["p.page_ref_id = @pageRef", "p.deleted_at IS NULL"];

  if (filters.status === "published") where.push("p.is_published = 1");
  if (filters.status === "scheduled")
    where.push("(p.is_published = 0 AND p.scheduled_publish_time IS NOT NULL)");
  if (filters.type) where.push("p.[type] = @type");

  // Scheduled posts are dated by when they WILL publish, so a window has to consider
  // whichever timestamp applies or the calendar loses them entirely.
  if (filters.from)
    where.push("COALESCE(p.scheduled_publish_time, p.created_time) >= @from");
  if (filters.to)
    where.push(
      "COALESCE(p.scheduled_publish_time, p.created_time) < DATEADD(DAY, 1, @to)"
    );

  const params: QueryParam[] = [
    p.uuid("pageRef", pageRefId),
    p.int("limit", limit),
  ];
  if (filters.from) params.push(p.date("from", filters.from));
  if (filters.to) params.push(p.date("to", filters.to));
  if (filters.type) params.push(p.str("type", filters.type));

  const rows = await query<{
    post_id: string;
    message: string | null;
    created_time: Date | null;
    type: string | null;
    full_picture: string | null;
    permalink_url: string | null;
    shares_count: number | null;
    is_published: boolean | null;
    scheduled_publish_time: Date | null;
    likes: number | null;
    reactions_total: number | null;
    comments: number | null;
    impressions: number | null;
    reach: number | null;
    engaged_users: number | null;
    metric_date: Date | null;
  }>(
    `
    SELECT TOP (@limit)
      p.post_id, p.message, p.created_time, p.[type], p.full_picture,
      p.permalink_url, p.shares_count, p.is_published, p.scheduled_publish_time,
      m.likes, m.reactions_total, m.comments, m.impressions, m.reach,
      m.engaged_users, m.metric_date
    FROM analytics.posts AS p
    OUTER APPLY (
      SELECT TOP 1 pm.likes, pm.reactions_total, pm.comments, pm.impressions,
                   pm.reach, pm.engaged_users, pm.metric_date
      FROM analytics.post_metrics AS pm
      WHERE pm.page_ref_id = p.page_ref_id AND pm.post_id = p.post_id
      ORDER BY pm.metric_date DESC
    ) AS m
    WHERE ${where.join(" AND ")}
    ORDER BY COALESCE(p.scheduled_publish_time, p.created_time) DESC;
    `,
    params,
    { label: "posts.list" }
  );

  return rows.map((r) => ({
    postId: r.post_id,
    message: r.message,
    createdTime: r.created_time ? r.created_time.toISOString() : null,
    type: r.type,
    fullPicture: r.full_picture,
    permalinkUrl: r.permalink_url,
    sharesCount: r.shares_count ?? 0,
    // Older rows predate the column and are null; anything ingested from the feed
    // was published, so null reads as true rather than hiding real posts.
    isPublished: r.is_published ?? true,
    scheduledPublishTime: r.scheduled_publish_time
      ? r.scheduled_publish_time.toISOString()
      : null,
    likes: r.likes ?? 0,
    reactionsTotal: r.reactions_total ?? 0,
    comments: r.comments ?? 0,
    impressions: r.impressions ?? 0,
    reach: r.reach ?? 0,
    engagedUsers: r.engaged_users ?? 0,
    metricsDate: r.metric_date ? r.metric_date.toISOString().slice(0, 10) : null,
  }));
}

export interface ContentSummary {
  total: number;
  published: number;
  scheduled: number;
  byType: { type: string; count: number }[];
}

export async function getContentSummary(
  pageId: string,
  accountId?: string | null
): Promise<ContentSummary> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const param: QueryParam[] = [p.uuid("pageRef", pageRefId)];

  const totals = await query<{
    total: number;
    published: number;
    scheduled: number;
  }>(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN ISNULL(is_published, 1) = 1 THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN is_published = 0 AND scheduled_publish_time IS NOT NULL
               THEN 1 ELSE 0 END) AS scheduled
    FROM analytics.posts
    WHERE page_ref_id = @pageRef AND deleted_at IS NULL;
    `,
    param,
    { label: "posts.summary.totals" }
  );

  const byType = await query<{ type: string | null; count: number }>(
    `
    SELECT ISNULL([type], N'unknown') AS [type], COUNT(*) AS [count]
    FROM analytics.posts
    WHERE page_ref_id = @pageRef AND deleted_at IS NULL
    GROUP BY ISNULL([type], N'unknown')
    ORDER BY [count] DESC;
    `,
    param,
    { label: "posts.summary.byType" }
  );

  return {
    total: totals[0]?.total ?? 0,
    published: totals[0]?.published ?? 0,
    scheduled: totals[0]?.scheduled ?? 0,
    byType: byType.map((r) => ({ type: r.type ?? "unknown", count: r.count })),
  };
}

/** Videos and photos, for the media side of the library. */
export interface MediaItem {
  id: string;
  title: string | null;
  description: string | null;
  createdTime: string | null;
  kind: "video" | "photo";
}

export async function getPageMedia(
  pageId: string,
  accountId: string | null | undefined,
  kind: "video" | "photo",
  limit = 200
): Promise<MediaItem[]> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const capped = Math.min(Math.max(limit, 1), 1000);

  // Two tables with different column names for the same shape; the projection is
  // chosen here rather than by interpolating identifiers into one query.
  const text =
    kind === "video"
      ? `SELECT TOP (@limit) video_id AS id, title, [description], created_time
         FROM analytics.page_videos WHERE page_ref_id = @pageRef
         ORDER BY created_time DESC;`
      : `SELECT TOP (@limit) photo_id AS id, [name] AS title, [link] AS [description], created_time
         FROM analytics.page_photos WHERE page_ref_id = @pageRef
         ORDER BY created_time DESC;`;

  const rows = await query<{
    id: string;
    title: string | null;
    description: string | null;
    created_time: Date | null;
  }>(text, [p.uuid("pageRef", pageRefId), p.int("limit", capped)], {
    label: `posts.media.${kind}`,
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    createdTime: r.created_time ? r.created_time.toISOString() : null,
    kind,
  }));
}
