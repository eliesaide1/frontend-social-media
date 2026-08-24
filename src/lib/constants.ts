import type { IgAccount } from "@/types/instagram";

export const APP_NAME = "SocialBoost";

export const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [{ label: "Overview", icon: "LayoutDashboard", href: "/" }],
  },
  {
    title: "Analytics",
    items: [
      { label: "Instagram", icon: "Instagram", href: "/instagram" },
      { label: "Facebook", icon: "Facebook", href: "/facebook" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "All Content", icon: "LayoutGrid", href: "/content" },
      { label: "Calendar", icon: "Calendar", href: "/calendar" },
    ],
  },
  {
    title: "Paid",
    items: [{ label: "Ads", icon: "Target", href: "/ads" }],
  },
  {
    title: "Community",
    items: [{ label: "Comments", icon: "MessageCircle", href: "/comments" }],
  },
  {
    title: "Audience",
    items: [{ label: "Audience", icon: "Users", href: "/audience" }],
  },
  {
    title: "Reports",
    items: [{ label: "Reports", icon: "BarChart3", href: "/reports" }],
  },
] as const;

/**
 * Instagram accounts the dashboard can show.
 *
 * The Instagram Analytics API has no account-list endpoint — every route takes
 * `{igUserId}` as a path param — so the list is configured here. It mirrors the
 * `InstagramAccounts.Accounts` section of the service's appsettings.json; an
 * account absent from that section still answers live calls but is never synced.
 *
 * Override at build time with NEXT_PUBLIC_IG_ACCOUNTS, a JSON array of
 * `{ igUserId, name, adAccountId? }`.
 */
export const IG_ACCOUNTS: readonly IgAccount[] = (() => {
  const raw = process.env.NEXT_PUBLIC_IG_ACCOUNTS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as IgAccount[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Malformed override — fall through to the defaults below.
    }
  }
  return [
    {
      igUserId: "17841401200423396",
      name: "businessofhome",
      adAccountId: "act_1259355961899386",
    },
    {
      igUserId: "17841401992069000",
      name: "futurism",
      adAccountId: "act_164967955254577",
    },
  ];
})();

/** Account metrics the Instagram overview requests on the `day` period. */
export const IG_OVERVIEW_METRICS = [
  "views",
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saves",
] as const;

export const PLATFORM_COLORS = {
  instagram: { bg: "#fff0f7", text: "#d92f8b" },
  facebook: { bg: "#eef4ff", text: "#2f67da" },
  tiktok: { bg: "#f0f0f0", text: "#000000" },
} as const;

export const CHART_COLORS = {
  instagram: "#ef4b9a",
  facebook: "#356df3",
  primary: "#356df3",
  purple: "#7c5cff",
} as const;

export const DATE_RANGES = [
  { label: "Aug 1 – Aug 31, 2026", value: "aug-2026" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
] as const;
