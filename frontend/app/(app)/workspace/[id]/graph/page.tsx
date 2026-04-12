export default async function GraphViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">그래프 뷰</h1>
      <p className="mt-2 text-gray-500">Workspace ID: {id}</p>
      {/* Cytoscape.js 그래프 — 추후 구현 */}
    </div>
  );
}
