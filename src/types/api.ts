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

/** Validation error (ASP.NET) */
export interface ValidationError {
  title: string;
  status: number;
  errors: Record<string, string[]>;
}

/** Account scoping error */
export interface AccountRequiredError {
  error: "account_required" | "no_account_linked";
  detail: string;
  accounts?: { accountId: string; label: string }[];
}

/** Date range for filtering */
export interface DateRange {
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
}

/** Time series envelope used by insights & warehouse endpoints */
export interface TimeSeriesResponse<T> {
  id: string;
  from: string | null;
  to: string | null;
  pointCount: number;
  points: T[];
}

/** Pagination params */
export interface PaginationParams {
  page: number;
  limit: number;
}
