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
import SB_Badge from "@/components/ui/SB_Badge";
import SB_Select from "@/components/ui/SB_Select";
import SB_LiveIndicator from "@/components/ui/SB_LiveIndicator";
import SB_Modal from "@/components/ui/SB_Modal";
import SB_PostDetail from "@/components/facebook/SB_PostDetail";
import SB_Pagination from "@/components/ui/SB_Pagination";
import { usePagination } from "@/hooks/usePagination";
import {
  bucketSeries,
  fitAxisDomain,
  formatNumber,
  postTypeLabel,
} from "@/lib/utils";
import { useFbAccount } from "@/hooks/useFbAccount";
import { useLiveData } from "@/hooks/useLiveData";
import { useDateRange } from "@/contexts/DateRangeContext";
import * as fb from "@/services/facebookService";
import type {
  PageInsightsSeries,
  PageVideoMetricsSeries,
  PageReactionsDailySeries,
  PageFollowersDto,
  PageVideoMetricsDto,
  PageFanChurnSeries,
  PageCtaClicksSeries,
  PageVideoDto,
  StoredPostDto,
  PageMetricPointDto,
} from "@/types/facebook";
import type { MetricSeries, TimeSeriesResponse } from "@/types/api";

const POLL_INTERVAL = 15_000; // 15 seconds


// ─── Overview Tab ───────────────────────────────────────────

interface OverviewData {
  insights: PageInsightsSeries | null;
  followers: PageFollowersDto | null;
  videoMetrics: PageVideoMetricsSeries | null;
  reactions: PageReactionsDailySeries | null;
  history: TimeSeriesResponse<PageMetricPointDto> | null;
}

