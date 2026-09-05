import { NextRequest, NextResponse } from "next/server";

const FB_API_URL =
  process.env.NEXT_PUBLIC_FB_API_URL || "http://fbanalyticsapi.tryasp.net";

// Video and reel uploads pass through this route and can take minutes; the
// upstream API allows 10 minutes for the publish-*-upload endpoints, so the
// proxy must not give up first. Deployment platforms read this from the build
// output to set their own execution limit.
export const maxDuration = 600;

/**
 * Proxy all /api/fb/* requests to the Facebook Analytics API.
 * This avoids CORS issues since the browser only talks to our Next.js server.
 *
 * X-Account-Id must be forwarded: the upstream account-resolution middleware
 * reads it to decide which linked Meta account the request acts for, and
 * refuses the request when two or more accounts are linked and it is absent.
 */
async function proxyRequest(req: NextRequest, method: string) {
  const url = new URL(req.url);
  const pathAfterPrefix = url.pathname.replace(/^\/api\/fb/, "");
  const targetUrl = `${FB_API_URL}${pathAfterPrefix}${url.search}`;

  const headers: Record<string, string> = { Accept: "*/*" };

  const accountId = req.headers.get("X-Account-Id");
  if (accountId) headers["X-Account-Id"] = accountId;

  const contentType = req.headers.get("Content-Type");
  if (contentType) headers["Content-Type"] = contentType;

  const fetchOptions: RequestInit = { method, headers, cache: "no-store" };

  // Read the body as bytes, not text — the publish-*-upload endpoints send
  // multipart/form-data and re-encoding binary through a string corrupts it.
  if (method !== "GET" && method !== "DELETE") {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) fetchOptions.body = body;
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      {
        title: "Proxy Error",
        status: 502,
        detail: "Failed to reach the Facebook Analytics API",
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxyRequest(req, "POST");
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req, "DELETE");
}
