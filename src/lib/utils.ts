/**
 * Merge class names conditionally (simple cn utility)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * The API omits a metric Meta no longer reports rather than sending 0, because
 * a 0 is a measurement. Render the absence as such instead of "0" or "NaN".
 */
export function formatOptional(value: number | undefined | null): string {
  return value === undefined || value === null ? "—" : formatNumber(value);
}

/** Milliseconds to a compact "12m 30s" / "45s" duration. */
export function formatDuration(ms: number | undefined | null): string {
  if (!ms || ms <= 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Human label for Meta's status_type vocabulary.
 *
 * facebook_posts.type carries Meta's own values — added_photos, shared_story,
 * mobile_status_update and so on — which are implementation names, not
 * something to show a marketer. A link share and a status update are both just
 * posts, so they read as "Post"; only genuinely different media get their own
 * label. Rows written before the type binding was fixed are null, hence the
 * fallback.
 */
export function postTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case "added_photos":
      return "Photo";
    case "added_video":
      return "Video";
    case "created_note":
      return "Note";
    case "created_event":
      return "Event";
    case "shared_story":
    case "mobile_status_update":
    case "wall_post":
    case "published_story":
    case null:
    case undefined:
    case "":
      return "Post";
    default:
      // An unmapped value is still better shown tidied than raw.
      return type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  }
}

/**
 * Y-axis bounds fitted to a series' own range.
 *
 * Recharts starts a numeric axis at 0, which flattens any series whose
 * movement is small next to its magnitude — a follower count moving between
 * 23,939 and 23,943 uses 0.02% of a 0–24,000 axis and draws as a straight
 * line. Bounds are derived from the values passed in, so every page gets its
 * own low and high rather than a shared or hard-coded scale.
 *
 * Returns undefined for an empty series so the caller can omit the domain and
 * let Recharts fall back to its default.
 */
export function fitAxisDomain(
  values: number[],
  padRatio = 0.2
): [number, number] | undefined {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return undefined;

  const min = Math.min(...finite);
  const max = Math.max(...finite);

  // A flat series has no range to pad, but still needs a band — otherwise the
  // line sits exactly on the axis and reads as missing rather than steady.
  const pad = Math.max(1, Math.ceil((max - min) * padRatio));

  // Padding below zero on a count that cannot go negative invents an
  // impossible region of the axis, so the floor is held at 0 for a
  // non-negative series. A series that genuinely goes negative (a daily
  // follower delta, say) keeps its padded lower bound.
  const lower = min >= 0 ? Math.max(0, min - pad) : min - pad;
  return [lower, max + pad];
}

/** How a field collapses when several days fold into one bucket. */
export type BucketMode = "sum" | "last" | "max";

/**
 * Groups a dated series into day or month buckets.
 *
 * Each field says how it collapses, because they are not alike: follows and
 * unfollows are daily counts that ADD up over a month, while a follower total
 * is a running snapshot — summing it would report 700,000 followers for a page
 * that has 23,000. Getting this wrong is silent and looks plausible, which is
 * why the mode is required per field rather than assumed.
 */
export function bucketSeries<T extends { date: string }>(
  points: T[],
  grouping: "day" | "month",
  modes: Partial<Record<keyof T, BucketMode>>
): Record<string, string | number>[] {
  const fields = Object.keys(modes) as (keyof T)[];

  const format = (iso: string) =>
    grouping === "day"
      ? new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

  // yyyy-MM-dd or yyyy-MM — sorting these lexicographically is chronological.
  const keyOf = (iso: string) => iso.slice(0, grouping === "day" ? 10 : 7);

  const buckets = new Map<string, { label: string; rows: T[] }>();
  for (const point of points) {
    const key = keyOf(point.date);
    const bucket = buckets.get(key) ?? { label: format(point.date), rows: [] };
    bucket.rows.push(point);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, bucket]) => {
      const out: Record<string, string | number> = { label: bucket.label };
      for (const field of fields) {
        const values = bucket.rows
          .map((r) => r[field])
          .filter((v): v is T[keyof T] & number => typeof v === "number");

        if (values.length === 0) {
          out[String(field)] = 0;
          continue;
        }
        const mode = modes[field];
        out[String(field)] =
          mode === "sum"
            ? values.reduce((a, b) => a + b, 0)
            : mode === "max"
              ? Math.max(...values)
              : values[values.length - 1];
      }
      return out;
    });
}

/**
 * Whether a Facebook CDN URL's signature has already expired.
 *
 * `full_picture` is a SIGNED url, not a stable one: the `oe` query parameter is
 * a hex unix expiry, typically about two days out from when Meta minted it. The
 * warehouse persists the string at ingestion time, so any row older than that
 * carries a link the CDN now answers with 403 — measured on this page, 75 of
 * 137 stored images were already dead.
 *
 * Checking the expiry lets the UI show a placeholder immediately instead of
 * firing a request that is certain to fail and rendering a broken-image icon.
 * Returns false for anything unparseable, so an unrecognised url is still
 * attempted rather than hidden on a guess.
 */
export function isExpiredCdnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const oe = new URL(url).searchParams.get("oe");
    if (!oe) return false;

    const expiresAt = parseInt(oe, 16);
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) return false;

    return expiresAt * 1000 <= Date.now();
  } catch {
    return false;
  }
}
