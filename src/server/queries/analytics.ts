import "server-only";

import { assertSafeIdentifier, p, query, type QueryParam } from "@/lib/db";
import { requirePageRef } from "@/lib/tenancy";

/**
 * Page-level analytics from the daily warehouse tables.
 *
 * These are the metric families the dashboard either showed as mock data or could not
 * show at all, because the matching API endpoints are live Graph calls that return
 * only Meta's default two-day window unless ranged. Stored, they are a date-filtered
 * index seek.
 *
 * A caveat that belongs on screen, not just here: several of these are zero for
 * reasons that have nothing to do with the query. Ad-break earnings need a monetised
 * page, page_views_breakdown and demographics need permissions the token may not
 * carry, and impressions were deprecated by Meta. An empty chart here usually means
 * "never collected", not "nothing happened" — which is why every reader below also
 * reports whether any row exists at all.
 */

export interface DatedPoint {
  date: string;
  [metric: string]: string | number;
}

export interface MetricSeries {
  points: DatedPoint[];
  /** False when the table holds nothing for this page in any window. */
  everCollected: boolean;
}

interface RangeArgs {
  pageId: string;
  accountId?: string | null;
  from?: string | null;
  to?: string | null;
}

/**
 * The daily tables this module is allowed to read.
 *
 * Table and column names cannot be SQL parameters, so they are interpolated. They
 * come from the constants below and never from a request — but the allow-list makes
 * that a checked fact rather than a convention someone could break later.
 */
const DAILY_TABLES = [
  "analytics.page_daily_metrics",
  "analytics.page_reactions_daily",
  "analytics.page_story_metrics",
  "analytics.page_video_metrics",
  "analytics.page_views_breakdown",
  "analytics.page_cta_clicks",
  "analytics.page_ad_break_earnings",
] as const;

const COLUMN_PATTERN = /^[a-z_][a-z0-9_]*$/;

