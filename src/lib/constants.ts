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

/**
 * Dashboard date ranges, in days back from today.
 *
 * Capped at 90 because Meta rejects any insights window longer than 93 days
 * ("Time range too long"), and the metric endpoints validate that up front.
 */
export const DATE_RANGES = [
  { label: "Last 7 Days", value: "7d", days: 7 },
  { label: "Last 30 Days", value: "30d", days: 30 },
  { label: "Last 90 Days", value: "90d", days: 90 },
] as const;

export const DEFAULT_DATE_RANGE = "30d";

/** The key that puts the topbar into from/to mode. */
export const CUSTOM_DATE_RANGE = "custom";

/**
 * Meta rejects any insights window longer than this ("Time range too long").
 * The service guard uses it as the absolute limit.
 */
export const MAX_RANGE_DAYS = 93;

/**
 * What a custom range may span in the picker.
 *
 * Deliberately under Meta's 93 so the longest selectable window matches the
 * "Last 90 Days" preset and leaves headroom rather than sitting on the edge of
 * a limit that returns an error instead of a truncated series.
 */
export const MAX_SELECTABLE_DAYS = 90;
