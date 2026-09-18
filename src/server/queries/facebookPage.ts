import "server-only";

import { p, query, type QueryParam } from "@/lib/db";
import { requirePageRef } from "@/lib/tenancy";
import type {
  PageCtaClicksSeries,
  PageFanChurnSeries,
  PageFollowersDto,
  PageInsightsSeries,
  PageMetricPointDto,
  PageReactionsDailySeries,
  PageVideoDto,
  PageVideoMetricsSeries,
  StoredPostDto,
  TimeSeriesResponse,
} from "@/types/facebook";

/**
 * SQL-backed replacements for the /facebook page's data.
 *
 * These deliberately return the EXACT DTO shapes facebookService returns, rather
 * than a shape that suits the tables. The page already renders these types — charts,
 * metric cards, the posts table — so matching them means swapping where the data
 * comes from without touching a single component. A tidier shape here would mean
 * rewriting four tabs of presentation code to gain nothing.
 *
 * Every read is one indexed seek against the warehouse instead of a live Graph call
 * that costs roughly a second and consumes rate limit.
 *
 * WHAT DOES NOT MOVE
 * These are all historical reads. Anything needing Meta directly — publishing,
 * moderation, a figure newer than the last ingestion — stays on the .NET API.
 */

/** Wraps daily rows in the envelope the ranged endpoints return. */
function toSeries<T>(
  pageId: string,
  from: string | null | undefined,
  to: string | null | undefined,
  points: { date: string; metrics: T }[]
): TimeSeriesResponse<{ date: string; metrics: T }> {
  return {
    id: pageId,
    // Echoes what was REQUESTED, not the first/last row returned — the API
    // documents this, and a chart axis that silently narrowed to the data it
    // happened to find would hide the gap it is meant to reveal.
    from: from ?? null,
    to: to ?? null,
    pointCount: points.length,
    points,
  };
}

interface Range {
  pageId: string;
  accountId?: string | null;
  from?: string | null;
  to?: string | null;
}

function rangeParams(pageRefId: string, from?: string | null, to?: string | null) {
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
  return { where: where.join(" AND "), params };
}

const day = (d: Date) => d.toISOString().slice(0, 10);

// ── page insights (pageViews + postEngagements) ─────────────────────────────

export async function getPageInsightsSeries({
  pageId,
  accountId,
  from,
  to,
}: Range): Promise<PageInsightsSeries> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const { where, params } = rangeParams(pageRefId, from, to);

  const rows = await query<{
    metric_date: Date;
    interest: number | null;
    post_engagements: number | null;
  }>(
    // Rows written by the followers endpoint alone carry no activity figures; they
    // are skipped rather than charted as a day with zero page views.
    `SELECT metric_date, interest, post_engagements
     FROM analytics.page_daily_metrics
     WHERE ${where}
       AND (interest IS NOT NULL OR post_engagements IS NOT NULL)
     ORDER BY metric_date;`,
    params,
    { label: "fb.pageInsightsSeries" }
  );

  return toSeries(
    pageId,
    from,
    to,
    rows.map((r) => ({
      date: day(r.metric_date),
      // `interest` is page_views_total, renamed in the warehouse for BI clarity.
      metrics: {
        pageViews: r.interest ?? 0,
        postEngagements: r.post_engagements ?? 0,
      },
    }))
  );
}

// ── followers ───────────────────────────────────────────────────────────────

export async function getPageFollowers(
  pageId: string,
  accountId?: string | null
): Promise<PageFollowersDto> {
  const { pageRefId } = await requirePageRef(pageId, accountId);

  // The latest row that MEASURED followers — not simply the latest row. Backfilled
  // days and activity-only rows have no follower count, and reading one of those as
  // "current followers" would show zero.
  const rows = await query<{ fan_count: number | null; followers_count: number | null }>(
    `SELECT TOP 1 fan_count, followers_count
     FROM analytics.page_daily_metrics
     WHERE page_ref_id = @pageRef AND followers_count IS NOT NULL
     ORDER BY metric_date DESC;`,
    [p.uuid("pageRef", pageRefId)],
    { label: "fb.pageFollowers" }
  );

  const r = rows[0];
  return {
    followersCount: r?.followers_count ?? 0,
    fanCount: r?.fan_count ?? 0,
  };
}

// ── video metrics ───────────────────────────────────────────────────────────

