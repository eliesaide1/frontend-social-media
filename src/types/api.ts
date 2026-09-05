/**
 * The Facebook Analytics API returns data directly (no wrapper),
 * or uses RFC 7807 Problem Details for errors.
 */

/** Application error (GlobalExceptionHandler) */
export interface ApiError {
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  timestamp?: string;
}

/**
 * Automatic model-validation failure (ASP.NET).
 * A different shape from ApiError — an `errors` map instead of `detail`.
 * Both have to be handled; see apiClient.
 */
export interface ValidationError {
  title: string;
  status: number;
  errors: Record<string, string[]>;
}

/** 400 returned when a requested window exceeds Meta's 93-day limit */
export interface InvalidDateRangeError {
  error: "invalid_date_range";
  detail: string;
  startDate: string;
  endDate: string;
}

/** Date range for filtering (yyyy-MM-dd) */
export interface DateRange {
  start: string;
  end: string;
}

/** Time series envelope used by the ranged insight & warehouse endpoints */
export interface TimeSeriesResponse<T> {
  id: string;
  /** Echoes the dates requested, not the first/last point returned */
  from: string | null;
  to: string | null;
  pointCount: number;
  points: T[];
}

/**
 * One day of a ranged metric family (MetricPointDto<T>).
 *
 * The five ranged metric endpoints keep the flat DTO nested under `metrics`
 * rather than flattening it onto the point, so every family reuses this
 * envelope. Metrics Meta no longer reports are absent, not zero.
 */
export interface MetricPoint<T> {
  /** Attributed to the day it covers, not Meta's end_time */
  date: string;
  metrics: T;
}

/** A ranged metric response: TimeSeriesDto<MetricPointDto<T>>. */
export type MetricSeries<T> = TimeSeriesResponse<MetricPoint<T>>;

/**
 * The account-resolution middleware rejects with this shape — a third error
 * body, distinct from ApiError and ValidationError.
 *
 * `account_required` carries the linked accounts so a picker can be shown.
 */
export interface AccountError {
  error:
    | "no_account_linked"
    | "account_required"
    | "invalid_account_id"
    | "account_not_found";
  detail: string;
  accounts?: { accountId: string; label: string }[];
}
