/**
 * NextAuth.js v5 (Auth.js) 설정
 * Google OAuth 2.0 전용 인증 설정
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import jwt from "jsonwebtoken";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 첫 로그인 시 Google 프로필 정보를 토큰에 저장
      if (account && profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = (profile as { picture?: string }).picture;
      }
      return token;
    },
    async session({ session, token }) {
      // 세션에 JWT 토큰 추가 (백엔드 API 호출 시 사용)
      if (token) {
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
          // 백엔드와 공유하는 JWT 생성 (FastAPI에서 검증)
          session.accessToken = jwt.sign(
            {
              email: token.email,
              name: token.name,
              picture: token.picture,
            },
            jwtSecret,
            { expiresIn: "7d" }
          );
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
