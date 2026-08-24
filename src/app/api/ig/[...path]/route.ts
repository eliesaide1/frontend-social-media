import { NextRequest, NextResponse } from "next/server";

const IG_API_URL =
  process.env.NEXT_PUBLIC_IG_API_URL || "http://iganalyticsapi.tryasp.net";

/**
 * Proxy all /api/ig/* requests to the Instagram Analytics API.
 *
 * The Instagram service registers no CORS policy at all (see
 * `MiddlewareExtensions.UseAppMiddleware`), so unlike Facebook this proxy is
 * required rather than merely convenient — the browser cannot call it directly.
 */
async function proxyRequest(req: NextRequest, method: string) {
  // Extract the path after /api/ig/
  const url = new URL(req.url);
  const pathAfterPrefix = url.pathname.replace(/^\/api\/ig/, "");
  const targetUrl = `${IG_API_URL}${pathAfterPrefix}${url.search}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const contentType = req.headers.get("Content-Type");
  if (contentType) headers["Content-Type"] = contentType;

  const fetchOptions: RequestInit = { method, headers };

  // DELETE carries a body on the product-tags route, so forward it too.
  if (method !== "GET") {
    const body = await req.text();
    if (body) fetchOptions.body = body;
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

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
        detail: "Failed to reach the Instagram Analytics API",
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
