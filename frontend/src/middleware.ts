import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

// /inventory is a separate Multi-Zone app with its own Supabase auth, so the
// CRM's JWT gate must let it (and its assets) pass through to the rewrite.
const PUBLIC_PATHS = ["/login", "/api/backend/auth/login", "/inventory", "/inventory-static"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("crm_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "change-me-in-production");
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("crm_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