/** Shared shape: a daily table, scoped and date-filtered. */
async function readSeries(
  { pageId, accountId, from, to }: RangeArgs,
  table: (typeof DAILY_TABLES)[number],
  columns: string[]
): Promise<MetricSeries> {
  assertSafeIdentifier(table, DAILY_TABLES);
  for (const column of columns) {
    if (!COLUMN_PATTERN.test(column))
      throw new Error(`Refusing to interpolate column '${column}' into SQL.`);
  }

  const { pageRefId } = await requirePageRef(pageId, accountId);

  const where = ["page_ref_id = @pageRef"];
  const params: QueryParam[] = [p.uuid("pageRef", pageRefId)];
  if (from) {
    where.push("metric_date >= @from");
    params.push(p.date("from", from));
  }
  if (to) {
    where.push("metric_date <= @to");
    params.push(p.date("to", to));
  }

  const projection = columns.map((c) => `[${c}]`).join(", ");

  const rows = await query<Record<string, unknown>>(
    `SELECT metric_date, ${projection}
     FROM ${table}
     WHERE ${where.join(" AND ")}
     ORDER BY metric_date;`,
    params,
    { label: `analytics.${table}.series` }
  );

  // Asked separately so an empty chart can say WHY it is empty: no rows in this
  // window is a different problem from no rows ever.
  const any = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ${table} WHERE page_ref_id = @pageRef;`,
    [p.uuid("pageRef", pageRefId)],
    { label: `analytics.${table}.everCollected` }
  );

  const points = rows.map((r) => {
    const date = r.metric_date as Date;
    const point: DatedPoint = { date: date.toISOString().slice(0, 10) };
    for (const c of columns) point[c] = Number(r[c] ?? 0);
    return point;
  });

  return { points, everCollected: (any[0]?.n ?? 0) > 0 };
}

export const getPageDailyMetrics = (a: RangeArgs) =>
  readSeries(a, "analytics.page_daily_metrics", [
    "fan_count",
    "followers_count",
    "reach",
    "interest",
    "post_engagements",
    "fan_adds",
    "fan_adds_unique",
    "fan_removes",
    "fan_removes_unique",
  ]);

export const getPageReactionsDaily = (a: RangeArgs) =>
  readSeries(a, "analytics.page_reactions_daily", [
    "reactions_like",
    "reactions_love",
    "reactions_wow",
    "reactions_haha",
    "reactions_sorry",
    "reactions_angry",
    "reactions_total",
  ]);

export const getPageStoryMetrics = (a: RangeArgs) =>
  readSeries(a, "analytics.page_story_metrics", [
    "story_adds",
    "story_adds_unique",
    "action_fan",
    "action_mention",
    "action_page_post",
    "action_user_post",
    "action_checkin",
    "action_other",
  ]);

export const getPageVideoMetrics = (a: RangeArgs) =>
  readSeries(a, "analytics.page_video_metrics", [
    "video_views",
    "video_views_paid",
    "video_views_organic",
    "video_views_unique",
    "video_view_time_ms",
    "video_views_10s",
    "video_complete_views_30s",
  ]);

export const getPageViewsBreakdown = (a: RangeArgs) =>
  readSeries(a, "analytics.page_views_breakdown", [
    "total",
    "logged_in_total",
    "logged_in_unique",
    "logged_out",
    "external_referrals",
  ]);

export const getPageCtaClicks = (a: RangeArgs) =>
  readSeries(a, "analytics.page_cta_clicks", [
    "total_actions",
    "cta_clicks",
    "website_clicks",
    "phone_clicks",
    "directions_clicks",
  ]);

export const getPageAdBreakEarnings = (a: RangeArgs) =>
  readSeries(a, "analytics.page_ad_break_earnings", [
    "earnings",
    "ad_impressions",
    "cpm",
  ]);

/** The single most recent daily row — what a headline card shows. */
export interface PageSnapshot {
  metricDate: string | null;
  fanCount: number;
  followersCount: number;
  reach: number;
  pageViews: number;
  postEngagements: number;
  fanAdds: number;
  fanRemoves: number;
  /** Change against the previous stored day, when there is one. */
  followersDelta: number | null;
}

export async function getPageSnapshot(
  pageId: string,
  accountId?: string | null
): Promise<PageSnapshot | null> {
  const { pageRefId } = await requirePageRef(pageId, accountId);

  // The two most recent rows, with the day-over-day delta computed here. A window
  // function would need TOP 1 over an ordered set and reads far less obviously for
  // what is, at most, two rows.
  const rows = await query<{
    metric_date: Date;
    fan_count: number;
    followers_count: number;
    reach: number;
    interest: number;
    post_engagements: number;
    fan_adds: number;
    fan_removes: number;
  }>(
    `
    SELECT TOP 2
      metric_date, fan_count, followers_count, reach, interest,
      post_engagements, fan_adds, fan_removes
    FROM analytics.page_daily_metrics
    WHERE page_ref_id = @pageRef
    ORDER BY metric_date DESC;
    `,
    [p.uuid("pageRef", pageRefId)],
    { label: "analytics.pageSnapshot" }
  );

  const r = rows[0];
  const previous = rows[1] ?? null;
  if (!r) return null;

  return {
    metricDate: r.metric_date ? r.metric_date.toISOString().slice(0, 10) : null,
    fanCount: r.fan_count ?? 0,
    followersCount: r.followers_count ?? 0,
    reach: r.reach ?? 0,
    pageViews: r.interest ?? 0,
    postEngagements: r.post_engagements ?? 0,
    fanAdds: r.fan_adds ?? 0,
    fanRemoves: r.fan_removes ?? 0,
    followersDelta:
      previous == null ? null : (r.followers_count ?? 0) - (previous.followers_count ?? 0),
  };
}

/** Top posts by engagement in a window — the "what worked" table. */
export interface TopPost {
  postId: string;
  message: string | null;
  createdTime: string | null;
  permalinkUrl: string | null;
  fullPicture: string | null;
  reactionsTotal: number;
  comments: number;
  shares: number;
  engagement: number;
}

export async function getTopPosts(
  pageId: string,
  accountId: string | null | undefined,
  from?: string | null,
  to?: string | null,
  limit = 10
): Promise<TopPost[]> {
  const { pageRefId } = await requirePageRef(pageId, accountId);

  const where = ["p.page_ref_id = @pageRef", "p.deleted_at IS NULL"];
  const params: QueryParam[] = [
    p.uuid("pageRef", pageRefId),
    p.int("limit", Math.min(Math.max(limit, 1), 100)),
  ];
  if (from) {
    where.push("p.created_time >= @from");
    params.push(p.date("from", from));
  }
  if (to) {
    where.push("p.created_time < DATEADD(DAY, 1, @to)");
    params.push(p.date("to", to));
  }

  const rows = await query<{
    post_id: string;
    message: string | null;
    created_time: Date | null;
    permalink_url: string | null;
    full_picture: string | null;
    reactions_total: number | null;
    comments: number | null;
    shares: number | null;
  }>(
    `
    SELECT TOP (@limit)
      p.post_id, p.message, p.created_time, p.permalink_url, p.full_picture,
      m.reactions_total, m.comments, m.shares
    FROM analytics.posts AS p
    OUTER APPLY (
      SELECT TOP 1 pm.reactions_total, pm.comments, pm.shares
      FROM analytics.post_metrics AS pm
      WHERE pm.page_ref_id = p.page_ref_id AND pm.post_id = p.post_id
      ORDER BY pm.metric_date DESC
    ) AS m
    WHERE ${where.join(" AND ")}
    ORDER BY (ISNULL(m.reactions_total,0) + ISNULL(m.comments,0) + ISNULL(m.shares,0)) DESC,
             p.created_time DESC;
    `,
    params,
    { label: "analytics.topPosts" }
  );

  return rows.map((r) => {
    const reactions = r.reactions_total ?? 0;
    const comments = r.comments ?? 0;
    const shares = r.shares ?? 0;
    return {
      postId: r.post_id,
      message: r.message,
      createdTime: r.created_time ? r.created_time.toISOString() : null,
      permalinkUrl: r.permalink_url,
      fullPicture: r.full_picture,
      reactionsTotal: reactions,
      comments,
      shares,
      engagement: reactions + comments + shares,
    };
  });
}
