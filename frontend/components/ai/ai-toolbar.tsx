"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiStream } from "@/lib/api";

interface AIToolbarProps {
  pageId: string;
  selectedText: string;
  onResult: (text: string) => void;
  onClose: () => void;
}

/**
 * 텍스트 선택 시 나타나는 AI 플로팅 툴바
 * - 개선, 간결화, 번역 기능 제공
 * - SSE 스트리밍으로 결과 실시간 표시
 */
export default function AIToolbar({ pageId, selectedText: _selectedText, onResult, onClose }: AIToolbarProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const token = (session as { accessToken?: string } | null)?.accessToken;

  const callAI = async (endpoint: string, body: Record<string, unknown>) => {
    if (!token) return;
    setLoading(true);
    setResult("");

    try {
      let fullText = "";

      for await (const chunk of apiStream(endpoint, {
        method: "POST",
        token,
        body: JSON.stringify(body),
      })) {
        try {
          const data = JSON.parse(chunk.data);
          if (data.text) {
            fullText += data.text;
            setResult(fullText);
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }
    } catch (err) {
      console.error("AI 호출 에러:", err);
      setResult("AI 호출에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg" style={{ minWidth: "300px" }}>
      {/* 액션 버튼 */}
      {!result && !loading && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => callAI("/ai/improve", { block_id: pageId, instruction: "" })}
            className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
          >
            ✨ 개선
          </button>
          <button
            onClick={() => callAI("/ai/improve", { block_id: pageId, instruction: "더 간결하게" })}
            className="rounded-md bg-purple-50 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100"
          >
            📝 간결하게
          </button>
          <button
            onClick={() => callAI("/ai/translate", { block_id: pageId, target_lang: "en" })}
            className="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
          >
            🌐 영어로 번역
          </button>
          <button
            onClick={() => callAI("/ai/translate", { block_id: pageId, target_lang: "ko" })}
            className="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
          >
            🇰🇷 한국어로 번역
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="text-sm text-gray-500">
          <span className="animate-pulse">AI 생성 중...</span>
          {result && <div className="mt-2 whitespace-pre-wrap text-gray-700">{result}</div>}
        </div>
      )}

      {/* 결과 */}
      {result && !loading && (
        <div>
          <div className="mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
            {result}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { onResult(result); onClose(); }}
              className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
            >
              적용
            </button>
            <button
              onClick={onClose}
              className="rounded-md border px-3 py-1 text-sm text-gray-500 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
