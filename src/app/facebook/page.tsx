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
  PageNegativeFeedbackDto,
  PageDemographicDto,
  PageLikeSourceDto,
  PageStoryMetricsDto,
  PageFanChurnDto,
  PageVideoDto,
  StoredPostDto,
  PageMetricPointDto,
} from "@/types/facebook";
import type { TimeSeriesResponse } from "@/types/api";

const POLL_INTERVAL = 15_000; // 15 seconds

// ─── Overview Tab ───────────────────────────────────────────

interface OverviewData {
  insights: PageInsightsDto | null;
  followers: PageFollowersDto | null;
  videoMetrics: PageVideoMetricsDto | null;
  reactions: PageReactionsDailyDto | null;
  negative: PageNegativeFeedbackDto | null;
  history: TimeSeriesResponse<PageMetricPointDto> | null;
}

function OverviewTab({ pageId }: { pageId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<OverviewData>(
    async () => {
      const [insRes, folRes, vidRes, reactRes, negRes, histRes] = await Promise.allSettled([
        fb.getPageInsights(pageId) as Promise<PageInsightsDto>,
        fb.getPageFollowers(pageId),
        fb.getPageVideoMetrics(pageId),
        fb.getPageReactionsDaily(pageId),
        fb.getPageNegativeFeedback(pageId),
        fb.getPageMetricsHistory(pageId),
      ]);
      return {
        insights: insRes.status === "fulfilled" ? insRes.value : null,
        followers: folRes.status === "fulfilled" ? folRes.value : null,
        videoMetrics: vidRes.status === "fulfilled" ? vidRes.value : null,
        reactions: reactRes.status === "fulfilled" ? reactRes.value : null,
        negative: negRes.status === "fulfilled" ? negRes.value : null,
        history: histRes.status === "fulfilled" ? histRes.value : null,
      };
    },
    [pageId],
    { interval: POLL_INTERVAL }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading overview data...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const { insights, followers, videoMetrics, reactions, negative, history } = data ?? {};

  const chartData = history?.points?.map((p) => ({
    label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    followers: p.followersCount,
    reach: p.reach,
    engagements: p.postEngagements,
  })) ?? [];

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

      {chartData.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Page Metrics Over Time</strong>
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
          <strong className="text-sm">Video Performance</strong>
          <SB_MiniList
            className="mt-3"
            items={
              videoMetrics
                ? [
                    { label: "Total Views", value: <b>{formatNumber(videoMetrics.videoViews)}</b> },
                    { label: "Paid Views", value: <b>{formatNumber(videoMetrics.videoViewsPaid)}</b> },
                    { label: "Organic Views", value: <b>{formatNumber(videoMetrics.videoViewsOrganic)}</b> },
                    { label: "Unique Views", value: <b>{formatNumber(videoMetrics.videoViewsUnique)}</b> },
                    { label: "30s Complete Views", value: <b>{formatNumber(videoMetrics.videoCompleteViews30s)}</b> },
                    { label: "Total Watch Time", value: <b>{Math.round(videoMetrics.videoViewTimeMs / 60000)} min</b> },
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

      {negative && negative.totalNegative > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Negative Feedback</strong>
            <SB_MiniList
              className="mt-3"
              items={[
                { label: "Hide Clicks", value: <b>{formatNumber(negative.hideClicks)}</b> },
                { label: "Hide All Clicks", value: <b>{formatNumber(negative.hideAllClicks)}</b> },
                { label: "Report Spam", value: <b>{formatNumber(negative.reportSpamClicks)}</b> },
                { label: "Unlike Page", value: <b>{formatNumber(negative.unlikePageClicks)}</b> },
                { label: "Total", value: <b>{formatNumber(negative.totalNegative)}</b> },
              ]}
            />
          </SB_Card>
        </div>
      )}
    </>
  );
}

// ─── Content Tab ────────────────────────────────────────────

function ContentTab({ pageId }: { pageId: string }) {
  const { data: posts, loading, error, lastUpdated, isLive, setLive } = useLiveData<StoredPostDto[]>(
    () => fb.getStoredPosts(pageId),
    [pageId],
    { interval: POLL_INTERVAL }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading posts...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;
  if (!posts || posts.length === 0) return <div className="text-center py-16 text-muted text-sm">No posts found</div>;

  const columns: Column<StoredPostDto>[] = [
    {
      header: "Post",
      accessor: (row) => (
        <div className="max-w-[300px] truncate text-[13px]">
          {row.message || <span className="text-muted italic">No text</span>}
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (row) => <SB_Badge variant="facebook">{row.type || "post"}</SB_Badge>,
    },
    { header: "Date", accessor: (row) => new Date(row.createdTime).toLocaleDateString() },
    { header: "Shares", accessor: (row) => formatNumber(row.sharesCount), className: "text-right" },
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

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>
      <SB_Card>
        <strong className="text-sm">Published Content ({posts.length})</strong>
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
  likeSources: PageLikeSourceDto[];
}

function AudienceTab({ pageId }: { pageId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<AudienceData>(
    async () => {
      const [demRes, churnRes, srcRes] = await Promise.allSettled([
        fb.getPageDemographics(pageId),
        fb.getPageFanChurn(pageId),
        fb.getPageLikeSources(pageId),
      ]);
      return {
        demographics: demRes.status === "fulfilled" ? demRes.value : [],
        fanChurn: churnRes.status === "fulfilled" ? churnRes.value : null,
        likeSources: srcRes.status === "fulfilled" ? srcRes.value : [],
      };
    },
    [pageId],
    { interval: POLL_INTERVAL }
  );

  if (loading) return <div className="text-center py-16 text-muted text-sm">Loading audience data...</div>;
  if (error) return <div className="text-center py-16 text-red text-sm">{error}</div>;

  const { demographics = [], fanChurn = null, likeSources = [] } = data ?? {};

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
            <div className="text-center py-8 text-muted text-sm">No demographic data</div>
          )}
        </SB_Card>

        <SB_Card>
          <strong className="text-sm">Fan Growth</strong>
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
              <div className="text-center py-6 text-muted text-sm">No country data</div>
            )}
          </div>
        </SB_Card>

        <SB_Card>
          <strong className="text-sm">Top Cities</strong>
          {topCities.length > 0 ? (
            <SB_MiniList className="mt-3" items={topCities.map((c) => ({ label: c.dimension, value: <b>{formatNumber(c.count)}</b> }))} />
          ) : (
            <div className="text-center py-6 text-muted text-sm">No city data</div>
          )}
        </SB_Card>
      </div>

      {likeSources.length > 0 && (
        <div className="mt-4">
          <SB_Card>
            <strong className="text-sm">Where Likes Come From</strong>
            <SB_MiniList
              className="mt-3"
              items={[...likeSources].sort((a, b) => b.fanCount - a.fanCount).slice(0, 10).map((s) => ({
                label: s.source, value: <b>{formatNumber(s.fanCount)}</b>,
              }))}
            />
          </SB_Card>
        </div>
      )}
    </>
  );
}

// ─── Videos Tab ─────────────────────────────────────────────

interface VideosData {
  videos: PageVideoDto[];
  videoMetrics: PageVideoMetricsDto | null;
}

function VideosTab({ pageId }: { pageId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } = useLiveData<VideosData>(
    async () => {
      const [vidRes, metRes] = await Promise.allSettled([
        fb.getPageVideos(pageId),
        fb.getPageVideoMetrics(pageId),
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
    { header: "Published", accessor: (row) => new Date(row.createdTime).toLocaleDateString() },
  ];

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator isLive={isLive} lastUpdated={lastUpdated} onToggle={setLive} />
      </div>
      {videoMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-4">
          <SB_MetricCard title="Total Views" value={formatNumber(videoMetrics.videoViews)} />
          <SB_MetricCard title="Paid Views" value={formatNumber(videoMetrics.videoViewsPaid)} />
          <SB_MetricCard title="Organic Views" value={formatNumber(videoMetrics.videoViewsOrganic)} />
          <SB_MetricCard title="Unique Views" value={formatNumber(videoMetrics.videoViewsUnique)} />
          <SB_MetricCard title="30s Completes" value={formatNumber(videoMetrics.videoCompleteViews30s)} />
          <SB_MetricCard title="Watch Time" value={`${Math.round(videoMetrics.videoViewTimeMs / 60000)}m`} />
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
