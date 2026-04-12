"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import cytoscape, { Core } from "cytoscape";

interface GraphViewProps {
  workspaceId: string;
}

// 엣지 타입별 색상 정의
const EDGE_STYLES: Record<string, { color: string; label: string }> = {
  LINKS_TO: { color: "#3B82F6", label: "링크" },      // 파랑
  TAGGED_WITH: { color: "#22C55E", label: "태그" },    // 초록
  SIMILAR_TO: { color: "#9CA3AF", label: "유사" },     // 회색 점선
};

type FilterState = Record<string, boolean>;

export default function GraphView({ workspaceId }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  // 관계 종류별 필터 상태
  const [filters, setFilters] = useState<FilterState>({
    LINKS_TO: true,
    TAGGED_WITH: true,
    SIMILAR_TO: true,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  // NextAuth 세션에서 액세스 토큰 추출
  const token = (session as any)?.accessToken;

  // 그래프 데이터 로드 + Cytoscape 초기화
  useEffect(() => {
    if (!containerRef.current || !token) return;

    async function initGraph() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${apiUrl}/graph/pages?workspace_id=${workspaceId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!res.ok) {
          throw new Error(`그래프 데이터 로드 실패: ${res.status}`);
        }

        const data = await res.json();

        // 기존 인스턴스 정리
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }

        const cy = cytoscape({
          container: containerRef.current,
          elements: [...data.nodes, ...data.edges],
          style: [
            // 기본 노드 스타일
            {
              selector: "node",
              style: {
                label: "data(label)",
                "background-color": "#6366F1",
                color: "#1F2937",
                "font-size": "12px",
                "text-valign": "bottom",
                "text-margin-y": 8,
                width: 30,
                height: 30,
                "text-wrap": "ellipsis",
                "text-max-width": "120px",
              },
            },
            // 호버 상태
            {
              selector: "node:active",
              style: {
                "background-color": "#4F46E5",
                "overlay-opacity": 0.1,
              },
            },
            // LINKS_TO 엣지 — 파랑 실선
            {
              selector: "edge[type='LINKS_TO']",
              style: {
                "line-color": "#3B82F6",
                "target-arrow-color": "#3B82F6",
                "target-arrow-shape": "triangle",
                "curve-style": "bezier",
                width: 2,
              },
            },
            // TAGGED_WITH 엣지 — 초록 실선
            {
              selector: "edge[type='TAGGED_WITH']",
              style: {
                "line-color": "#22C55E",
                "target-arrow-color": "#22C55E",
                "target-arrow-shape": "triangle",
                "curve-style": "bezier",
                width: 2,
              },
            },
            // SIMILAR_TO 엣지 — 회색 점선
            {
              selector: "edge[type='SIMILAR_TO']",
              style: {
                "line-color": "#9CA3AF",
                "line-style": "dashed",
                "curve-style": "bezier",
                width: 1,
              },
            },
          ],
          layout: {
            name: "cose",
            animate: true,
            animationDuration: 500,
            nodeRepulsion: () => 8000,
            idealEdgeLength: () => 100,
          },
        });

        // 노드 크기를 연결 수(degree)에 비례하게 설정
        cy.nodes().forEach((node) => {
          const degree = node.degree(false);
          const size = Math.max(25, 20 + degree * 8);
          node.style({ width: size, height: size });
        });

        // 노드 클릭 시 해당 페이지로 이동
        cy.on("tap", "node", (evt) => {
          const nodeId = evt.target.id();
          router.push(`/workspace/${nodeId}`);
        });

        cyRef.current = cy;
      } catch (err) {
        console.error("그래프 로드 실패:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    }

    initGraph();

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [token, workspaceId, apiUrl, router]);

  // 필터 변경 시 해당 엣지 표시/숨기기
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    Object.entries(filters).forEach(([type, visible]) => {
      const edges = cy.edges(`[type='${type}']`);
      if (visible) {
        edges.style({ display: "element" });
      } else {
        edges.style({ display: "none" });
      }
    });
  }, [filters]);

  const toggleFilter = (type: string) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="flex h-full flex-col">
      {/* 필터 바 */}
      <div className="flex items-center gap-4 border-b bg-white px-4 py-3">
        <span className="text-sm font-medium text-gray-700">관계 필터:</span>
        {Object.entries(EDGE_STYLES).map(([type, style]) => (
          <label
            key={type}
            className="flex cursor-pointer items-center gap-1.5 text-sm select-none"
          >
            <input
              type="checkbox"
              checked={filters[type] ?? true}
              onChange={() => toggleFilter(type)}
              className="rounded"
            />
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: style.color }}
            />
            <span className="text-gray-600">{style.label}</span>
            <span className="text-gray-400 text-xs">({type})</span>
          </label>
        ))}
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-sm text-gray-500">그래프 로드 중...</div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !loading && (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {/* Cytoscape 그래프 캔버스 */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-50"
        style={{ display: loading || error ? "none" : "block" }}
      />
    </div>
  );
}
