import "server-only";

import { p, query } from "@/lib/db";
import { requirePageRef } from "@/lib/tenancy";
import type {
  PostAttachmentDto,
  PostCommentDto,
  PostEngagementDto,
  PostLikesDto,
  PostMetricPointDto,
  PostReactionsDto,
  PostVideoMetricsDto,
  TimeSeriesResponse,
} from "@/types/facebook";

/**
 * Everything the post detail modal shows, read from the warehouse.
 *
 * The modal used to spend roughly ten Graph calls every time it opened. The API now
 * stores every one of those answers, and nightly ingestion fetches them for each
 * post it covers, so opening a post is five indexed reads instead.
 *
 * The shapes are the DTOs facebookService returns, so the modal renders them
 * unchanged. Each field is null (or empty) when nothing has been stored yet,
 * never a fabricated zero; the modal already renders "no data" for those.
 *
 * NOT STORED: engagement's clicksByType. The API saves the clicks and activity
 * totals but not the per-type breakdown, so it comes back empty here.
 */
export interface PostDetail {
  likes: PostLikesDto | null;
  reactions: PostReactionsDto | null;
  engagement: PostEngagementDto | null;
  comments: PostCommentDto[];
  attachments: PostAttachmentDto[];
  video: PostVideoMetricsDto | null;
  history: TimeSeriesResponse<PostMetricPointDto> | null;
  /** Date of the newest stored metrics row, so the modal can say how current it is. */
  metricsDate: string | null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function getPostDetail(
  pageId: string,
  postId: string,
  accountId?: string | null
): Promise<PostDetail> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const params = [p.uuid("pageRef", pageRefId), p.str("postId", postId)];

  // Independent reads; one connection pool serves them concurrently.
  const [metricRows, commentRows, attachmentRows, videoRows] = await Promise.all([
    query<{
      metric_date: Date;
      impressions: number;
      reach: number;
      engaged_users: number | null;
      likes: number;
      reactions_like: number;
      reactions_love: number;
      reactions_wow: number;
      reactions_haha: number;
      reactions_sad: number;
      reactions_angry: number;
      reactions_total: number | null;
      comments: number;
      shares: number;
      clicks: number | null;
      activity: number | null;
    }>(
      `SELECT metric_date, impressions, reach, engaged_users, likes,
              reactions_like, reactions_love, reactions_wow, reactions_haha,
              reactions_sad, reactions_angry, reactions_total, comments, shares,
              clicks, activity
       FROM analytics.post_metrics
       WHERE page_ref_id = @pageRef AND post_id = @postId
       ORDER BY metric_date;`,
      params,
      { label: "fb.postDetail.metrics" }
    ),

    // Top-level comments only, matching what post-comments returns; replies live
    // in the same table under a parent id. Deleted ones are kept for history but
    // are gone from Facebook, so they are not shown.
    query<{
      comment_id: string;
      message: string | null;
      from_name: string | null;
      created_time: Date | null;
    }>(
      `SELECT comment_id, message, from_name, created_time
       FROM analytics.post_comments
       WHERE page_ref_id = @pageRef AND post_id = @postId
         AND parent_comment_id IS NULL AND deleted_at IS NULL
       ORDER BY created_time DESC;`,
      params,
      { label: "fb.postDetail.comments" }
    ),

    query<{
      type: string | null;
      title: string | null;
      url: string | null;
      description: string | null;
    }>(
      `SELECT [type], title, url, [description]
       FROM analytics.post_attachments
       WHERE page_ref_id = @pageRef AND post_id = @postId
       ORDER BY ordinal;`,
      params,
      { label: "fb.postDetail.attachments" }
    ),

    query<{
      views: number;
      views_paid: number;
      views_organic: number;
      views_sound_on: number;
      view_time_ms: number | string;
      avg_time_watched_ms: number | string;
      length_ms: number | string;
      completion_rate: number | null;
    }>(
      `SELECT TOP 1 views, views_paid, views_organic, views_sound_on, view_time_ms,
              avg_time_watched_ms, length_ms, completion_rate
       FROM analytics.post_video_metrics
       WHERE page_ref_id = @pageRef AND post_id = @postId
       ORDER BY metric_date DESC;`,
      params,
      { label: "fb.postDetail.video" }
    ),
  ]);

  const latest = metricRows.at(-1) ?? null;

  // Engagement comes from the newest row that actually measured it. Rows written by
  // likes or reactions alone leave these columns NULL.
  const engaged = [...metricRows]
    .reverse()
    .find((r) => r.clicks !== null || r.activity !== null);

  const v = videoRows[0];

  return {
    likes: latest ? { postId, likes: latest.likes } : null,
    reactions: latest
      ? {
          like: latest.reactions_like,
          love: latest.reactions_love,
          wow: latest.reactions_wow,
          haha: latest.reactions_haha,
          sad: latest.reactions_sad,
          angry: latest.reactions_angry,
          total:
            latest.reactions_total ??
            latest.reactions_like +
              latest.reactions_love +
              latest.reactions_wow +
              latest.reactions_haha +
              latest.reactions_sad +
              latest.reactions_angry,
        }
      : null,
    engagement: engaged
      ? { clicks: engaged.clicks ?? 0, activity: engaged.activity ?? 0, clicksByType: {} }
      : null,
    comments: commentRows.map((c) => ({
      id: c.comment_id,
      message: c.message ?? "",
      fromName: c.from_name ?? "",
      createdTime: c.created_time ? c.created_time.toISOString() : "",
    })),
    attachments: attachmentRows.map((a) => ({
      type: a.type ?? "",
      title: a.title ?? "",
      url: a.url ?? "",
      description: a.description ?? "",
    })),
    // bigint columns arrive from the driver as strings.
    video: v
      ? {
          views: v.views,
          viewsPaid: v.views_paid,
          viewsOrganic: v.views_organic,
          viewsSoundOn: v.views_sound_on,
          viewTimeMs: Number(v.view_time_ms),
          avgTimeWatchedMs: Number(v.avg_time_watched_ms),
          lengthMs: Number(v.length_ms),
          completionRate: v.completion_rate === null ? null : Number(v.completion_rate),
        }
      : null,
    history: metricRows.length
      ? {
          id: postId,
          from: null,
          to: null,
          pointCount: metricRows.length,
          points: metricRows.map((r) => ({
            date: day(r.metric_date),
            impressions: r.impressions,
            reach: r.reach,
            engagedUsers: r.engaged_users ?? 0,
            clicks: r.clicks ?? 0,
            likes: r.likes,
            reactionsLike: r.reactions_like,
            reactionsLove: r.reactions_love,
            reactionsWow: r.reactions_wow,
            reactionsHaha: r.reactions_haha,
            reactionsSad: r.reactions_sad,
            reactionsAngry: r.reactions_angry,
            comments: r.comments,
            shares: r.shares,
          })),
        }
      : null,
    metricsDate: latest ? day(latest.metric_date) : null,
  };
}
