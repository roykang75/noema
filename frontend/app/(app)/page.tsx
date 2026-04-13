/**
 * 홈 페이지 — 로그인 후 기본 화면
 * 사이드바가 적용되며, 페이지가 선택되지 않은 상태의 빈 화면을 보여줍니다.
 */
export default function HomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Noema</h1>
        <p className="mb-1 text-gray-600">팀용 지식 관리 도구</p>
        <p className="text-sm text-gray-400">
          왼쪽 사이드바에서 페이지를 선택하거나 새로 만들어보세요.
        </p>
      </div>
    </div>
  );
}
