"use client";

/**
 * BlockNote 커스텀 YouTube 블록
 *
 * - type: "youtube"
 * - props: { videoId: string }
 * - content: "none"
 *
 * 렌더링:
 * - 초기: 썸네일 + ▶ 재생 오버레이 + 메타데이터 카드
 * - 썸네일 클릭 시: iframe(autoplay=1)로 교체되어 그 자리에서 재생
 * - 블록 선택 시: 하단에 툴바 노출 (새창, 크기 모드, 임베드, 어시스턴트)
 */

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { createReactBlockSpec } from "@blocknote/react";
import { useAIChatStore } from "@/lib/stores/ai-chat-store";

interface YouTubeMetadata {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function isSafeYouTubeUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return u.hostname === "www.youtube.com" || u.hostname === "youtube.com";
  } catch {
    return false;
  }
}

/**
 * 하단 툴바 — 블록이 선택되었을 때만 표시
 * 왼쪽부터:
 *   1. 새 창에서 재생 (동작)
 *   2. 작은 상태 (placeholder, 추후 구현)
 *   3. 보통 상태 (placeholder, 추후 구현)
 *   4. 카드 형태 (placeholder, 추후 구현)
 *   5. 임베드 (현재 활성 상태)
 *   ─── 구분
 *   어시스턴트 (AI 질문 패널 토글)
 */
function YouTubeToolbar({ watchUrl }: { watchUrl: string }) {
  const openChat = useAIChatStore((s) => s.open);

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100";
  const activeIconBtn =
    "flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600";

  return (
    <div
      className="mt-1 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
      contentEditable={false}
      suppressContentEditableWarning
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 1. 새 창에서 재생 */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBtn}
        title="새 창에서 재생"
        aria-label="새 창에서 재생"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 3h7v7" />
          <path d="M10 14L21 3" />
          <path d="M21 14v7h-7" />
          <path d="M3 10v11h11" />
          <path d="M3 10L10 3" strokeOpacity="0" />
          <path d="M10 3H3v7" />
        </svg>
      </a>

      {/* 2. 작은 상태 (placeholder) */}
      <button
        type="button"
        disabled
        className={`${iconBtn} opacity-50 cursor-not-allowed`}
        title="작은 상태 (추후 구현)"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="7" width="18" height="4" rx="1" />
          <rect x="3" y="13" width="18" height="4" rx="1" />
        </svg>
      </button>

      {/* 3. 보통 상태 (placeholder) */}
      <button
        type="button"
        disabled
        className={`${iconBtn} opacity-50 cursor-not-allowed`}
        title="보통 상태 (추후 구현)"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="5" width="16" height="14" rx="2" />
        </svg>
      </button>

      {/* 4. 카드 형태 (placeholder) */}
      <button
        type="button"
        disabled
        className={`${iconBtn} opacity-50 cursor-not-allowed`}
        title="카드 형태 (추후 구현)"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="7" width="14" height="10" rx="2" />
          <rect x="7" y="3" width="14" height="10" rx="2" />
        </svg>
      </button>

      {/* 5. 임베드 (현재 활성) */}
      <button
        type="button"
        className={activeIconBtn}
        title="임베드 (현재)"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      {/* 구분선 */}
      <div className="mx-1 h-5 w-px bg-gray-200" />

      {/* 어시스턴트 */}
      <button
        type="button"
        onClick={() => openChat()}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
        title="AI 질문"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-[10px] text-white">
          A
        </span>
        어시스턴트
      </button>
    </div>
  );
}

/**
 * YouTube 임베드 카드 — 썸네일 + 재생 + 메타 카드 + 툴바
 */
function YouTubeCard({ videoId }: { videoId: string }) {
  const { data: session } = useSession();
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(false);
  const [meta, setMeta] = useState<YouTubeMetadata | null>(null);
  const [metaError, setMetaError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isValidId = VIDEO_ID_RE.test(videoId);

  // 전역 mousedown 리스너 — 카드 내부면 선택, 외부면 해제
  // React onClick은 BlockNote NodeView 내부에서 제대로 전파되지 않아 native 리스너 사용
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) {
        setSelected(true);
      } else {
        setSelected(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // 메타데이터 조회
  useEffect(() => {
    if (!isValidId) return;
    const controller = new AbortController();
    const token = (session as { accessToken?: string } | null)?.accessToken;

    async function loadMeta() {
      try {
        const res = await fetch(
          `${API_URL}/youtube/metadata?video_id=${encodeURIComponent(videoId)}`,
          {
            signal: controller.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (!res.ok) throw new Error(`metadata ${res.status}`);
        const data = (await res.json()) as YouTubeMetadata;
        if (!controller.signal.aborted) setMeta(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setMetaError(true);
      }
    }

    loadMeta();
    return () => controller.abort();
  }, [videoId, isValidId, session]);

  if (!isValidId) {
    return (
      <div className="my-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
        잘못된 YouTube ID ({videoId || "빈 값"})
      </div>
    );
  }

  const thumbnailUrl =
    meta?.thumbnail_url ||
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const safeAuthorUrl = isSafeYouTubeUrl(meta?.author_url)
    ? meta!.author_url
    : watchUrl;

  return (
    <div
      ref={containerRef}
      contentEditable={false}
      suppressContentEditableWarning
      className="my-2 w-full max-w-2xl"
    >
      {/* 메인 카드 */}
      <div
        className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${
          selected ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
        }`}
      >
        {/* 플레이어/썸네일 */}
        <div className="relative aspect-video w-full bg-black">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={meta?.title || "YouTube video"}
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(true);
                setPlaying(true);
              }}
              className="group relative block h-full w-full cursor-pointer overflow-hidden"
              aria-label="재생"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailUrl}
                alt={meta?.title || "YouTube 썸네일"}
                onError={(e) => {
                  const img = e.currentTarget;
                  const fallback = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                  if (img.src !== fallback) img.src = fallback;
                }}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
                <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-red-600/95 shadow-lg transition-transform group-hover:scale-110">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* 메타데이터 */}
        <div className="flex items-start gap-3 p-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
              <path d="M23.498 6.186a2.99 2.99 0 0 0-2.106-2.116C19.537 3.5 12 3.5 12 3.5s-7.537 0-9.392.57A2.99 2.99 0 0 0 .502 6.186C0 8.06 0 12 0 12s0 3.94.502 5.814a2.99 2.99 0 0 0 2.106 2.116C4.463 20.5 12 20.5 12 20.5s7.537 0 9.392-.57a2.99 2.99 0 0 0 2.106-2.116C24 15.94 24 12 24 12s0-3.94-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            {meta ? (
              <>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-sm font-semibold text-gray-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {meta.title}
                </a>
                <a
                  href={safeAuthorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-xs text-gray-500 hover:text-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  {meta.author_name}
                </a>
              </>
            ) : metaError ? (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {watchUrl}
              </a>
            ) : (
              <div className="text-sm text-gray-400">정보 불러오는 중...</div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 툴바 — 선택되었을 때만 */}
      {selected && <YouTubeToolbar watchUrl={watchUrl} />}
    </div>
  );
}

export const youtubeBlockSpec = createReactBlockSpec(
  {
    type: "youtube" as const,
    propSchema: {
      videoId: { default: "" as string },
    },
    content: "none",
  },
  {
    render: ({ block }) => <YouTubeCard videoId={block.props.videoId} />,
  },
);
