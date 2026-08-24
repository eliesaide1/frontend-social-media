"use client";

import { useState } from "react";
import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Tabs from "@/components/ui/SB_Tabs";
import SB_MetricCard from "@/components/ui/SB_MetricCard";
import SB_Card from "@/components/ui/SB_Card";
import SB_MiniList from "@/components/ui/SB_MiniList";
import SB_DataTable, { Column } from "@/components/ui/SB_DataTable";
import SB_LineChart from "@/components/charts/SB_LineChart";
import SB_Select from "@/components/ui/SB_Select";
import SB_Badge from "@/components/ui/SB_Badge";
import SB_LiveIndicator from "@/components/ui/SB_LiveIndicator";
import { formatNumber } from "@/lib/utils";
import { useIgAccount } from "@/hooks/useIgAccount";
import { useLiveData } from "@/hooks/useLiveData";
import { IG_OVERVIEW_METRICS, CHART_COLORS } from "@/lib/constants";
import * as ig from "@/services/instagramService";
import type { IgInsight, IgMedia, IgUserProfile } from "@/types/instagram";

/**
 * Polling is off by default and slow when on: unlike the Facebook page, which
 * reads a warehouse, every call here hits the Graph API live and counts against
 * the account's call quota. The service throttles itself above 80% usage, so a
 * 15s poll would spend the budget on a dashboard nobody is watching.
 */
const POLL_INTERVAL = 60_000;

const IG_PINK = CHART_COLORS.instagram;

// ─── Helpers ─────────────────────────────────────────────────

/** Total a daily metric across the whole requested window. */
function sumMetric(insights: IgInsight[] | null, name: string): number | null {
  const insight = insights?.find((i) => i.name === name);
  if (!insight) return null;
  return insight.values.reduce((acc, v) => acc + (v.value ?? 0), 0);
}

/** Render a metric value, or an em dash when the API did not return it. */
function metricValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : formatNumber(value);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Fold the per-metric series the API returns into the row-per-day shape the
 * chart wants, keyed on the shared `endTime`.
 */
