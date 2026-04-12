"use client";

/**
 * NextAuth SessionProvider 래퍼
 * 클라이언트 컴포넌트에서 세션에 접근할 수 있도록 컨텍스트 제공
 */

import { SessionProvider } from "next-auth/react";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
