/**
 * NextAuth.js API 라우트 핸들러
 * GET/POST 요청을 NextAuth 핸들러로 위임
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
