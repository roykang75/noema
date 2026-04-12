"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiStream } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  pageId: string;
  onClose: () => void;
}

/**
 * 문서 기반 AI Q&A 사이드 패널
 * - SSE 스트리밍으로 답변 실시간 표시
 * - 대화 히스토리 유지
 */
export default function AIChatPanel({ pageId, onClose }: AIChatPanelProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = (session as { accessToken?: string } | null)?.accessToken;

  // 새 메시지 추가 시 스크롤 하단으로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = async () => {
    if (!input.trim() || !token || loading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      let fullText = "";

      // 어시스턴트 메시지 자리 확보
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      for await (const chunk of apiStream("/ai/ask", {
        method: "POST",
        token,
        body: JSON.stringify({ page_id: pageId, question }),
      })) {
        try {
          const data = JSON.parse(chunk.data);
          if (data.text) {
            fullText += data.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: fullText };
              return updated;
            });
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }
    } catch (err) {
      console.error("AI Q&A 에러:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "답변 생성에 실패했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-80 flex-col border-l bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-medium">AI 질문</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-sm text-gray-400">
            이 문서에 대해 질문해보세요
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-8 bg-gray-900 text-white"
                : "mr-8 bg-gray-100 text-gray-700"
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.content || "..."}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
            placeholder="질문을 입력하세요..."
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={loading || !input.trim()}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
