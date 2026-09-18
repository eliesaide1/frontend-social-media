import "server-only";

import { p, query, type QueryParam } from "@/lib/db";
import { requirePageRef } from "@/lib/tenancy";

/**
 * Comment reads, straight from analytics.post_comments.
 *
 * The .NET API's /post-comments calls Meta per post, so a moderation queue spanning
 * a page's recent posts would be one Graph round trip per row. These are stored by
 * the webhook the moment a comment lands, so the same view is a single indexed read.
 *
 * Moderation itself — reply, hide, delete — is NOT here. Those have to reach
 * Facebook, so they go through the API. Writing a hide straight to SQL would grey
 * the row out in the dashboard while the comment stayed visible to the public.
 */

export interface CommentRow {
  commentId: string;
  postId: string;
  parentCommentId: string | null;
  message: string | null;
  fromName: string | null;
  fromId: string | null;
  createdTime: string | null;
  likeCount: number;
  isHidden: boolean;
  isFromPage: boolean;
  /** True when nobody from the page has replied beneath it yet. */
  awaitingReply: boolean;
  postMessage: string | null;
  postPermalink: string | null;
}

export interface CommentFilters {
  from?: string | null;
  to?: string | null;
  /** Exclude comments the page itself wrote — usually what a reply queue wants. */
  excludeOwn?: boolean;
  hidden?: boolean | null;
  /** Only top-level comments with no reply from the page. */
  awaitingReplyOnly?: boolean;
  limit?: number;
}

const MAX_ROWS = 1000;

/**
 * A page's comments, newest first, with the parent post for context.
 *
 * `awaitingReply` is computed in SQL rather than by fetching everything and pairing
 * up in JS: the reply lives in the same table, and a LEFT JOIN against the distinct
 * set of replied-to ids is one pass instead of N.
 */
export async function getPageComments(
  pageId: string,
  accountId: string | null | undefined,
  filters: CommentFilters = {}
): Promise<CommentRow[]> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), MAX_ROWS);

  const where: string[] = [
    "c.page_ref_id = @pageRef",
    // Soft-deleted comments are kept for history but must never reach a queue.
    "c.deleted_at IS NULL",
  ];
  const params: QueryParam[] = [
    p.uuid("pageRef", pageRefId),
    p.int("limit", limit),
  ];

  if (filters.from) {
    where.push("c.created_time >= @from");
    params.push(p.date("from", filters.from));
  }
  if (filters.to) {
    where.push("c.created_time < DATEADD(DAY, 1, @to)");
    params.push(p.date("to", filters.to));
  }
  if (filters.excludeOwn) where.push("c.is_from_page = 0");
  if (filters.hidden === true) where.push("c.is_hidden = 1");
  if (filters.hidden === false) where.push("c.is_hidden = 0");
  if (filters.awaitingReplyOnly)
    where.push("c.is_from_page = 0 AND c.parent_comment_id IS NULL AND r.parent_comment_id IS NULL");

  const rows = await query<{
    comment_id: string;
    post_id: string;
    parent_comment_id: string | null;
    message: string | null;
    from_name: string | null;
    from_id: string | null;
    created_time: Date | null;
    like_count: number | null;
    is_hidden: boolean | null;
    is_from_page: boolean | null;
    replied: string | null;
    post_message: string | null;
    permalink_url: string | null;
  }>(
    `
    SELECT TOP (@limit)
      c.comment_id, c.post_id, c.parent_comment_id, c.message,
      c.from_name, c.from_id, c.created_time, c.like_count,
      c.is_hidden, c.is_from_page,
      r.parent_comment_id AS replied,
      pst.message AS post_message, pst.permalink_url
    FROM analytics.post_comments AS c
    LEFT JOIN (
      SELECT DISTINCT parent_comment_id
      FROM analytics.post_comments
      WHERE page_ref_id = @pageRef
        AND is_from_page = 1
        AND deleted_at IS NULL
        AND parent_comment_id IS NOT NULL
    ) AS r ON r.parent_comment_id = c.comment_id
    LEFT JOIN analytics.posts AS pst
      ON pst.page_ref_id = c.page_ref_id AND pst.post_id = c.post_id
    WHERE ${where.join(" AND ")}
    ORDER BY c.created_time DESC;
    `,
    params,
    { label: "comments.list" }
  );

  return rows.map((r) => ({
    commentId: r.comment_id,
    postId: r.post_id,
    parentCommentId: r.parent_comment_id,
    message: r.message,
    fromName: r.from_name,
    fromId: r.from_id,
    createdTime: r.created_time ? r.created_time.toISOString() : null,
    likeCount: r.like_count ?? 0,
    isHidden: Boolean(r.is_hidden),
    isFromPage: Boolean(r.is_from_page),
    awaitingReply:
      !r.is_from_page && r.parent_comment_id === null && r.replied === null,
    postMessage: r.post_message,
    postPermalink: r.permalink_url,
  }));
}

export interface CommentSummary {
  total: number;
  hidden: number;
  fromPage: number;
  awaitingReply: number;
}

/**
 * Counts for the header cards.
 *
 * "Awaiting reply" is a top-level comment from someone else with no reply from the
 * page beneath it — the question a moderation queue actually answers, and not
 * derivable from a plain comment count.
 *
 * The replied-to set is a LEFT JOIN, not a correlated NOT EXISTS inside SUM:
 * SQL Server rejects that outright with "Cannot perform an aggregate function on an
 * expression containing an aggregate or a subquery".
 */
export async function getCommentSummary(
  pageId: string,
  accountId?: string | null
): Promise<CommentSummary> {
  const { pageRefId } = await requirePageRef(pageId, accountId);

  const rows = await query<{
    total: number;
    hidden: number;
    from_page: number;
    awaiting: number;
  }>(
    `
    SELECT
      COUNT(*)                                            AS total,
      SUM(CASE WHEN c.is_hidden = 1 THEN 1 ELSE 0 END)    AS hidden,
      SUM(CASE WHEN c.is_from_page = 1 THEN 1 ELSE 0 END) AS from_page,
      SUM(CASE
            WHEN c.is_from_page = 0
             AND c.parent_comment_id IS NULL
             AND r.parent_comment_id IS NULL
            THEN 1 ELSE 0 END)                            AS awaiting
    FROM analytics.post_comments AS c
    LEFT JOIN (
      SELECT DISTINCT parent_comment_id
      FROM analytics.post_comments
      WHERE page_ref_id = @pageRef
        AND is_from_page = 1
        AND deleted_at IS NULL
        AND parent_comment_id IS NOT NULL
    ) AS r ON r.parent_comment_id = c.comment_id
    WHERE c.page_ref_id = @pageRef AND c.deleted_at IS NULL;
    `,
    [p.uuid("pageRef", pageRefId)],
    { label: "comments.summary" }
  );

  const r = rows[0];
  return {
    total: r?.total ?? 0,
    hidden: r?.hidden ?? 0,
    fromPage: r?.from_page ?? 0,
    awaitingReply: r?.awaiting ?? 0,
  };
}
