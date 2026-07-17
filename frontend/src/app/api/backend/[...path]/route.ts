import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000";
const BACKEND_ADMIN_API_KEY = process.env.BACKEND_ADMIN_API_KEY || "";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function backendUrl(path: string[], search: string) {
  const cleanBase = BACKEND_API_URL.replace(/\/$/, "");
  const cleanPath = path.join("/");
  return `${cleanBase}/${cleanPath}${search}`;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const headers = new Headers(request.headers);
  headers.delete("host");
  if (BACKEND_ADMIN_API_KEY) {
    headers.set("X-Admin-API-Key", BACKEND_ADMIN_API_KEY);
  }

  // Copilot needs to know who's asking — decode the crm_token cookie here
  // (server-side, same secret/pattern as middleware.ts) and forward identity
  // as headers. No other backend route reads these; safe no-op elsewhere.
  const token = request.cookies.get("crm_token")?.value;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "change-me-in-production");
      const { payload } = await jwtVerify(token, secret);
      if (typeof payload.sub === "string") {
        headers.set("X-User-Name", payload.sub);
        headers.set("X-User-Is-Admin", payload.is_admin ? "true" : "false");
      }
    } catch {
      // invalid/expired token — leave identity headers unset, copilot will 401
    }
  }

  const response = await fetch(backendUrl(path, request.nextUrl.search), {
    method: request.method,
    headers,
    // arrayBuffer keeps binary bodies (file uploads) intact — text() corrupts them
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "application/json";
  const responseHeaders = new Headers({ "content-type": contentType });

  // Forward Set-Cookie so auth cookies reach the browser
  const cookies = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
  for (const c of cookies) responseHeaders.append("set-cookie", c);

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

