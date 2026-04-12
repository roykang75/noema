export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* 사이드바 — Step 4에서 구현 */}
      <aside className="w-64 border-r bg-gray-50">
        <div className="p-4 font-bold">Noema</div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