export async function getPageVideoMetricsSeries({
  pageId,
  accountId,
  from,
  to,
}: Range): Promise<PageVideoMetricsSeries> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const { where, params } = rangeParams(pageRefId, from, to);

  const rows = await query<{
    metric_date: Date;
    video_views: number;
    video_views_paid: number;
    video_views_organic: number;
    video_view_time_ms: number;
    video_complete_views_30s: number;
  }>(
    `SELECT metric_date, video_views, video_views_paid, video_views_organic,
            video_view_time_ms, video_complete_views_30s
     FROM analytics.page_video_metrics
     WHERE ${where}
     ORDER BY metric_date;`,
    params,
    { label: "fb.pageVideoMetricsSeries" }
  );

  return toSeries(
    pageId,
    from,
    to,
    rows.map((r) => ({
      date: day(r.metric_date),
      metrics: {
        videoViews: r.video_views ?? 0,
        videoViewsPaid: r.video_views_paid ?? 0,
        videoViewsOrganic: r.video_views_organic ?? 0,
        // bigint in SQL; the driver hands back a JS number, which is exact up to
        // 2^53 — far beyond any plausible watch-time in milliseconds.
        videoViewTimeMs: Number(r.video_view_time_ms ?? 0),
        videoCompleteViews30s: r.video_complete_views_30s ?? 0,
      },
    }))
  );
}

// ── reactions ───────────────────────────────────────────────────────────────

export async function getPageReactionsDailySeries({
  pageId,
  accountId,
  from,
  to,
}: Range): Promise<PageReactionsDailySeries> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const { where, params } = rangeParams(pageRefId, from, to);

  const rows = await query<{
    metric_date: Date;
    reactions_like: number;
    reactions_love: number;
    reactions_wow: number;
    reactions_haha: number;
    reactions_sorry: number;
    reactions_angry: number;
    reactions_total: number;
  }>(
    `SELECT metric_date, reactions_like, reactions_love, reactions_wow,
            reactions_haha, reactions_sorry, reactions_angry, reactions_total
     FROM analytics.page_reactions_daily
     WHERE ${where}
     ORDER BY metric_date;`,
    params,
    { label: "fb.pageReactionsDailySeries" }
  );

  return toSeries(
    pageId,
    from,
    to,
    rows.map((r) => ({
      date: day(r.metric_date),
      metrics: {
        reactionsLike: r.reactions_like ?? 0,
        reactionsLove: r.reactions_love ?? 0,
        reactionsWow: r.reactions_wow ?? 0,
        reactionsHaha: r.reactions_haha ?? 0,
        reactionsSorry: r.reactions_sorry ?? 0,
        reactionsAngry: r.reactions_angry ?? 0,
        reactionsTotal: r.reactions_total ?? 0,
      },
    }))
  );
}

// ── follower churn ──────────────────────────────────────────────────────────

export async function getPageFanChurnSeries({
  pageId,
  accountId,
  from,
  to,
}: Range): Promise<PageFanChurnSeries> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const { where, params } = rangeParams(pageRefId, from, to);

  const rows = await query<{
    metric_date: Date;
    fan_adds: number | null;
    fan_adds_unique: number | null;
    fan_removes: number | null;
    fan_removes_unique: number | null;
  }>(
    `SELECT metric_date, fan_adds, fan_adds_unique, fan_removes, fan_removes_unique
     FROM analytics.page_daily_metrics
     WHERE ${where}
       AND (fan_adds IS NOT NULL OR fan_removes IS NOT NULL)
     ORDER BY metric_date;`,
    params,
    { label: "fb.pageFanChurnSeries" }
  );

  return toSeries(
    pageId,
    from,
    to,
    rows.map((r) => {
      const adds = r.fan_adds ?? 0;
      const removes = r.fan_removes ?? 0;
      return {
        date: day(r.metric_date),
        metrics: {
          fanAdds: adds,
          fanAddsUnique: r.fan_adds_unique ?? 0,
          fanRemoves: removes,
          fanRemovesUnique: r.fan_removes_unique ?? 0,
          netChange: adds - removes,
          // 0/0 is not a ratio. The API returns a number here, so a day with no
          // gains reports 0 rather than NaN, which would render as "NaN" on screen.
          churnRatio: adds > 0 ? removes / adds : 0,
        },
      };
    })
  );
}

// ── CTA clicks ──────────────────────────────────────────────────────────────

export async function getPageCtaClicksSeries({
  pageId,
  accountId,
  from,
  to,
}: Range): Promise<PageCtaClicksSeries> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const { where, params } = rangeParams(pageRefId, from, to);

  const rows = await query<{ metric_date: Date; total_actions: number }>(
    `SELECT metric_date, total_actions
     FROM analytics.page_cta_clicks
     WHERE ${where}
     ORDER BY metric_date;`,
    params,
    { label: "fb.pageCtaClicksSeries" }
  );

  return toSeries(
    pageId,
    from,
    to,
    rows.map((r) => ({
      date: day(r.metric_date),
      metrics: { totalActions: r.total_actions ?? 0 },
    }))
  );
}