function OverviewTab({ pageId }: { pageId: string }) {
  const { startDate, endDate, grouping } = useDateRange();

  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<OverviewData>(
    async () => {
      // Every metric here is fetched RANGED, so the topbar selector actually
      // changes the numbers. Un-ranged, Meta returns only its default two-day
      // window and these read as permanently near-zero.
      //
      // allSettled, not all: several depend on metrics Meta has deprecated or
      // permissions the token may lack, and one 502 should not blank the tab.
      const [insRes, folRes, vidRes, reactRes, histRes] =
        await Promise.allSettled([
          fb.getPageInsights(pageId, startDate, endDate),
          fb.getPageFollowers(pageId),
          fb.getPageVideoMetrics(pageId, startDate, endDate),
          fb.getPageReactionsDaily(pageId, startDate, endDate),
          fb.getPageMetricsHistory(pageId, startDate, endDate),
        ]);
      return {
        insights: insRes.status === "fulfilled" ? insRes.value : null,
        followers: folRes.status === "fulfilled" ? folRes.value : null,
        videoMetrics: vidRes.status === "fulfilled" ? vidRes.value : null,
        reactions: reactRes.status === "fulfilled" ? reactRes.value : null,
        history: histRes.status === "fulfilled" ? histRes.value : null,
      };
    },
    [pageId, startDate, endDate],
    // Ranged reads are live Graph calls, not the cached flat endpoints, so
    // this polls far less aggressively than a snapshot would.
    { interval: 300_000, enabled: false }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading overview data...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const { insights, followers, videoMetrics, reactions, history } = data ?? {};

  // Ranged responses are per-day series. These metrics are additive counts, so
  // the figure for the window is their sum — not the last day's value, which is
  // what an un-ranged read would have given.
  function sumMetric<T>(
    series: MetricSeries<T> | null | undefined,
    pick: (m: T) => number | undefined
  ): number {
    return (series?.points ?? []).reduce(
      (total, p) => total + (pick(p.metrics) ?? 0),
      0
    );
  }

  const pageViews = sumMetric(insights, (m) => m.pageViews);
  const postEngagements = sumMetric(insights, (m) => m.postEngagements);
  const videoViews = sumMetric(videoMetrics, (m) => m.videoViews);

  // Sourced from the RANGED insights series, not warehouse history.
  //
  // page-metrics-history is written by the nightly job, so it holds one row per
  // day the job has run — two rows for this page, which no date range can widen.
  // The insights series returns a point per day in the requested window, so this
  // is the chart that can actually follow the topbar selector.
  //
  // `reach` is excluded on purpose: it maps to page_impressions_unique, which
  // Meta deprecated, so it is always 0 and only adds a flat line.
  const chartData = bucketSeries(
    (insights?.points ?? []).map((p) => ({
      date: p.date,
      pageViews: p.metrics.pageViews ?? 0,
      engagements: p.metrics.postEngagements ?? 0,
    })),
    grouping,
    { pageViews: "sum", engagements: "sum" }
  );

  // Followers live on their own chart: a count in the tens of thousands plotted
  // beside daily activity in the tens flattens both onto one axis.
  const followerTrend = bucketSeries(
    (history?.points ?? []).map((p) => ({
      date: p.date,
      followers: p.followersCount,
    })),
    grouping,
    { followers: "last" }
  );
  const followerDomain = fitAxisDomain(
    followerTrend.map((p) => Number(p.followers))
  );

  // Meta returns fan_count and followers_count as the same number for this
  // Page, so showing both would print one measurement twice under two labels.
  // The day-over-day follower delta is real movement, so it rides along on the
  // Followers tile instead of occupying a tile of its own.
  const latest = history?.points?.[history.points.length - 1];
  const followerDelta = latest?.followersDelta ?? null;

  const reactionColors: Record<string, string> = {
    Like: "#356df3", Love: "#ef4b9a", Wow: "#ff9f43",
    Haha: "#22b573", Sorry: "#8a96aa", Angry: "#e84a5f",
  };
  const reactionsDonut = [
    { name: "Like", value: sumMetric(reactions, (m) => m.reactionsLike), color: reactionColors.Like },
    { name: "Love", value: sumMetric(reactions, (m) => m.reactionsLove), color: reactionColors.Love },
    { name: "Wow", value: sumMetric(reactions, (m) => m.reactionsWow), color: reactionColors.Wow },
    { name: "Haha", value: sumMetric(reactions, (m) => m.reactionsHaha), color: reactionColors.Haha },
    { name: "Sorry", value: sumMetric(reactions, (m) => m.reactionsSorry), color: reactionColors.Sorry },
    { name: "Angry", value: sumMetric(reactions, (m) => m.reactionsAngry), color: reactionColors.Angry },
  ].filter((r) => r.value > 0);

  // Summed from the buckets rather than read from reactionsTotal. Meta returns
  // page_actions_post_reactions_total as an OBJECT keyed by reaction type, so
  // the API's scalar reader yields 0 — which showed a donut labelled "0 Total"
  // wrapped around segments adding to 97. The buckets are the reliable source.
  const reactionsTotal = reactionsDonut.reduce((sum, r) => sum + r.value, 0);

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <SB_MetricCard
          title="Followers"
          value={followers ? formatNumber(followers.followersCount) : "—"}
          change={
            followerDelta === null
              ? undefined
              : `${formatNumber(Math.abs(followerDelta))} since previous day`
          }
          changeDirection={(followerDelta ?? 0) >= 0 ? "up" : "down"}
        />
        <SB_MetricCard title="Page Views" value={insights ? formatNumber(pageViews) : "—"} />
        <SB_MetricCard title="Engagements" value={insights ? formatNumber(postEngagements) : "—"} />
        <SB_MetricCard
          title="Reactions"
          value={reactions ? formatNumber(reactionsTotal) : "—"}
        />
      </div>

      {chartData.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">
              Page Activity Over Time ({grouping === "day" ? "daily" : "monthly"})
            </strong>
            <div className="mt-3">
              <SB_LineChart
                data={chartData}
                lines={[
                  { dataKey: "pageViews", color: "#356df3", name: "Page Views" },
                  { dataKey: "engagements", color: "#22b573", name: "Engagements" },
                ]}
                height={280}
                showLegend
              />
            </div>
          </SB_Card>
        </div>
      )}

      <div className="mt-4">
        <SB_Card>
          <strong className="text-sm">Follower Trend</strong>
          {followerTrend.length > 1 ? (
            <div className="mt-3">
              <SB_LineChart
                data={followerTrend}
                lines={[{ dataKey: "followers", color: "#356df3", name: "Followers" }]}
                height={240}
                yDomain={followerDomain}
                yTickFormatter={(v) => v.toLocaleString()}
              />
            </div>
          ) : (
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Follower history comes from the warehouse, which stores one row per
              day the nightly ingestion job has run — currently{" "}
              {followerTrend.length === 1 ? "one day" : "no days"} in this window.
              Unlike the chart above it cannot be widened by changing the date
              range; it fills in as the job runs.
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
                    { label: "Total Views", value: <b>{formatNumber(videoViews)}</b> },
                    { label: "Paid Views", value: <b>{formatNumber(sumMetric(videoMetrics, (m) => m.videoViewsPaid))}</b> },
                    { label: "Organic Views", value: <b>{formatNumber(sumMetric(videoMetrics, (m) => m.videoViewsOrganic))}</b> },
                    { label: "30s Complete Views", value: <b>{formatNumber(sumMetric(videoMetrics, (m) => m.videoCompleteViews30s))}</b> },
                    { label: "Total Watch Time", value: <b>{Math.round(sumMetric(videoMetrics, (m) => m.videoViewTimeMs) / 60000)} min</b> },
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
                  centerValue={formatNumber(reactionsTotal)}
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

// ─── Audience Tab ───────────────────────────────────────────
//
// Everything here is a RANGED read, deliberately.
//
// page-fan-churn without a date range calls Meta with page_fan_adds /
// page_fan_removes, which Meta deleted — it answers 502 every time. The ranged
// path asks for page_daily_follows / page_daily_unfollows_unique instead and
// returns real numbers, so the range is what makes this tab work at all.
// page-cta-clicks is a daily metric too: without a range Meta returns only its
// default two-day window.
//
// page-demographics, page-like-sources and page-negative-feedback have no
// route at all — every Meta metric behind them (page_fans_gender_age, _city,
// _country, page_fans_by_like_source, page_negative_feedback) was removed at
// v25.0, so gender, age, country and city breakdowns are unobtainable.

const GROUPING_OPTIONS = [
  { label: "By day", value: "day" },
  { label: "By month", value: "month" },
];

interface AudienceData {
  churn: PageFanChurnSeries | null;
  churnError: string | null;
  cta: PageCtaClicksSeries | null;
  history: TimeSeriesResponse<PageMetricPointDto> | null;
}

function AudienceTab({ pageId }: { pageId: string }) {
  const { startDate, endDate, days, label, grouping, setGrouping } =
    useDateRange();

  // These are live Graph reads, not the cached flat endpoints, and a 90-day
  // insights call is expensive. So no polling by default — the range is the
  // point of this tab, not second-by-second freshness.
  const { data, loading, error, lastUpdated, isLive, setLive, refresh } =
    useLiveData<AudienceData>(
      async () => {
        const [churnRes, ctaRes, histRes] = await Promise.allSettled([
          fb.getPageFanChurn(pageId, startDate, endDate),
          fb.getPageCtaClicks(pageId, startDate, endDate),
          fb.getPageMetricsHistory(pageId, startDate, endDate),
        ]);

        return {
          churn: churnRes.status === "fulfilled" ? churnRes.value : null,
          // Surfaced rather than swallowed: an empty card with no explanation
          // is what made this tab look broken instead of unsupported.
          churnError:
            churnRes.status === "rejected"
              ? churnRes.reason instanceof Error
                ? churnRes.reason.message
                : "Follower churn is unavailable."
              : null,
          cta: ctaRes.status === "fulfilled" ? ctaRes.value : null,
          history: histRes.status === "fulfilled" ? histRes.value : null,
        };
      },
      [pageId, startDate, endDate],
      { interval: 300_000, enabled: false }
    );

  if (loading)
    return (
      <div className="text-center py-16 text-muted text-sm">
        Loading audience data...
      </div>
    );
  if (error)
    return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const { churn, churnError, cta, history } = data ?? ({} as AudienceData);

  const churnPoints = churn?.points ?? [];
  const totals = churnPoints.reduce(
    (acc, p) => ({
      adds: acc.adds + (p.metrics.fanAdds ?? 0),
      removes: acc.removes + (p.metrics.fanRemoves ?? 0),
    }),
    { adds: 0, removes: 0 }
  );
  const netChange = totals.adds - totals.removes;
  // Null rather than 0 when nobody followed: 0/0 is not a ratio.
  const churnRatio = totals.adds > 0 ? totals.removes / totals.adds : null;

  const ctaPoints = cta?.points ?? [];
  const ctaTotal = ctaPoints.reduce(
    (sum, p) => sum + (p.metrics.totalActions ?? 0),
    0
  );

  // "last", not "sum": a follower count is a running total, so a month bucket
  // takes the value it ended on. Summing would report 700k followers for a
  // page that has 23k.
  const followerChart = bucketSeries(
    (history?.points ?? []).map((p) => ({
      date: p.date,
      followers: p.followersCount,
    })),
    grouping,
    { followers: "last" }
  );

  // Derived from THIS page's points, on every render — switching pages or
  // ranges refetches, which recomputes the bounds. Nothing here is shared
  // between pages or fixed ahead of time.
  const followerDomain = fitAxisDomain(
    followerChart.map((p) => Number(p.followers))
  );

  // Meta's insights API has period=day|week|days_28|lifetime — there is no
  // month period and no endpoint that returns one. Monthly is the daily series
  // bucketed client-side, which is exact for additive counts like these.
  const groupedChart = bucketSeries(
    churnPoints.map((p) => ({
      date: p.date,
      follows: p.metrics.fanAdds ?? 0,
      unfollows: p.metrics.fanRemoves ?? 0,
    })),
    grouping,
    { follows: "sum", unfollows: "sum" }
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* The window comes from the topbar selector; this only chooses how
              that window is bucketed for the charts. */}
          <SB_Select
            options={GROUPING_OPTIONS}
            value={grouping}
            onChange={(v) => setGrouping(v as "day" | "month")}
          />
          <span className="text-xs text-muted">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            className="text-xs text-brand hover:underline"
          >
            Refresh
          </button>
          <SB_LiveIndicator
            isLive={isLive}
            lastUpdated={lastUpdated}
            onToggle={setLive}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <SB_MetricCard title="New Follows" value={formatNumber(totals.adds)} />
        <SB_MetricCard title="Unfollows" value={formatNumber(totals.removes)} />
        <SB_MetricCard
          title="Net Change"
          value={`${netChange >= 0 ? "+" : "-"}${formatNumber(Math.abs(netChange))}`}
          change={churnPoints.length ? `over ${days} days` : undefined}
          changeDirection={netChange >= 0 ? "up" : "down"}
        />
        <SB_MetricCard
          title="Churn Ratio"
          value={churnRatio === null ? "—" : churnRatio.toFixed(2)}
        />
      </div>

      {churnError && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Follower churn unavailable</strong>
            <p className="text-xs text-muted mt-2 leading-relaxed">{churnError}</p>
          </SB_Card>
        </div>
      )}

      {groupedChart.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">
              Follows vs Unfollows ({grouping === "day" ? "daily" : "monthly"})
            </strong>
            <div className="mt-3">
              <SB_LineChart
                data={groupedChart}
                lines={[
                  { dataKey: "follows", color: "#22b573", name: "Follows" },
                  { dataKey: "unfollows", color: "#e84a5f", name: "Unfollows" },
                ]}
                height={260}
                showLegend
              />
            </div>
            {grouping === "month" && groupedChart.length < 2 && (
              <p className="text-[11px] text-muted mt-3">
                The selected range covers one calendar month, so the monthly view
                has a single point. Widen the range to compare months.
              </p>
            )}
          </SB_Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        <SB_Card>
          <strong className="text-sm">Follower Total</strong>
          {followerChart.length > 1 ? (
            <div className="mt-3">
              <SB_LineChart
                data={followerChart}
                lines={[{ dataKey: "followers", color: "#356df3", name: "Followers" }]}
                height={240}
                yDomain={followerDomain}
                yTickFormatter={(v) => v.toLocaleString()}
              />
            </div>
          ) : (
            <p className="text-xs text-muted mt-2 leading-relaxed">
              The warehouse holds{" "}
              {followerChart.length === 1 ? "a single day" : "no days"} in this
              window, so there is no line to draw yet. The nightly ingestion job
              adds one point per day.
            </p>
          )}
        </SB_Card>

        <SB_Card>
          <strong className="text-sm">Conversion Actions</strong>
          {ctaPoints.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              No conversion data for this range
            </div>
          ) : (
            <SB_MiniList
              className="mt-3"
              items={[
                { label: "Total Actions", value: <b>{formatNumber(ctaTotal)}</b> },
                { label: "Days Counted", value: <b>{formatNumber(ctaPoints.length)}</b> },
              ]}
            />
          )}
        </SB_Card>
      </div>
    </>
  );
}

// ─── Posts Tab ──────────────────────────────────────────────

function PostsTab({ pageId }: { pageId: string }) {
  const { startDate, endDate, label } = useDateRange();
  const [selected, setSelected] = useState<StoredPostDto | null>(null);

  // The list comes from the warehouse: no Graph call, so it costs no rate
  // limit and can poll. The per-post metrics behind a row are the expensive
  // part, so they load only when a post is opened — see SB_PostDetail.
  // Filtered server-side: warehouse/posts bounds created_time with from/to,
  // so the window is applied in SQL rather than by discarding rows here.
  const { data: posts, loading, error, lastUpdated, isLive, setLive } = useLiveData<StoredPostDto[]>(
    () => fb.getStoredPosts(pageId, startDate, endDate),
    [pageId, startDate, endDate],
    { interval: POLL_INTERVAL }
  );

  // Hooks must run on every render, so pagination is computed before the
  // early returns below rather than after them.
  const paged = usePagination<StoredPostDto>(posts, undefined, `${pageId}:${startDate}`);

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading posts...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;
  if (!posts || posts.length === 0)
    return (
      <div className="text-center py-16 text-muted text-sm">
        No posts published in this window ({label.toLowerCase()}).
      </div>
    );

  const columns: Column<StoredPostDto>[] = [
    {
      header: "Post",
      // No thumbnail: full_picture is a signed CDN url that expires roughly two
      // days after Meta mints it, so a stored one is dead more often than not.
      accessor: (row) => (
        <div className="max-w-[420px] truncate text-[13px]">
          {row.message || <span className="text-muted italic">No text</span>}
        </div>
      ),
    },
    {
      header: "Type",
      // Meta's raw status_type is kept in the tooltip so nothing is lost.
      accessor: (row) => (
        <span title={row.type ?? "unknown status_type"}>
          <SB_Badge variant="facebook">{postTypeLabel(row.type)}</SB_Badge>
        </span>
      ),
    },
    {
      header: "Date",
      accessor: (row) =>
        row.createdTime ? new Date(row.createdTime).toLocaleDateString() : "—",
    },
    { header: "Shares", accessor: (row) => formatNumber(row.sharesCount), className: "text-right" },
    {
      header: "Link",
      accessor: (row) =>
        row.permalinkUrl ? (
          <a
            href={row.permalinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            // The row itself opens the metrics modal, so the link has to stop
            // the click bubbling or every "view post" also pops a dialog.
            onClick={(e) => e.stopPropagation()}
            className="text-brand hover:underline text-xs whitespace-nowrap"
          >
            View ↗
          </a>
        ) : (
          <span className="text-muted text-xs">—</span>
        ),
    },
    {
      header: "",
      accessor: () => <span className="text-brand text-xs whitespace-nowrap">Metrics →</span>,
      className: "text-right",
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>

      <SB_Card>
        <div className="flex items-baseline justify-between gap-3">
          <strong className="text-sm">
            Posts ({posts.length}) · {label}
          </strong>
          <span className="text-[11px] text-muted">
            Select a row for live metrics, or View to open it on Facebook
          </span>
        </div>
        <div className="mt-3">
          <SB_DataTable columns={columns} data={paged.pageItems} onRowClick={setSelected} />
        </div>
        <SB_Pagination
          label="posts"
          page={paged.page}
          pageCount={paged.pageCount}
          pageSize={paged.pageSize}
          total={paged.total}
          firstShown={paged.firstShown}
          lastShown={paged.lastShown}
          onPageChange={paged.setPage}
          onPageSizeChange={paged.setPageSize}
        />
      </SB_Card>

      <SB_Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected?.message
            ? selected.message.slice(0, 80) + (selected.message.length > 80 ? "…" : "")
            : "Post"
        }
        subtitle={
          selected
            ? [
                postTypeLabel(selected.type),
                selected.createdTime
                  ? new Date(selected.createdTime).toLocaleString()
                  : null,
                selected.isDeleted ? "deleted" : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
        maxWidth="980px"
      >
        {selected && (
          <>
            {selected.permalinkUrl && (
              <a
                href={selected.permalinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline text-xs mb-3 inline-block"
              >
                View on Facebook ↗
              </a>
            )}
            <SB_PostDetail post={selected} />
          </>
        )}
      </SB_Modal>
    </>
  );
}

// ─── Videos Tab ─────────────────────────────────────────────

interface VideosData {
  videos: PageVideoDto[];
  videoMetrics: PageVideoMetricsSeries | null;
}

function VideosTab({ pageId }: { pageId: string }) {
  const { startDate, endDate, label } = useDateRange();

  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<VideosData>(
    async () => {
      const [vidRes, metRes] = await Promise.allSettled([
        // The videos endpoint takes no date parameters — only pageId — so the
        // catalogue arrives whole and the window is applied below.
        fb.getPageVideos(pageId),
        fb.getPageVideoMetrics(pageId, startDate, endDate),
      ]);
      return {
        videos: vidRes.status === "fulfilled" ? vidRes.value : [],
        videoMetrics: metRes.status === "fulfilled" ? metRes.value : null,
      };
    },
    [pageId, startDate, endDate],
    { interval: 300_000, enabled: false }
  );

  const { videos: allVideos = [], videoMetrics = null } = data ?? {};

  // Filtered client-side because the endpoint offers no date bounds. Keeping
  // the full catalogue lets the empty state explain itself rather than just
  // reporting nothing.
  const videos = allVideos.filter((v) => {
    if (!v.createdTime) return false;
    const day = v.createdTime.slice(0, 10);
    return day >= startDate && day <= endDate;
  });

  // Daily counts, so the window's figure is their sum.
  const sumVideo = (pick: (m: PageVideoMetricsDto) => number | undefined) =>
    (videoMetrics?.points ?? []).reduce(
      (total, p) => total + (pick(p.metrics) ?? 0),
      0
    );

  const newestVideo = allVideos
    .map((v) => v.createdTime)
    .filter(Boolean)
    .sort()
    .pop();

  // Hooks run unconditionally, so this sits above the early returns.
  const paged = usePagination<PageVideoDto>(
    videos,
    undefined,
    `${pageId}:${startDate}`
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading videos...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const columns: Column<PageVideoDto>[] = [
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
    {
      header: "Published",
      accessor: (row) =>
        row.createdTime ? new Date(row.createdTime).toLocaleDateString() : "—",
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>
      {videoMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4">
          <SB_MetricCard title="Total Views" value={formatNumber(sumVideo((m) => m.videoViews))} />
          <SB_MetricCard title="Organic Views" value={formatNumber(sumVideo((m) => m.videoViewsOrganic))} />
          <SB_MetricCard title="30s Completes" value={formatNumber(sumVideo((m) => m.videoCompleteViews30s))} />
          <SB_MetricCard
            title="Watch Time"
            value={`${Math.round(sumVideo((m) => m.videoViewTimeMs) / 60000)}m`}
          />
        </div>
      )}
      <SB_Card>
        <strong className="text-sm">
          Videos ({videos.length}) · {label}
        </strong>
        {videos.length > 0 ? (
          <>
            <div className="mt-3">
              <SB_DataTable columns={columns} data={paged.pageItems} />
            </div>
            <SB_Pagination
              label="videos"
              page={paged.page}
              pageCount={paged.pageCount}
              pageSize={paged.pageSize}
              total={paged.total}
              firstShown={paged.firstShown}
              lastShown={paged.lastShown}
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </>
        ) : (
          <div className="text-center py-8 text-muted text-sm">
            {allVideos.length === 0 ? (
              "No videos on this page"
            ) : (
              <>
                None of this page&apos;s {formatNumber(allVideos.length)} videos were
                published in this window.
                {newestVideo && (
                  <>
                    {" "}
                    The most recent was{" "}
                    {new Date(newestVideo).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                    .
                  </>
                )}
                <div className="mt-1 text-[11px]">
                  The view counts above still cover {label.toLowerCase()} — an old
                  catalogue keeps earning views.
                </div>
              </>
            )}
          </div>
        )}
      </SB_Card>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function FacebookPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    pages,
    selectedPage,
    setPage,
    needsLogin,
    loginUrl,
    syncPages,
    syncing,
    loading,
    error,
  } = useFbAccount();

  const pageId = selectedPage?.pageId;

  const renderTab = useCallback(() => {
    if (!pageId) return null;
    switch (activeTab) {
      case "overview":   return <OverviewTab pageId={pageId} />;
      case "audience":   return <AudienceTab pageId={pageId} />;
      case "posts":      return <PostsTab pageId={pageId} />;
      case "videos":     return <VideosTab pageId={pageId} />;
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

      {/* Page selector. The Meta account is resolved by the hook and sent as
          X-Account-Id on every call — it has no picker because it is not a
          choice the dashboard asks anyone to make. */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {loading ? (
          <span className="text-sm text-muted">Loading pages...</span>
        ) : (
          <>
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
            {/* Re-runs discovery against Meta and re-reads the registry. Slow
                — one SQL statement per business and per page — so it stays a
                deliberate action rather than something the page does on load. */}
            {!needsLogin && (
              <button
                type="button"
                onClick={syncPages}
                disabled={syncing}
                className="text-xs text-brand hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {syncing ? "Syncing pages..." : "Sync pages"}
              </button>
            )}
          </>
        )}
      </div>

      <SB_Tabs
        tabs={[
          { label: "Overview", value: "overview" },
          { label: "Audience", value: "audience" },
          { label: "Posts", value: "posts" },
          { label: "Videos", value: "videos" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {loading ? (
        <div className="text-center py-16 text-muted text-sm">Loading pages...</div>
      ) : error ? (
        <div className="text-center py-16 text-red text-sm">{error}</div>
      ) : needsLogin ? (
        <div className="text-center py-16 text-muted text-sm">
          No Meta account is linked.{" "}
          <a href={loginUrl} className="text-brand hover:underline">
            Open the Facebook login
          </a>{" "}
          to link one — it must run in a real browser tab, not a fetch.
        </div>
      ) : !pageId ? (
        <div className="text-center py-16 text-muted text-sm">
          No Facebook page found for this account. Try a page sync.
        </div>
      ) : (
        renderTab()
      )}
    </>
  );
}
