import { NextRequest, NextResponse } from "next/server";

const FB_API_URL =
  process.env.NEXT_PUBLIC_FB_API_URL || "http://fbanalyticsapi.tryasp.net";

/**
 * Proxy all /api/fb/* requests to the Facebook Analytics API.
 * This avoids CORS issues since the browser only talks to our Next.js server.
 */
async function proxyRequest(req: NextRequest, method: string) {
  // Extract the path after /api/fb/
  const url = new URL(req.url);
  const pathAfterPrefix = url.pathname.replace(/^\/api\/fb/, "");
  const targetUrl = `${FB_API_URL}${pathAfterPrefix}${url.search}`;

  // Forward headers (pass through X-Account-Id, Content-Type, etc.)
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const accountId = req.headers.get("X-Account-Id");
  if (accountId) headers["X-Account-Id"] = accountId;

  const contentType = req.headers.get("Content-Type");
  if (contentType) headers["Content-Type"] = contentType;

  const fetchOptions: RequestInit = { method, headers };

  // Forward request body for POST/PUT/PATCH
  if (method !== "GET" && method !== "DELETE") {
    const body = await req.text();
    if (body) fetchOptions.body = body;
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
    });
  } catch {
    return NextResponse.json(
      { title: "Proxy Error", status: 502, detail: "Failed to reach the Facebook Analytics API" },
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
