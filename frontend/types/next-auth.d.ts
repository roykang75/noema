/**
 * NextAuth.js 타입 확장
 * 세션에 accessToken 필드 추가
 */

import "next-auth";

declare module "next-auth" {
  interface Session {
    // FastAPI 백엔드 호출 시 사용하는 JWT 토큰
    accessToken?: string;
  }
}
