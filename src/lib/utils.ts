/**
 * Merge class names conditionally (simple cn utility)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a number with K/M suffix.
 *
 * Accepts nullish input on purpose. These values come from API payloads whose
 * declared DTOs promise fields the service does not always return — an absent
 * field used to reach `num.toString()` and take the whole page down with
 * "Cannot read properties of undefined". Rendering the app-wide "—" placeholder
 * keeps one missing metric from blanking every other metric beside it.
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
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
