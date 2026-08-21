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

export const DATE_RANGES = [
  { label: "Aug 1 – Aug 31, 2026", value: "aug-2026" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
] as const;
