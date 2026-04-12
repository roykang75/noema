import GraphView from "@/components/graph/graph-view";

// 임시 워크스페이스 ID — 실제 구현 시 세션/URL에서 추출
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export default async function GraphViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="h-full">
      <GraphView workspaceId={WORKSPACE_ID} />
    </div>
  );
}
