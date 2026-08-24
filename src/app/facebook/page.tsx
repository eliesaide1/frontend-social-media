"use client";

import { useState, useCallback } from "react";
import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Tabs from "@/components/ui/SB_Tabs";
import SB_MetricCard from "@/components/ui/SB_MetricCard";
import SB_Card from "@/components/ui/SB_Card";
import SB_MiniList from "@/components/ui/SB_MiniList";
import SB_DataTable, { Column } from "@/components/ui/SB_DataTable";
import SB_LineChart from "@/components/charts/SB_LineChart";
import SB_DonutChart from "@/components/charts/SB_DonutChart";
import SB_ProgressBar from "@/components/ui/SB_ProgressBar";
import SB_Badge from "@/components/ui/SB_Badge";
import SB_Select from "@/components/ui/SB_Select";
import SB_LiveIndicator from "@/components/ui/SB_LiveIndicator";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { useFbAccount } from "@/hooks/useFbAccount";
import { useLiveData } from "@/hooks/useLiveData";
import * as fb from "@/services/facebookService";
import type {
  PageInsightsDto,
  PageFollowersDto,
  PageVideoMetricsDto,
  PageReactionsDailyDto,
  PageDemographicDto,
  PageLikeSourceDto,
  PageStoryMetricsDto,
  PageFanChurnDto,
  PageFanChurnPointDto,
  StoredMediaDto,
  StoredPostDto,
  PostEngagementDto,
  PageMetricPointDto,
  PageCtaClicksPointDto,
  PageViewsBreakdownPointDto,
  PageInsightsTimeSeriesPoint,
  PageVideoMetricsPointDto,
  PageReactionsDailyPointDto,
} from "@/types/facebook";
import type { TimeSeriesResponse } from "@/types/api";

const POLL_INTERVAL = 15_000; // 15 seconds

/**
 * Three FacebookAnalytics routes the service layer declares are not deployed:
 * page-demographics, page-like-sources and page-negative-feedback each return
 * 404 (checked against the deployed swagger's 58 paths). The page no longer
 * calls them — every poll spent three round-trips on a guaranteed failure that
 * Promise.allSettled then swallowed. The panels below say so, rather than
 * showing a "no data" empty state that reads as "this page has no audience".
 */
const ROUTE_NOT_DEPLOYED = "Backend route not deployed (404)";

/** The last `days` days as yyyy-MM-dd, which the dated page metrics require. */
function dateWindow(days: number) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  return { startDate: iso(start), endDate: iso(end) };
}

// ─── Overview Tab ───────────────────────────────────────────

interface OverviewData {
  insights: PageInsightsDto | null;
  followers: PageFollowersDto | null;
  videoMetrics: PageVideoMetricsDto | null;
  reactions: PageReactionsDailyDto | null;
  history: TimeSeriesResponse<PageMetricPointDto> | null;
  pageViews: TimeSeriesResponse<PageViewsBreakdownPointDto> | null;
  insightsSeries: TimeSeriesResponse<PageInsightsTimeSeriesPoint> | null;
  videoSeries: TimeSeriesResponse<PageVideoMetricsPointDto> | null;
  reactionsSeries: TimeSeriesResponse<PageReactionsDailyPointDto> | null;
  ctaClicks: TimeSeriesResponse<PageCtaClicksPointDto> | null;
}

