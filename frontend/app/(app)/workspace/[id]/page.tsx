import EditorPage from "@/components/editor/editor-page";

/**
 * 워크스페이스 문서 에디터 페이지
 * - URL 파라미터에서 페이지 ID를 추출
 * - EditorPage 클라이언트 컴포넌트에 위임
 */
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditorPage pageId={id} pageTitle="" />;
}