function toChartRows(
  insights: IgInsight[] | null,
  metrics: string[]
): Record<string, string | number>[] {
  if (!insights) return [];
  const byDate = new Map<string, Record<string, string | number>>();

  for (const metric of metrics) {
    const insight = insights.find((i) => i.name === metric);
    if (!insight) continue;
    for (const point of insight.values) {
      const row = byDate.get(point.endTime) ?? {
        label: shortDate(point.endTime),
      };
      row[metric] = point.value ?? 0;
      byDate.set(point.endTime, row);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

/** The last `days` days as Unix seconds, which is what the insights route takes. */
function unixWindow(days: number): { since: number; until: number } {
  const until = Math.floor(Date.now() / 1000);
  return { since: until - days * 86_400, until };
}

function StateMessage({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "red" }) {
  return (
    <div
      className={`text-center py-16 text-sm ${
        tone === "red" ? "text-red" : "text-muted"
      }`}
    >
      {children}
    </div>
  );
}

// ─── Overview tab ────────────────────────────────────────────

interface OverviewData {
  profile: IgUserProfile | null;
  insights: IgInsight[] | null;
}

function OverviewTab({ igUserId }: { igUserId: string }) {
  const { data, loading, error, lastUpdated, isLive, setLive } =
    useLiveData<OverviewData>(
      async () => {
        const { since, until } = unixWindow(30);
        // allSettled, not all: insights 403 on their own when the token lacks
        // instagram_manage_insights, and the profile is still worth showing.
        const [profileRes, insightsRes] = await Promise.allSettled([
          ig.getProfile(igUserId),
          ig.getAccountInsights(
            igUserId,
            [...IG_OVERVIEW_METRICS],
            "day",
            since,
            until
          ),
        ]);
        return {
          profile: profileRes.status === "fulfilled" ? profileRes.value : null,
          insights:
            insightsRes.status === "fulfilled" ? insightsRes.value : null,
        };
      },
      [igUserId],
      { interval: POLL_INTERVAL, enabled: false }
    );

  if (loading) return <StateMessage>Loading Instagram overview…</StateMessage>;
  if (error) return <StateMessage tone="red">{error}</StateMessage>;

  const { profile, insights } = data ?? {};

  const chartRows = toChartRows(insights ?? null, [
    "views",
    "accounts_engaged",
  ]);

  return (
    <>
      <div className="flex justify-end mb-3">
        <SB_LiveIndicator
          isLive={isLive}
          lastUpdated={lastUpdated}
          onToggle={setLive}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <SB_MetricCard
          title="Followers"
          value={metricValue(profile?.followersCount)}
        />
        <SB_MetricCard
          title="Views (30d)"
          value={metricValue(sumMetric(insights ?? null, "views"))}
        />
        <SB_MetricCard
          title="Accounts Engaged (30d)"
          value={metricValue(sumMetric(insights ?? null, "accounts_engaged"))}
        />
        <SB_MetricCard
          title="Interactions (30d)"
          value={metricValue(sumMetric(insights ?? null, "total_interactions"))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        <SB_Card>
          <strong>Performance Over Time</strong>
          <div className="mt-4">
            {chartRows.length > 0 ? (
              <SB_LineChart
                data={chartRows}
                lines={[
                  { dataKey: "views", color: IG_PINK, name: "Views" },
                  {
                    dataKey: "accounts_engaged",
                    color: CHART_COLORS.purple,
                    name: "Accounts Engaged",
                  },
                ]}
                height={280}
                showLegend
              />
            ) : (
              <StateMessage>
                No account insights returned for the last 30 days.
              </StateMessage>
            )}
          </div>
        </SB_Card>

        <SB_Card>
          <strong>Engagement (30d)</strong>
          <SB_MiniList
            className="mt-3"
            items={[
              {
                label: "Likes",
                value: <b>{metricValue(sumMetric(insights ?? null, "likes"))}</b>,
              },
              {
                label: "Comments",
                value: (
                  <b>{metricValue(sumMetric(insights ?? null, "comments"))}</b>
                ),
              },
              {
                label: "Shares",
                value: (
                  <b>{metricValue(sumMetric(insights ?? null, "shares"))}</b>
                ),
              },
              {
                label: "Saves",
                value: <b>{metricValue(sumMetric(insights ?? null, "saves"))}</b>,
              },
            ]}
          />
        </SB_Card>
      </div>
    </>
  );
}

// ─── Media table, shared by Content / Stories / Reels ────────

function mediaColumns(): Column<IgMedia>[] {
  return [
    {
      header: "Post",
      accessor: (row) => (
        <div className="flex items-center gap-2.5 min-w-[220px]">
          {(row.thumbnailUrl || row.mediaUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.thumbnailUrl || row.mediaUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-line shrink-0"
            />
          )}
          <span className="line-clamp-2 text-[13px]">
            {row.caption?.trim() || <span className="text-muted">No caption</span>}
          </span>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (row) => <SB_Badge variant="instagram">{row.mediaType}</SB_Badge>,
    },
    { header: "Likes", accessor: (row) => formatNumber(row.likeCount ?? 0) },
    {
      header: "Comments",
      accessor: (row) => formatNumber(row.commentsCount ?? 0),
    },
    {
      header: "Published",
      accessor: (row) => (row.timestamp ? shortDate(row.timestamp) : "—"),
    },
    {
      header: "",
      accessor: (row) =>
        row.permalink ? (
          <a
            href={row.permalink}
            target="_blank"
            rel="noreferrer"
            className="text-[#d92f8b] font-bold text-xs"
          >
            Open ↗
          </a>
        ) : null,
    },
  ];
}

function MediaTable({
  media,
  emptyMessage,
}: {
  media: IgMedia[];
  emptyMessage: string;
}) {
  if (media.length === 0) return <StateMessage>{emptyMessage}</StateMessage>;
  return <SB_DataTable columns={mediaColumns()} data={media} />;
}

// ─── Content tab ─────────────────────────────────────────────

function ContentTab({ igUserId }: { igUserId: string }) {
  const { data, loading, error } = useLiveData<IgMedia[]>(
    async () => {
      const page = await ig.getAccountMedia(igUserId, 50);
      return page?.data ?? [];
    },
    [igUserId],
    { interval: POLL_INTERVAL, enabled: false }
  );

  if (loading) return <StateMessage>Loading media…</StateMessage>;
  if (error) return <StateMessage tone="red">{error}</StateMessage>;

  return (
    <SB_Card>
      <strong>Recent Media</strong>
      <div className="mt-3">
        <MediaTable
          media={data ?? []}
          emptyMessage="No media returned for this account."
        />
      </div>
    </SB_Card>
  );
}

// ─── Reels tab ───────────────────────────────────────────────

function ReelsTab({ igUserId }: { igUserId: string }) {
  const { data, loading, error } = useLiveData<IgMedia[]>(
    async () => {
      const page = await ig.getAccountMedia(igUserId, 50);
      // The service maps the C# MediaType enum with ToString(), so reels come
      // back as "Reel" rather than the Graph API's "REELS".
      return (page?.data ?? []).filter((m) => m.mediaType === "Reel");
    },
    [igUserId],
    { interval: POLL_INTERVAL, enabled: false }
  );

  if (loading) return <StateMessage>Loading reels…</StateMessage>;
  if (error) return <StateMessage tone="red">{error}</StateMessage>;

  return (
    <SB_Card>
      <strong>Reels</strong>
      <div className="mt-3">
        <MediaTable
          media={data ?? []}
          emptyMessage="No reels in the 50 most recent media."
        />
      </div>
    </SB_Card>
  );
}

// ─── Stories tab ─────────────────────────────────────────────

function StoriesTab({ igUserId }: { igUserId: string }) {
  const { data, loading, error } = useLiveData<IgMedia[]>(
    () => ig.getStories(igUserId),
    [igUserId],
    { interval: POLL_INTERVAL, enabled: false }
  );

  if (loading) return <StateMessage>Loading stories…</StateMessage>;
  if (error) return <StateMessage tone="red">{error}</StateMessage>;

  return (
    <SB_Card>
      <strong>Active Stories</strong>
      <p className="text-muted text-[13px] mt-1 mb-0">
        Stories are ephemeral — this endpoint only returns the ones still live.
      </p>
      <div className="mt-3">
        <MediaTable
          media={data ?? []}
          emptyMessage="No stories are currently active."
        />
      </div>
    </SB_Card>
  );
}

// ─── Audience tab ────────────────────────────────────────────

function AudienceTab({ igUserId }: { igUserId: string }) {
  const { data, loading, error } = useLiveData<IgUserProfile>(
    () => ig.getProfile(igUserId),
    [igUserId],
    { interval: POLL_INTERVAL, enabled: false }
  );

  if (loading) return <StateMessage>Loading audience…</StateMessage>;
  if (error) return <StateMessage tone="red">{error}</StateMessage>;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <SB_MetricCard
          title="Followers"
          value={metricValue(data?.followersCount)}
        />
        <SB_MetricCard
          title="Following"
          value={metricValue(data?.followsCount)}
        />
        <SB_MetricCard title="Posts" value={metricValue(data?.mediaCount)} />
        <SB_MetricCard title="Account Type" value={data?.accountType || "—"} />
      </div>

      <SB_Card className="mt-4">
        <strong>Follower Demographics</strong>
        <p className="text-muted text-[13px] mt-2 mb-0">
          Age, gender, city and country breakdowns are not available yet. The
          backend implements them —{" "}
          <code className="text-[12px]">
            IInsightsAppService.GetFollowerDemographicsAsync
          </code>{" "}
          — but no controller route exposes them, so there is nothing for the
          dashboard to call. Adding a route to{" "}
          <code className="text-[12px]">InsightsController</code> would light
          this panel up.
        </p>
      </SB_Card>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function InstagramPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { accounts, selectedAccount, setAccount } = useIgAccount();

  const igUserId = selectedAccount?.igUserId ?? "";

  if (!selectedAccount) {
    return (
      <>
        <SB_PageHeader
          title="Instagram Overview"
          description="Detailed Instagram analytics."
        />
        <StateMessage tone="red">
          No Instagram accounts configured. Set NEXT_PUBLIC_IG_ACCOUNTS or edit
          IG_ACCOUNTS in src/lib/constants.ts.
        </StateMessage>
      </>
    );
  }

  return (
    <>
      <SB_PageHeader
        title="Instagram Overview"
        description={`@${selectedAccount.name} · Detailed Instagram analytics.`}
      />

      {accounts.length > 1 && (
        <div className="mb-3">
          <SB_Select
            options={accounts.map((a) => ({
              label: `@${a.name}`,
              value: a.igUserId,
            }))}
            value={selectedAccount.igUserId}
            onChange={setAccount}
          />
        </div>
      )}

      <SB_Tabs
        tabs={[
          { label: "Overview", value: "overview" },
          { label: "Content", value: "content" },
          { label: "Audience", value: "audience" },
          { label: "Stories", value: "stories" },
          { label: "Reels", value: "reels" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Keyed on igUserId so switching account refetches instead of showing stale data */}
      {activeTab === "overview" && (
        <OverviewTab key={igUserId} igUserId={igUserId} />
      )}
      {activeTab === "content" && (
        <ContentTab key={igUserId} igUserId={igUserId} />
      )}
      {activeTab === "audience" && (
        <AudienceTab key={igUserId} igUserId={igUserId} />
      )}
      {activeTab === "stories" && (
        <StoriesTab key={igUserId} igUserId={igUserId} />
      )}
      {activeTab === "reels" && <ReelsTab key={igUserId} igUserId={igUserId} />}
    </>
  );
}
