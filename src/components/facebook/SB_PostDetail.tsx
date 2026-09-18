"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, User } from "lucide-react";
import SB_Card from "@/components/ui/SB_Card";
import SB_MetricCard from "@/components/ui/SB_MetricCard";
import SB_MiniList from "@/components/ui/SB_MiniList";
import SB_Badge from "@/components/ui/SB_Badge";
import SB_DonutChart from "@/components/charts/SB_DonutChart";
import SB_LineChart from "@/components/charts/SB_LineChart";
import { formatNumber, formatDuration } from "@/lib/utils";
import * as fb from "@/services/facebookService";
import { sqlPostDetail } from "@/server/facebookActions";
import { useRealtime } from "@/hooks/useRealtime";
import type { PostDetail } from "@/server/queries/postDetail";
import type { StoredPostDto } from "@/types/facebook";

/** Meta's status_type values that mean the post carries a video. */
const VIDEO_TYPES = new Set(["added_video", "video"]);

const REACTION_COLORS: Record<string, string> = {
  Like: "#356df3",
  Love: "#ef4b9a",
  Wow: "#ff9f43",
  Haha: "#22b573",
  Sad: "#8a96aa",
  Angry: "#e84a5f",
};

/**
 * Opening a post reads the warehouse — no Graph calls.
 *
 * The API stores every post read it makes, and nightly ingestion reads each post's
 * likes, reactions, comments, engagement, attachments and video metrics, so the
 * figures here are as of the last ingestion or the last webhook.
 *
 * Webhook events for this post re-read the warehouse automatically while the modal
 * is open, so a new comment or reaction appears without touching anything.
 *
 * "Refresh from Facebook" is the one deliberate exception: it goes through the API,
 * which asks Meta and stores the answers, then re-reads the warehouse. The modal
 * never renders the API's reply directly, so what it shows is always what is stored.
 */
