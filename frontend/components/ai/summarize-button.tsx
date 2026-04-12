"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiStream } from "@/lib/api";

interface SummarizeButtonProps {
  pageId: string;
}

/**
 * 페이지 요약 버튼
 * - SSE 스트리밍으로 요약 결과 실시간 표시
 * - 닫기 버튼으로 요약 패널 숨김
 */
export default function SummarizeButton({ pageId }: SummarizeButtonProps) {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = (session as { accessToken?: string } | null)?.accessToken;

  const handleSummarize = async () => {
    if (!token || loading) return;
    setLoading(true);
    setSummary("");

    try {
      let fullText = "";

      for await (const chunk of apiStream("/ai/summarize", {
        method: "POST",
        token,
        body: JSON.stringify({ page_id: pageId }),
      })) {
        try {
          const data = JSON.parse(chunk.data);
          if (data.text) {
            fullText += data.text;
            setSummary(fullText);
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }
    } catch (err) {
      console.error("요약 에러:", err);
      setSummary("요약에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSummarize}
        disabled={loading}
        className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
      >
        {loading ? "요약 중..." : "📋 요약"}
      </button>

      {summary !== null && (
        <div className="mt-2 rounded-md bg-indigo-50 p-3 text-sm text-gray-700">
          <div className="mb-1 text-xs font-medium text-indigo-600">AI 요약</div>
          <div className="whitespace-pre-wrap">{summary || "..."}</div>
          <button
            onClick={() => setSummary(null)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
