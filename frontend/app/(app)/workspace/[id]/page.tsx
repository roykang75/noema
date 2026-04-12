export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">문서 에디터</h1>
      <p className="mt-2 text-gray-500">Page ID: {id}</p>
      {/* BlockNote 에디터 — Step 4에서 구현 */}
    </div>
  );
}