// ── page metrics history ────────────────────────────────────────────────────

/**
 * Unlike the ranged families above, this one's points are FLAT — no `metrics`
 * nesting — because that is the shape /api/warehouse/page-metrics-history returns
 * and what the chart already reads.
 */
export async function getPageMetricsHistory({
  pageId,
  accountId,
  from,
  to,
}: Range): Promise<TimeSeriesResponse<PageMetricPointDto>> {
  const { pageRefId } = await requirePageRef(pageId, accountId);
  const { where, params } = rangeParams(pageRefId, from, to);

  const rows = await query<{
    metric_date: Date;
    fan_count: number | null;
    followers_count: number | null;
    reach: number | null;
    interest: number | null;
    post_engagements: number | null;
  }>(
    `SELECT metric_date, fan_count, followers_count, reach, interest, post_engagements
     FROM analytics.page_daily_metrics
     WHERE ${where}
     ORDER BY metric_date;`,
    params,
    { label: "fb.pageMetricsHistory" }
  );

  // NULL stays NULL: a day nobody measured is a gap in the chart, not a day on which
  // the page had zero followers. followersDelta is derived on read and is null
  // whenever either side of the comparison was not measured.
  let previousFollowers: number | null = null;
  const points: PageMetricPointDto[] = rows.map((r) => {
    const followers = r.followers_count;
    const delta =
      followers != null && previousFollowers != null ? followers - previousFollowers : null;
    if (followers != null) previousFollowers = followers;
    return {
      date: day(r.metric_date),
      fanCount: r.fan_count,
      followersCount: followers,
      reach: r.reach,
      interest: r.interest,
      postEngagements: r.post_engagements,
      followersDelta: delta,
    };
  });

  return {
    id: pageId,
    from: from ?? null,
    to: to ?? null,
    pointCount: points.length,
    points,
  };
}

// ── stored posts ────────────────────────────────────────────────────────────

export async function getStoredPosts({
  pageId,
  accountId,
  from,
  to,
  includeDeleted = false,
}: Range & { includeDeleted?: boolean }): Promise<StoredPostDto[]> {
  const { pageRefId } = await requirePageRef(pageId, accountId);

  const where = ["p.page_ref_id = @pageRef"];
  const params: QueryParam[] = [p.uuid("pageRef", pageRefId)];
  if (!includeDeleted) where.push("p.deleted_at IS NULL");
  if (from) {
    where.push("CAST(p.created_time AS DATE) >= @from");
    params.push(p.date("from", from));
  }
  if (to) {
    where.push("CAST(p.created_time AS DATE) <= @to");
    params.push(p.date("to", to));
  }

  const rows = await query<{
    post_id: string;
    page_id: string;
    page_name: string | null;
    message: string | null;
    created_time: Date | null;
    type: string | null;
    full_picture: string | null;
    permalink_url: string | null;
    shares_count: number | null;
    deleted_at: Date | null;
  }>(
    `SELECT p.post_id, pg.page_id, pg.[name] AS page_name, p.message, p.created_time,
            p.[type], p.full_picture, p.permalink_url, p.shares_count, p.deleted_at
     FROM analytics.posts AS p
     JOIN meta.pages AS pg ON pg.page_ref_id = p.page_ref_id
     WHERE ${where.join(" AND ")}
     ORDER BY p.created_time DESC;`,
    params,
    { label: "fb.storedPosts" }
  );

  return rows.map((r) => ({
    postId: r.post_id,
    pageId: r.page_id,
    pageName: r.page_name ?? "",
    message: r.message ?? "",
    createdTime: r.created_time ? r.created_time.toISOString() : null,
    type: r.type,
    fullPicture: r.full_picture,
    permalinkUrl: r.permalink_url,
    sharesCount: r.shares_count ?? 0,
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
    isDeleted: r.deleted_at !== null,
  }));
}

// ── videos ──────────────────────────────────────────────────────────────────

export async function getPageVideos(
  pageId: string,
  accountId?: string | null
): Promise<PageVideoDto[]> {
  const { pageRefId } = await requirePageRef(pageId, accountId);

  const rows = await query<{
    video_id: string;
    title: string | null;
    description: string | null;
    created_time: Date | null;
  }>(
    `SELECT video_id, title, [description], created_time
     FROM analytics.page_videos
     WHERE page_ref_id = @pageRef
     ORDER BY created_time DESC;`,
    [p.uuid("pageRef", pageRefId)],
    { label: "fb.pageVideos" }
  );

  return rows.map((r) => ({
    id: r.video_id,
    title: r.title ?? "",
    description: r.description ?? "",
    createdTime: r.created_time ? r.created_time.toISOString() : "",
  }));
}