function OverviewTab({ pageId }: { pageId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<OverviewData>(
    async () => {
      // page-views-breakdown and page-cta-clicks only return a daily series
      // when given a range; bare, they collapse to a single number.
      const { startDate, endDate } = dateWindow(90);
      const [insRes, folRes, vidRes, reactRes, histRes, viewsRes, ctaRes,
             insSeriesRes, vidSeriesRes, reactSeriesRes] =
        await Promise.allSettled([
          fb.getPageInsights(pageId) as Promise<PageInsightsDto>,
          fb.getPageFollowers(pageId),
          fb.getPageVideoMetrics(pageId) as Promise<PageVideoMetricsDto>,
          fb.getPageReactionsDaily(pageId) as Promise<PageReactionsDailyDto>,
          fb.getPageMetricsHistory(pageId),
          fb.getPageViewsBreakdown(pageId, startDate, endDate) as Promise<
            TimeSeriesResponse<PageViewsBreakdownPointDto>
          >,
          fb.getPageCtaClicks(pageId, startDate, endDate) as Promise<
            TimeSeriesResponse<PageCtaClicksPointDto>
          >,
          // Same three endpoints as above, asked for by day. Called bare they
          // collapse to one number, which is why these panels used to show a
          // single figure instead of a trend.
          fb.getPageInsights(pageId, startDate, endDate) as Promise<
            TimeSeriesResponse<PageInsightsTimeSeriesPoint>
          >,
          fb.getPageVideoMetrics(pageId, startDate, endDate) as Promise<
            TimeSeriesResponse<PageVideoMetricsPointDto>
          >,
          fb.getPageReactionsDaily(pageId, startDate, endDate) as Promise<
            TimeSeriesResponse<PageReactionsDailyPointDto>
          >,
        ]);
      return {
        insights: insRes.status === "fulfilled" ? insRes.value : null,
        followers: folRes.status === "fulfilled" ? folRes.value : null,
        videoMetrics: vidRes.status === "fulfilled" ? vidRes.value : null,
        reactions: reactRes.status === "fulfilled" ? reactRes.value : null,
        history: histRes.status === "fulfilled" ? histRes.value : null,
        pageViews: viewsRes.status === "fulfilled" ? viewsRes.value : null,
        ctaClicks: ctaRes.status === "fulfilled" ? ctaRes.value : null,
        insightsSeries: insSeriesRes.status === "fulfilled" ? insSeriesRes.value : null,
        videoSeries: vidSeriesRes.status === "fulfilled" ? vidSeriesRes.value : null,
        reactionsSeries: reactSeriesRes.status === "fulfilled" ? reactSeriesRes.value : null,
      };
    },
    [pageId],
    { interval: POLL_INTERVAL }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading overview data...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const { insights, followers, videoMetrics, reactions, history, pageViews, ctaClicks,
          insightsSeries, videoSeries, reactionsSeries } = data ?? {};

  const chartData = history?.points?.map((p) => ({
    label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    followers: p.followersCount,
    reach: p.reach,
    engagements: p.postEngagements,
  })) ?? [];

  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Daily activity: page views + engagement, one row per day.
  const activityChart = (insightsSeries?.points ?? []).map((p) => ({
    label: dayLabel(p.date),
    pageViews: p.metrics?.pageViews ?? 0,
    postEngagements: p.metrics?.postEngagements ?? 0,
  }));

  const videoChart = (videoSeries?.points ?? []).map((p) => ({
    label: dayLabel(p.date),
    views: p.metrics?.videoViews ?? 0,
    organic: p.metrics?.videoViewsOrganic ?? 0,
    paid: p.metrics?.videoViewsPaid ?? 0,
  }));

  const reactionsChart = (reactionsSeries?.points ?? []).map((p) => ({
    label: dayLabel(p.date),
    total: p.metrics?.reactionsTotal ?? 0,
    like: p.metrics?.reactionsLike ?? 0,
    love: p.metrics?.reactionsLove ?? 0,
  }));

  const viewPoints = pageViews?.points ?? [];
  const viewsChart = viewPoints.map((p) => ({
    label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    views: p.metrics?.total ?? 0,
  }));
  const viewsTotal = viewPoints.reduce((n, p) => n + (p.metrics?.total ?? 0), 0);
  const viewsPeak = viewPoints.reduce((n, p) => Math.max(n, p.metrics?.total ?? 0), 0);
  const viewsAvg = viewPoints.length ? viewsTotal / viewPoints.length : 0;

  const ctaPoints = ctaClicks?.points ?? [];
  const ctaTotal = ctaPoints.reduce((n, p) => n + (p.metrics?.totalActions ?? 0), 0);
  // Facebook names what it will not serve; show that instead of an empty chart.
  const ctaUnavailable = Array.from(
    new Set(ctaPoints.flatMap((p) => p.metrics?.unavailableMetrics ?? []))
  ).sort();

  const reactionColors: Record<string, string> = {
    Like: "#356df3", Love: "#ef4b9a", Wow: "#ff9f43",
    Haha: "#22b573", Sorry: "#8a96aa", Angry: "#e84a5f",
  };
  const reactionsDonut = reactions
    ? [
        { name: "Like", value: reactions.reactionsLike, color: reactionColors.Like },
        { name: "Love", value: reactions.reactionsLove, color: reactionColors.Love },
        { name: "Wow", value: reactions.reactionsWow, color: reactionColors.Wow },
        { name: "Haha", value: reactions.reactionsHaha, color: reactionColors.Haha },
        { name: "Sorry", value: reactions.reactionsSorry, color: reactionColors.Sorry },
        { name: "Angry", value: reactions.reactionsAngry, color: reactionColors.Angry },
      ].filter((r) => r.value > 0)
    : [];

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <SB_MetricCard title="Followers" value={followers ? formatNumber(followers.followersCount) : "—"} />
        <SB_MetricCard title="Page Views" value={insights ? formatNumber(insights.pageViews) : "—"} />
        <SB_MetricCard title="Engagements" value={insights ? formatNumber(insights.postEngagements) : "—"} />
        <SB_MetricCard title="Engaged Users" value={insights ? formatNumber(insights.engagedUsers) : "—"} />
      </div>

      {activityChart.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Daily Activity</strong>
            <span className="text-muted text-[11px] ml-2">
              {activityChart.length} days
            </span>
            <div className="mt-3">
              <SB_LineChart
                data={activityChart}
                lines={[
                  { dataKey: "pageViews", color: "#7c5cff", name: "Page Views" },
                  { dataKey: "postEngagements", color: "#22b573", name: "Post Engagements" },
                ]}
                height={260}
                showLegend
              />
            </div>
          </SB_Card>
        </div>
      )}

      {videoChart.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Daily Video Views</strong>
            <span className="text-muted text-[11px] ml-2">
              {videoChart.length} days
            </span>
            <div className="mt-3">
              <SB_LineChart
                data={videoChart}
                lines={[
                  { dataKey: "views", color: "#356df3", name: "Total" },
                  { dataKey: "organic", color: "#22b573", name: "Organic" },
                  { dataKey: "paid", color: "#ff9f43", name: "Paid" },
                ]}
                height={240}
                showLegend
              />
            </div>
          </SB_Card>
        </div>
      )}

      {reactionsChart.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Daily Reactions</strong>
            <span className="text-muted text-[11px] ml-2">
              {reactionsChart.length} days
            </span>
            <div className="mt-3">
              <SB_LineChart
                data={reactionsChart}
                lines={[
                  { dataKey: "total", color: "#ef4b9a", name: "Total" },
                  { dataKey: "like", color: "#356df3", name: "Like" },
                  { dataKey: "love", color: "#e84a5f", name: "Love" },
                ]}
                height={240}
                showLegend
              />
            </div>
          </SB_Card>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Followers (warehouse history)</strong>
            <div className="mt-3">
              <SB_LineChart
                data={chartData}
                lines={[
                  { dataKey: "followers", color: "#356df3", name: "Followers" },
                  { dataKey: "reach", color: "#ef4b9a", name: "Reach" },
                  { dataKey: "engagements", color: "#22b573", name: "Engagements" },
                ]}
                height={280}
                showLegend
              />
            </div>
          </SB_Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        <SB_Card>
          <strong className="text-sm">Daily Page Views</strong>
          {viewPoints.length > 0 && (
            <span className="text-muted text-[11px] ml-2">
              last {viewPoints.length} days · {formatNumber(viewsTotal)} total ·
              {" "}{viewsAvg.toFixed(1)}/day avg · peak {formatNumber(viewsPeak)}
            </span>
          )}
          <div className="mt-3">
            {viewsChart.length > 0 ? (
              <SB_LineChart
                data={viewsChart}
                lines={[{ dataKey: "views", color: "#7c5cff", name: "Page Views" }]}
                height={240}
              />
            ) : (
              <div className="text-center py-8 text-muted text-sm">No page view data</div>
            )}
          </div>
        </SB_Card>

        <SB_Card>
          <strong className="text-sm">Call-to-Action Clicks</strong>
          <div className="text-[28px] font-extrabold mt-2.5">{formatNumber(ctaTotal)}</div>
          <div className="text-[13px] text-[#68758b]">
            across {ctaPoints.length} days
          </div>
          {ctaUnavailable.length > 0 && (
            <p className="text-muted text-[12px] mt-3 mb-0">
              Facebook no longer serves {ctaUnavailable.join(", ")} for this page,
              so this stays at zero regardless of real CTA activity.
            </p>
          )}
        </SB_Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        <SB_Card>
          <strong className="text-sm">Video Performance</strong>
          <SB_MiniList
            className="mt-3"
            items={
              videoMetrics
                ? [
                    { label: "Total Views", value: <b>{formatNumber(videoMetrics.videoViews)}</b> },
                    { label: "Paid Views", value: <b>{formatNumber(videoMetrics.videoViewsPaid)}</b> },
                    { label: "Organic Views", value: <b>{formatNumber(videoMetrics.videoViewsOrganic)}</b> },
                    { label: "30s Complete Views", value: <b>{formatNumber(videoMetrics.videoCompleteViews30s)}</b> },
                    { label: "Total Watch Time", value: <b>{formatNumber(Math.round((videoMetrics.videoViewTimeMs ?? 0) / 60000))} min</b> },
                  ]
                : [{ label: "No video data available", value: "—" }]
            }
          />
        </SB_Card>

        <SB_Card>
          <strong className="text-sm">Reactions Breakdown</strong>
          {reactionsDonut.length > 0 ? (
            <>
              <div className="mt-3">
                <SB_DonutChart
                  data={reactionsDonut}
                  centerValue={formatNumber(reactions!.reactionsTotal)}
                  centerLabel="Total"
                  size={160}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-3 justify-center">
                {reactionsDonut.map((r) => (
                  <div key={r.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.name}: {formatNumber(r.value)}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted text-sm">No reaction data</div>
          )}
        </SB_Card>
      </div>

    </>
  );
}

// ─── Content Tab ────────────────────────────────────────────

/** A stored post joined with whatever per-post metrics the API will give us. */
interface PostRow extends StoredPostDto {
  likes: number | null;
  comments: number | null;
  reactions: number | null;
  reach: number | null;
  clicks: number | null;
  clicksByType: Record<string, number> | null;
  unavailable: string[];
}

function ContentTab({ pageId }: { pageId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<PostRow[]>(
    async () => {
      const posts = await fb.getStoredPosts(pageId);

      // Two sources per post, because neither alone is complete: the warehouse
      // row carries likes/comments/reactions/reach, while live post-engagement
      // is the only place real click counts show up (the warehouse stores 0).
      return Promise.all(
        posts.map(async (post): Promise<PostRow> => {
          const [histRes, engRes] = await Promise.allSettled([
            fb.getPostMetricsHistory(post.postId),
            fb.getPostEngagement(post.postId),
          ]);

          const points = histRes.status === "fulfilled" ? histRes.value?.points ?? [] : [];
          const m = points.length ? points[points.length - 1] : null;
          const eng: PostEngagementDto | null = engRes.status === "fulfilled" ? engRes.value : null;

          const reactions = m
            ? m.reactionsLike + m.reactionsLove + m.reactionsWow +
              m.reactionsHaha + m.reactionsSad + m.reactionsAngry
            : null;

          return {
            ...post,
            likes: m?.likes ?? null,
            comments: m?.comments ?? null,
            reactions,
            reach: m?.reach ?? null,
            clicks: eng?.clicks ?? m?.clicks ?? null,
            clicksByType: eng?.clicksByType ?? null,
            unavailable: eng?.unavailableMetrics ?? [],
          };
        })
      );
    },
    [pageId],
    // Polling off by default: this fans out to two requests per post, so a 15s
    // poll would fire ~40 calls a minute against the page's rate limit.
    { interval: POLL_INTERVAL, enabled: false }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading posts and per-post metrics...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const posts = data ?? [];
  if (posts.length === 0) return <div className="text-center py-16 text-muted text-sm">No posts found</div>;

  const num = (v: number | null) =>
    v === null ? <span className="text-muted">—</span> : formatNumber(v);

  const columns: Column<PostRow>[] = [
    {
      header: "Post",
      accessor: (row) => (
        <div className="max-w-[260px] truncate text-[13px]">
          {row.message || <span className="text-muted italic">No text</span>}
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (row) => <SB_Badge variant="facebook">{row.type || "post"}</SB_Badge>,
    },
    { header: "Date", accessor: (row) => new Date(row.createdTime).toLocaleDateString() },
    { header: "Likes", accessor: (row) => num(row.likes), className: "text-right" },
    { header: "Comments", accessor: (row) => num(row.comments), className: "text-right" },
    { header: "Reactions", accessor: (row) => num(row.reactions), className: "text-right" },
    { header: "Shares", accessor: (row) => formatNumber(row.sharesCount), className: "text-right" },
    { header: "Reach", accessor: (row) => num(row.reach), className: "text-right" },
    {
      header: "Clicks",
      accessor: (row) => (
        <span title={
          row.clicksByType && Object.keys(row.clicksByType).length
            ? Object.entries(row.clicksByType).map(([k, v]) => `${k}: ${v}`).join(", ")
            : undefined
        }>
          {num(row.clicks)}
        </span>
      ),
      className: "text-right",
    },
    {
      header: "Link",
      accessor: (row) =>
        row.permalinkUrl ? (
          <a href={row.permalinkUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline text-xs">
            View ↗
          </a>
        ) : ("—"),
    },
  ];

  // Surface Facebook's own "we no longer serve this" list rather than letting a
  // wall of zeros read as "nobody engaged with any of your posts".
  const unavailable = Array.from(new Set(posts.flatMap((p) => p.unavailable))).sort();
  const totals = {
    likes: posts.reduce((n, p) => n + (p.likes ?? 0), 0),
    comments: posts.reduce((n, p) => n + (p.comments ?? 0), 0),
    shares: posts.reduce((n, p) => n + p.sharesCount, 0),
    clicks: posts.reduce((n, p) => n + (p.clicks ?? 0), 0),
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
        <SB_MetricCard title="Likes (all posts)" value={formatNumber(totals.likes)} />
        <SB_MetricCard title="Comments (all posts)" value={formatNumber(totals.comments)} />
        <SB_MetricCard title="Shares (all posts)" value={formatNumber(totals.shares)} />
        <SB_MetricCard title="Clicks (all posts)" value={formatNumber(totals.clicks)} />
      </div>

      <SB_Card>
        <strong className="text-sm">Published Content ({posts.length})</strong>
        {unavailable.length > 0 && (
          <p className="text-muted text-[12px] mt-1.5 mb-0">
            Facebook no longer serves {unavailable.join(", ")} for this page, so
            those columns stay blank regardless of real engagement. Hover a Clicks
            value for its breakdown by type.
          </p>
        )}
        <div className="mt-3">
          <SB_DataTable columns={columns} data={posts} />
        </div>
      </SB_Card>
    </>
  );
}

// ─── Audience Tab ───────────────────────────────────────────

interface AudienceData {
  demographics: PageDemographicDto[];
  fanChurn: PageFanChurnDto | null;
  fanChurnDays: number;
  likeSources: PageLikeSourceDto[];
}

function AudienceTab({ pageId }: { pageId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<AudienceData>(
    async () => {
      // Only fan-churn is reachable; see ROUTE_NOT_DEPLOYED above for the
      // other two. The derived shapes stay so the panels light up unchanged
      // the day those routes ship.
      const { startDate, endDate } = dateWindow(90);
      const [churnRes] = await Promise.allSettled([
        fb.getPageFanChurn(pageId, startDate, endDate),
      ]);

      // The endpoint answers with one row per day, so total the window rather
      // than showing a single arbitrary day as if it were the whole picture.
      const points: PageFanChurnPointDto[] =
        churnRes.status === "fulfilled" ? churnRes.value?.points ?? [] : [];
      const fanAdds = points.reduce((n, p) => n + (p.metrics?.fanAdds ?? 0), 0);
      const fanRemoves = points.reduce((n, p) => n + (p.metrics?.fanRemoves ?? 0), 0);

      return {
        demographics: [],
        fanChurn: points.length
          ? {
              fanAdds,
              fanAddsUnique: points.reduce((n, p) => n + (p.metrics?.fanAddsUnique ?? 0), 0),
              fanRemoves,
              fanRemovesUnique: points.reduce((n, p) => n + (p.metrics?.fanRemovesUnique ?? 0), 0),
              netChange: fanAdds - fanRemoves,
              churnRatio: fanAdds > 0 ? fanRemoves / fanAdds : 0,
            }
          : null,
        fanChurnDays: points.length,
        likeSources: [],
      };
    },
    [pageId],
    { interval: POLL_INTERVAL }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading audience data...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const { demographics = [], fanChurn = null, fanChurnDays = 0, likeSources = [] } = data ?? {};

  const genderAge = demographics.filter((d) => d.demographicType === "gender_age");
  const countries = demographics.filter((d) => d.demographicType === "country");
  const cities = demographics.filter((d) => d.demographicType === "city");

  const genderGroups = genderAge.reduce(
    (acc, d) => {
      const gender = d.dimension.startsWith("F.") ? "Female" : d.dimension.startsWith("M.") ? "Male" : "Other";
      acc[gender] = (acc[gender] || 0) + d.count;
      return acc;
    },
    {} as Record<string, number>
  );
  const genderDonut = [
    { name: "Female", value: genderGroups["Female"] || 0, color: "#ef4b9a" },
    { name: "Male", value: genderGroups["Male"] || 0, color: "#356df3" },
    { name: "Other", value: genderGroups["Other"] || 0, color: "#ff9f43" },
  ].filter((g) => g.value > 0);
  const totalGender = genderDonut.reduce((s, g) => s + g.value, 0);

  const topCountries = [...countries].sort((a, b) => b.count - a.count).slice(0, 10);
  const maxCountry = topCountries[0]?.count || 1;
  const topCities = [...cities].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <SB_Card>
          <strong className="text-sm">Gender Distribution</strong>
          {genderDonut.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
              <SB_DonutChart data={genderDonut} centerValue={formatNumber(totalGender)} centerLabel="Fans" size={160} />
              <div className="flex flex-col gap-2">
                {genderDonut.map((g) => (
                  <div key={g.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="text-muted">{g.name}</span>
                    <span className="font-bold ml-auto">{formatPercentage((g.value / totalGender) * 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted text-sm">{ROUTE_NOT_DEPLOYED}</div>
          )}
        </SB_Card>

        <SB_Card>
          <strong className="text-sm">Fan Growth</strong>
          {fanChurnDays > 0 && (
            <span className="text-muted text-[11px] ml-2">last {fanChurnDays} days</span>
          )}
          {fanChurn ? (
            <SB_MiniList
              className="mt-3"
              items={[
                { label: "New Fans", value: <b className="text-green">+{formatNumber(fanChurn.fanAdds)}</b> },
                { label: "Lost Fans", value: <b className="text-red">-{formatNumber(fanChurn.fanRemoves)}</b> },
                {
                  label: "Net Change",
                  value: (
                    <b className={fanChurn.netChange >= 0 ? "text-green" : "text-red"}>
                      {fanChurn.netChange >= 0 ? "+" : ""}{formatNumber(fanChurn.netChange)}
                    </b>
                  ),
                },
                { label: "Churn Ratio", value: <b>{formatPercentage(fanChurn.churnRatio * 100)}</b> },
              ]}
            />
          ) : (
            <div className="text-center py-8 text-muted text-sm">No churn data</div>
          )}
        </SB_Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <SB_Card>
          <strong className="text-sm">Top Countries</strong>
          <div className="mt-3 grid gap-2.5">
            {topCountries.length > 0 ? (
              topCountries.map((c) => (
                <div key={c.dimension}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{c.dimension}</span>
                    <span className="font-bold">{formatNumber(c.count)}</span>
                  </div>
                  <SB_ProgressBar value={(c.count / maxCountry) * 100} />
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted text-sm">{ROUTE_NOT_DEPLOYED}</div>
            )}
          </div>
        </SB_Card>

        <SB_Card>
          <strong className="text-sm">Top Cities</strong>
          {topCities.length > 0 ? (
            <SB_MiniList className="mt-3" items={topCities.map((c) => ({ label: c.dimension, value: <b>{formatNumber(c.count)}</b> }))} />
          ) : (
            <div className="text-center py-6 text-muted text-sm">{ROUTE_NOT_DEPLOYED}</div>
          )}
        </SB_Card>
      </div>

      <div className="mt-4">
        <SB_Card>
          <strong className="text-sm">Where Likes Come From</strong>
          {likeSources.length > 0 ? (
            <SB_MiniList
              className="mt-3"
              items={[...likeSources].sort((a, b) => b.fanCount - a.fanCount).slice(0, 10).map((s) => ({
                label: s.source, value: <b>{formatNumber(s.fanCount)}</b>,
              }))}
            />
          ) : (
            <div className="text-center py-6 text-muted text-sm">{ROUTE_NOT_DEPLOYED}</div>
          )}
        </SB_Card>
      </div>
    </>
  );
}

// ─── Videos Tab ─────────────────────────────────────────────

interface VideosData {
  videos: StoredMediaDto[];
  videoMetrics: PageVideoMetricsDto | null;
}

function VideosTab({ pageId }: { pageId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<VideosData>(
    async () => {
      // Warehouse, not the live edge: /FacebookAnalytics/videos takes ~41s to
      // return the same 648 rows the warehouse serves in under a second, and
      // POLL_INTERVAL is 15s — so the live call could never finish before the
      // next one started, leaving the tab stuck on "Loading videos...".
      const [vidRes, metRes] = await Promise.allSettled([
        fb.getStoredVideos(pageId),
        fb.getPageVideoMetrics(pageId) as Promise<PageVideoMetricsDto>,
      ]);
      return {
        videos: vidRes.status === "fulfilled" ? vidRes.value : [],
        videoMetrics: metRes.status === "fulfilled" ? metRes.value : null,
      };
    },
    [pageId],
    { interval: POLL_INTERVAL }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading videos...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const { videos = [], videoMetrics = null } = data ?? {};

  const columns: Column<StoredMediaDto>[] = [
    {
      header: "Title",
      accessor: (row) => (
        <div className="max-w-[250px] truncate text-[13px] font-medium">
          {row.title || <span className="text-muted italic">Untitled</span>}
        </div>
      ),
    },
    {
      header: "Description",
      accessor: (row) => <div className="max-w-[200px] truncate text-[12px] text-muted">{row.description || "—"}</div>,
    },
    { header: "Published", accessor: (row) => new Date(row.createdTime).toLocaleDateString() },
  ];

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>
      {videoMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-4">
          <SB_MetricCard title="Total Views" value={formatNumber(videoMetrics.videoViews)} />
          <SB_MetricCard title="Paid Views" value={formatNumber(videoMetrics.videoViewsPaid)} />
          <SB_MetricCard title="Organic Views" value={formatNumber(videoMetrics.videoViewsOrganic)} />
          <SB_MetricCard title="30s Completes" value={formatNumber(videoMetrics.videoCompleteViews30s)} />
          <SB_MetricCard title="Watch Time" value={`${Math.round((videoMetrics.videoViewTimeMs ?? 0) / 60000)}m`} />
        </div>
      )}
      <SB_Card>
        <strong className="text-sm">Videos ({videos.length})</strong>
        {videos.length > 0 ? (
          <div className="mt-3"><SB_DataTable columns={columns} data={videos} /></div>
        ) : (
          <div className="text-center py-8 text-muted text-sm">No videos found</div>
        )}
      </SB_Card>
    </>
  );
}

// ─── Stories Tab ─────────────────────────────────────────────

function StoriesTab({ pageId }: { pageId: string }) {
  const { data: storyMetrics, loading, error, lastUpdated, isLive, setLive } = useLiveData(
    () => fb.getPageStoryMetrics(pageId),
    [pageId],
    { interval: POLL_INTERVAL }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading story metrics...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;
  if (!storyMetrics) return <div className="text-center py-16 text-muted text-sm">No story data</div>;

  const actionsDonut = [
    { name: "Fan Actions", value: storyMetrics.actionFan, color: "#356df3" },
    { name: "Mentions", value: storyMetrics.actionMention, color: "#ef4b9a" },
    { name: "Page Posts", value: storyMetrics.actionPagePost, color: "#22b573" },
    { name: "User Posts", value: storyMetrics.actionUserPost, color: "#ff9f43" },
    { name: "Checkins", value: storyMetrics.actionCheckin, color: "#8a96aa" },
    { name: "Other", value: storyMetrics.actionOther, color: "#e84a5f" },
  ].filter((a) => a.value > 0);
  const totalActions = actionsDonut.reduce((s, a) => s + a.value, 0);

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        <SB_MetricCard title="Story Adds" value={formatNumber(storyMetrics.storyAdds)} />
        <SB_MetricCard title="Unique Story Adds" value={formatNumber(storyMetrics.storyAddsUnique)} />
        <SB_MetricCard title="Total Actions" value={formatNumber(totalActions)} />
      </div>

      {actionsDonut.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Story Actions Breakdown</strong>
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
              <SB_DonutChart data={actionsDonut} centerValue={formatNumber(totalActions)} centerLabel="Actions" size={180} />
              <div className="flex flex-col gap-2 flex-1">
                {actionsDonut.map((a) => (
                  <div key={a.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="text-muted">{a.name}</span>
                    <span className="font-bold ml-auto">{formatNumber(a.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </SB_Card>
        </div>
      )}
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function FacebookPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    accounts,
    selectedAccount,
    setAccount,
    pages,
    selectedPage,
    setPage,
    loading,
    error,
  } = useFbAccount();

  const pageId = selectedPage?.pageId;

  const renderTab = useCallback(() => {
    if (!pageId) return null;
    switch (activeTab) {
      case "overview":   return <OverviewTab pageId={pageId} />;
      case "content":    return <ContentTab pageId={pageId} />;
      case "audience":   return <AudienceTab pageId={pageId} />;
      case "videos":     return <VideosTab pageId={pageId} />;
      case "stories":    return <StoriesTab pageId={pageId} />;
      default:           return <OverviewTab pageId={pageId} />;
    }
  }, [activeTab, pageId]);

  return (
    <>
      <SB_PageHeader
        title="Facebook Overview"
        description={
          selectedPage
            ? `${selectedPage.pageName} · Page and post analytics`
            : "Page and post analytics powered by real-time data."
        }
        actionLabel="＋ Create"
      />

      {/* Account & Page selectors */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {loading ? (
          <span className="text-sm text-muted">Loading accounts...</span>
        ) : (
          <>
            {accounts.length > 0 && (
              <SB_Select
                options={accounts.map((a) => ({
                  label: a.label,
                  value: a.accountId,
                }))}
                value={selectedAccount?.accountId ?? ""}
                onChange={setAccount}
              />
            )}
            {pages.length > 0 && (
              <SB_Select
                options={pages.map((p) => ({
                  label: p.pageName,
                  value: p.pageId,
                }))}
                value={selectedPage?.pageId ?? ""}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <SB_Tabs
        tabs={[
          { label: "Overview", value: "overview" },
          { label: "Content", value: "content" },
          { label: "Audience", value: "audience" },
          { label: "Videos", value: "videos" },
          { label: "Stories", value: "stories" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {loading ? (
        <div className="text-center py-16 text-muted text-sm">Loading accounts...</div>
      ) : error ? (
        <div className="text-center py-16 text-red text-sm">{error}</div>
      ) : !pageId ? (
        <div className="text-center py-16 text-muted text-sm">
          No Facebook page found. Link an account to get started.
        </div>
      ) : (
        renderTab()
      )}
    </>
  );
}