export default function SB_PostDetail({
  post,
  accountId,
}: {
  post: StoredPostDto;
  accountId: string | null;
}) {
  const [data, setData] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Loading starts true and the page keys this component by post id, so a new
    // post always mounts fresh; a reload keeps the current figures on screen.
    let cancelled = false;

    sqlPostDetail(post.pageId, post.postId, accountId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not load metrics for this post.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [post.pageId, post.postId, accountId, reloadKey]);

  /**
   * Live updates: when a webhook event lands for THIS post, re-read SQL.
   *
   * The API stores the change before it emits the event, so the re-read sees it.
   * Events for other posts on the page are ignored. Reactions tend to arrive in
   * bursts, so re-reads are debounced rather than fired once per event.
   */
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  useRealtime({
    pageId: post.pageId,
    events: ["EngagementChanged", "CommentChanged", "PostChanged"],
    onEvent: (event) => {
      if (!("postId" in event) || event.postId !== post.postId) return;
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => setReloadKey((k) => k + 1), 600);
    },
  });

  /**
   * Asks Meta through the API — roughly ten Graph calls, six of them for reactions
   * alone — then re-reads SQL. allSettled because several reads depend on
   * permissions the token may not carry; whatever succeeded has been stored.
   */
  const refreshFromFacebook = async () => {
    setRefreshing(true);
    const postId = post.postId;
    await Promise.allSettled([
      fb.getPostLikes(postId, true),
      fb.getPostReactions(postId, true),
      fb.getPostEngagement(postId),
      fb.getPostComments(postId, true),
      fb.getPostAttachments(postId),
      VIDEO_TYPES.has(post.type ?? "") ? fb.getPostVideoMetrics(postId) : Promise.resolve(null),
    ]);
    setRefreshing(false);
    setReloadKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-muted text-sm">
        Loading post metrics...
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-16 text-red text-sm">{error}</div>;
  }

  const { likes, reactions, engagement, comments = [], attachments = [], video, history, metricsDate } =
    data ?? ({} as Partial<PostDetail>);

  const reactionsDonut = reactions
    ? [
        { name: "Like", value: reactions.like, color: REACTION_COLORS.Like },
        { name: "Love", value: reactions.love, color: REACTION_COLORS.Love },
        { name: "Wow", value: reactions.wow, color: REACTION_COLORS.Wow },
        { name: "Haha", value: reactions.haha, color: REACTION_COLORS.Haha },
        { name: "Sad", value: reactions.sad, color: REACTION_COLORS.Sad },
        { name: "Angry", value: reactions.angry, color: REACTION_COLORS.Angry },
      ].filter((r) => r.value > 0)
    : [];

  const historyChart = (history?.points ?? []).map((p) => ({
    label: new Date(p.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
  }));

  const clicksByType = Object.entries(engagement?.clicksByType ?? {}).filter(
    ([, value]) => value > 0
  );

  return (
    <div className="grid gap-4">
      {/* Stored figures, current as of the last ingestion or webhook. Refresh asks
          Meta through the API, which stores the answer, then re-reads SQL. */}
      <div className="flex items-center justify-end gap-3 -mb-1">
        <span className="text-[11px] text-muted">
          {metricsDate ? `Stored data as of ${metricsDate}` : "No stored metrics for this post yet"}
        </span>
        <button
          type="button"
          onClick={refreshFromFacebook}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline disabled:opacity-50 disabled:no-underline"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh from Facebook"}
        </button>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <SB_MetricCard
          title="Likes"
          value={likes ? formatNumber(likes.likes) : "—"}
        />
        <SB_MetricCard
          title="Reactions"
          value={reactions ? formatNumber(reactions.total) : "—"}
        />
        {/* post-comments returns Facebook's first page only, so this is a
            floor rather than a total — the "+" says so without overclaiming. */}
        <SB_MetricCard
          title="Comments"
          value={comments.length >= 25 ? "25+" : formatNumber(comments.length)}
        />
        <SB_MetricCard title="Shares" value={formatNumber(post.sharesCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* Engagement — the real numbers, unlike post-insights */}
        <SB_Card>
          <strong className="text-sm">Engagement</strong>
          {engagement ? (
            <>
              <SB_MiniList
                className="mt-3"
                items={[
                  { label: "Clicks", value: <b>{formatNumber(engagement.clicks)}</b> },
                  { label: "Activity", value: <b>{formatNumber(engagement.activity)}</b> },
                ]}
              />
              {clicksByType.length > 0 && (
                <>
                  <div className="text-[11px] text-muted uppercase tracking-[0.04em] mt-4 mb-1">
                    Clicks by type
                  </div>
                  <SB_MiniList
                    items={clicksByType.map(([kind, value]) => ({
                      label: kind,
                      value: <b>{formatNumber(value)}</b>,
                    }))}
                  />
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted text-sm">
              No engagement data
            </div>
          )}
        </SB_Card>

        {/* Reactions */}
        <SB_Card>
          <strong className="text-sm">Reactions</strong>
          {reactionsDonut.length > 0 ? (
            <>
              <div className="mt-3">
                <SB_DonutChart
                  data={reactionsDonut}
                  centerValue={formatNumber(reactions!.total)}
                  centerLabel="Total"
                  size={160}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-3 justify-center">
                {reactionsDonut.map((r) => (
                  <div key={r.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    {r.name}: {formatNumber(r.value)}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted text-sm">
              No reactions yet
            </div>
          )}
        </SB_Card>
      </div>

      {/* Video performance — only stored for video posts */}
      {video && (
        <SB_Card>
          <strong className="text-sm">Video Performance</strong>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-3">
            <SB_MetricCard title="Views" value={formatNumber(video.views)} />
            <SB_MetricCard
              title="Sound On"
              value={formatNumber(video.viewsSoundOn)}
            />
            <SB_MetricCard
              title="Organic Views"
              value={formatNumber(video.viewsOrganic)}
            />
          </div>
          <SB_MiniList
            className="mt-3"
            items={[
              { label: "Paid Views", value: <b>{formatNumber(video.viewsPaid)}</b> },
              {
                label: "Average Watch Time",
                value: <b>{formatDuration(video.avgTimeWatchedMs)}</b>,
              },
              { label: "Video Length", value: <b>{formatDuration(video.lengthMs)}</b> },
              {
                label: "Completion Rate",
                // Null when Meta did not report a length — not 0%.
                value: (
                  <b>
                    {video.completionRate === null
                      ? "—"
                      : `${(video.completionRate * 100).toFixed(1)}%`}
                  </b>
                ),
              },
            ]}
          />
        </SB_Card>
      )}

      {/* Daily accumulation — the only historical view of a post */}
      {historyChart.length > 1 && (
        <SB_Card>
          <strong className="text-sm">Engagement Over Time</strong>
          <div className="mt-3">
            <SB_LineChart
              data={historyChart}
              lines={[
                { dataKey: "likes", color: "#356df3", name: "Likes" },
                { dataKey: "comments", color: "#22b573", name: "Comments" },
                { dataKey: "shares", color: "#ef4b9a", name: "Shares" },
              ]}
              height={240}
              showLegend
            />
          </div>
        </SB_Card>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <SB_Card>
          <strong className="text-sm">Attachments ({attachments.length})</strong>
          <div className="mt-3 grid gap-2">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border border-line rounded-[12px] p-3"
              >
                <SB_Badge variant="facebook">{a.type || "media"}</SB_Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium truncate">
                    {a.title || <span className="text-muted italic">Untitled</span>}
                  </div>
                  {a.description && (
                    <div className="text-xs text-muted mt-0.5 line-clamp-2">
                      {a.description}
                    </div>
                  )}
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline text-xs mt-1 inline-block"
                    >
                      Open ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SB_Card>
      )}

      {/* Comments */}
      <SB_Card>
        <div className="flex items-baseline justify-between gap-3">
          <strong className="text-sm">
            Comments ({comments.length}
            {comments.length >= 25 ? "+" : ""})
          </strong>
          {comments.length >= 25 && (
            <span className="text-[11px] text-muted">
              first page only — at least 25
            </span>
          )}
        </div>

        {comments.length > 0 ? (
          <div className="mt-3.5 grid gap-2.5">
            {comments.map((c) => (
              // Identity is shown only when Meta actually returns it. Verified
              // against the Graph API: `from` comes back for Pages commenting,
              // but is omitted entirely for individual people — no error, the
              // key is simply absent. A named comment gets its name; an
              // anonymous one gets a neutral glyph rather than a placeholder
              // advertising the gap.
              <div key={c.id} className="flex gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full grid place-items-center shrink-0 text-[11px] font-bold ${
                    c.fromName
                      ? "bg-brand/10 text-brand"
                      : "bg-[#eef2f8] text-[#9aa6b9]"
                  }`}
                >
                  {c.fromName ? (
                    c.fromName.trim().charAt(0).toUpperCase()
                  ) : (
                    <User size={15} />
                  )}
                </div>

                {/* Name and time live in the bubble header so each comment is
                    one block. Stacking name, bubble and timestamp made three
                    loose rows per comment with the date dangling below. */}
                <div className="min-w-0 flex-1 rounded-[14px] rounded-tl-[4px] bg-[#f7f9fc] border border-line/60 px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    {c.fromName ? (
                      <b className="text-[12.5px] text-[#33405a] truncate">
                        {c.fromName}
                      </b>
                    ) : (
                      <span className="text-[12.5px] text-[#9aa6b9]">
                        Facebook user
                      </span>
                    )}
                    <time className="text-[11px] text-muted shrink-0 tabular-nums">
                      {new Date(c.createdTime).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  {c.message ? (
                    // whitespace-pre-line keeps the author's line breaks;
                    // without it a multi-paragraph comment collapses into one
                    // unreadable run.
                    <p className="m-0 text-[13px] leading-[1.55] text-[#4a5670] whitespace-pre-line break-words">
                      {c.message}
                    </p>
                  ) : (
                    <p className="m-0 text-[13px] text-muted italic">
                      No text — media or sticker only
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted text-sm">
            No comments on this post
          </div>
        )}
      </SB_Card>

      <p className="text-[11px] text-muted leading-relaxed">
        Impressions, reach and post clicks are not shown: Meta deprecated them at
        Graph API v25.0 and <code>post-insights</code> returns them hardcoded to 0.
        Its <code>engagedUsers</code> is also mislabelled — it holds the sum of the
        six reaction totals, not engaged users. The engagement figures above come
        from <code>post-engagement</code>, which reports the real values.
      </p>
    </div>
  );
}
