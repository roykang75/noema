/**
 * 인증 필요 페이지 공통 레이아웃
 * 사이드바 + 메인 콘텐츠 영역으로 구성
 */

import Sidebar from "@/components/sidebar/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
