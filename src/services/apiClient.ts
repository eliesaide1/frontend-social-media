import { AccountError, ApiError, ValidationError } from "@/types/api";

// In the browser, route through our Next.js proxy to avoid CORS.
// On the server (SSR), call the API directly.
const FB_BASE_URL =
  typeof window !== "undefined"
    ? "/api/fb"
    : process.env.NEXT_PUBLIC_FB_API_URL || "http://fbanalyticsapi.tryasp.net";

/**
 * Error thrown for any non-2xx response.
 *
 * The API emits THREE different error bodies and the client has to handle all
 * of them:
 *  - RFC 7807 problem details from GlobalExceptionHandler (has `detail`)
 *  - ASP.NET model-validation failures (has an `errors` map, no `detail`)
 *  - the account-resolution middleware (has a machine-readable `error` code)
 */
export class FbApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly traceId?: string;
  /** Field -> messages, only present on 400 validation failures */
  readonly errors?: Record<string, string[]>;
  /** Machine-readable code from the account middleware, e.g. account_required */
  readonly code?: string;
  /** Linked accounts, sent with account_required so a picker can be shown */
  readonly accounts?: { accountId: string; label: string }[];

  constructor(init: {
    status: number;
    title: string;
    message: string;
    traceId?: string;
    errors?: Record<string, string[]>;
    code?: string;
    accounts?: { accountId: string; label: string }[];
  }) {
    super(init.message);
    this.name = "FbApiError";
    this.status = init.status;
    this.title = init.title;
    this.traceId = init.traceId;
    this.errors = init.errors;
    this.code = init.code;
    this.accounts = init.accounts;
  }

  /** 502 means the Graph API itself failed — Meta's message is passed through. */
  get isUpstreamFailure() {
    return this.status === 502;
  }

  /** True when the request could not be attributed to a linked account. */
  get isAccountProblem() {
    return (
      this.code === "no_account_linked" ||
      this.code === "account_required" ||
      this.code === "invalid_account_id" ||
      this.code === "account_not_found"
    );
  }
}

/**
 * Centralized API client for the Facebook Analytics API.
 *
 * The API has no authentication, but every endpoint outside /api/accounts,
 * /auth/facebook, /health and /api/webhook is scoped to a linked Meta account.
 * The account is resolved from the X-Account-Id header (or ?accountId=). With
 * exactly one account linked it may be omitted; with two or more, an unscoped
 * request is refused rather than pointed at an arbitrary one — so set it as
 * soon as the account is known.
 */
class ApiClient {
  private baseUrl: string;
  private accountId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** Scope every subsequent request to this linked account. */
  setAccountId(id: string | null) {
    this.accountId = id;
  }

  getAccountId() {
    return this.accountId;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...extra,
    };
    if (this.accountId) headers["X-Account-Id"] = this.accountId;
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw await this.toError(response);
    }

    // Every success is a 200 — there are no 204s — but a few routes
    // (privacy-policy, the webhook challenge) answer with a non-JSON body.
    const text = await response.text();
    if (!text) return null as T;

    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.includes("json")) return text as T;

    return JSON.parse(text) as T;
  }

  private async toError(response: Response): Promise<FbApiError> {
    const fallback = `HTTP ${response.status}: ${response.statusText}`;

    type AnyErrorBody = Partial<ApiError & ValidationError & AccountError>;

    let body: AnyErrorBody | null = null;
    try {
      body = (await response.json()) as AnyErrorBody;
    } catch {
      // body was empty or not JSON
    }

    if (!body) {
      return new FbApiError({
        status: response.status,
        title: fallback,
        message: fallback,
      });
    }

    // Account-resolution shape: a machine-readable `error` code plus `detail`.
    if (typeof body.error === "string") {
      return new FbApiError({
        status: response.status,
        title: body.error,
        message: body.detail || body.error,
        code: body.error,
        accounts: body.accounts,
      });
    }

    // Validation shape: an `errors` map instead of `detail`.
    if (body.errors) {
      const flattened = Object.entries(body.errors)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
        .join(" · ");
      return new FbApiError({
        status: body.status ?? response.status,
        title: body.title ?? "Validation failed",
        message: flattened || body.title || fallback,
        errors: body.errors,
      });
    }

    return new FbApiError({
      status: body.status ?? response.status,
      title: body.title ?? fallback,
      message: body.detail || body.title || fallback,
      traceId: body.traceId,
    });
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.headers(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    const headers = this.headers(
      data ? { "Content-Type": "application/json" } : undefined
    );

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    // Don't set Content-Type — the browser adds it with the multipart boundary.
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.headers(),
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    return this.handleResponse<T>(response);
  }
}

/** Facebook Analytics API client */
export const fbApiClient = new ApiClient(FB_BASE_URL);
