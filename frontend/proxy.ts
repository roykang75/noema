/**
 * Next.js 16 Proxy (구 Middleware)
 * 인증되지 않은 사용자를 로그인 페이지로 리다이렉트
 * 인증된 사용자가 로그인 페이지 접근 시 홈으로 리다이렉트
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();

  const { pathname } = request.nextUrl;

  // 인증 불필요 경로
  const publicPaths = ["/login", "/api/auth"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (!session && !isPublic) {
    // 미인증 유저 → 로그인 페이지로 리다이렉트
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && pathname === "/login") {
    // 인증된 유저가 로그인 페이지 접근 → 홈으로 리다이렉트
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
