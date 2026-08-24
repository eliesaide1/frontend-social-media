import { ApiError } from "@/types/api";

// In the browser, route through our Next.js proxy to avoid CORS.
// On the server (SSR), call the API directly.
const FB_BASE_URL =
  typeof window !== "undefined"
    ? "/api/fb"
    : process.env.NEXT_PUBLIC_FB_API_URL || "http://fbanalyticsapi.tryasp.net";

const IG_BASE_URL =
  typeof window !== "undefined"
    ? "/api/ig"
    : process.env.NEXT_PUBLIC_IG_API_URL || "http://iganalyticsapi.tryasp.net";

/**
 * Centralized API client — similar to ADIR's SharedService.
 *
 * The Facebook Analytics API returns data directly (no wrapper object),
 * and uses RFC 7807 Problem Details for errors.
 * Account scoping: pass accountId via query param or X-Account-Id header.
 */
class ApiClient {
  private baseUrl: string;
  private accountId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** Set the active account ID for multi-account scoping */
  setAccountId(id: string | null) {
    this.accountId = id;
  }

  private getHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extraHeaders,
    };

    if (this.accountId) {
      headers["X-Account-Id"] = this.accountId;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as ApiError;
        errorDetail = errorBody.detail || errorBody.title || errorDetail;
      } catch {
        // response body not JSON
      }
      throw new Error(errorDetail);
    }

    // Some endpoints return empty body (204 or 200 with no content)
    const text = await response.text();
    if (!text) return null as T;
    return JSON.parse(text) as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers,
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(
    endpoint: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    // Don't set Content-Type — browser sets it with boundary for multipart
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.accountId) {
      headers["X-Account-Id"] = this.accountId;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * DELETE with a request body — Instagram's product-tags removal takes the
   * product ids in the body rather than the query string.
   */
  async deleteWithBody<T>(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }
}

/** Facebook Analytics API client */
export const fbApiClient = new ApiClient(FB_BASE_URL);

/**
 * Instagram Analytics API client.
 *
 * The Instagram service has no account-scoping header — one system access
 * token, configured server-side, serves every call — so `setAccountId` is
 * never used here. The account is selected by the `{igUserId}` path segment
 * on each route instead.
 */
export const igApiClient = new ApiClient(IG_BASE_URL);
