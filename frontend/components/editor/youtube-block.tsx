"use client";

/**
 * BlockNote 커스텀 YouTube 블록
 *
 * - type: "youtube"
 * - props: { videoId: string }
 * - content: "none" (블록 자체에 텍스트 콘텐츠 없음)
 *
 * 렌더링:
 * - 초기: 썸네일 + YouTube 재생 아이콘 오버레이 + 메타데이터 카드
 * - 썸네일 클릭 시: iframe (autoplay=1)로 교체되어 그 자리에서 재생
 */

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createReactBlockSpec } from "@blocknote/react";

interface YouTubeMetadata {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// 정확히 11자 [A-Za-z0-9_-] — YouTube video ID 형식
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * author_url이 YouTube 공식 호스트인지 확인 (XSS 방어)
 */
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
 * YouTube 임베드 카드 — 썸네일 + 재생 오버레이 + 메타 카드
 */
function YouTubeCard({ videoId }: { videoId: string }) {
  const { data: session } = useSession();
  const [playing, setPlaying] = useState(false);
  const [meta, setMeta] = useState<YouTubeMetadata | null>(null);
  const [metaError, setMetaError] = useState(false);

  const isValidId = VIDEO_ID_RE.test(videoId);

  // 메타데이터 조회 — AbortController로 중복 요청 취소
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
      className="my-2 w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      // 에디터가 이 블록 안쪽 클릭을 텍스트 편집으로 가로채지 않도록 contentEditable 차단
      contentEditable={false}
      suppressContentEditableWarning
    >
      {/* 플레이어/썸네일 영역 */}
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
            onClick={() => setPlaying(true)}
            className="group relative block h-full w-full cursor-pointer overflow-hidden"
            aria-label="재생"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={meta?.title || "YouTube 썸네일"}
              onError={(e) => {
                // hqdefault.jpg가 404인 경우 0.jpg로 폴백
                const img = e.currentTarget;
                const fallback = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                if (img.src !== fallback) img.src = fallback;
              }}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {/* 재생 버튼 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
              <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-red-600/95 shadow-lg transition-transform group-hover:scale-110">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8 fill-white"
                  aria-hidden
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* 메타데이터 카드 */}
      <div className="flex items-start gap-3 p-3">
        {/* YouTube 아이콘 */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-600">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-white"
            aria-hidden
          >
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
              >
                {meta.title}
              </a>
              <a
                href={safeAuthorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block truncate text-xs text-gray-500 hover:text-gray-700"
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
            >
              {watchUrl}
            </a>
          ) : (
            <div className="text-sm text-gray-400">
              정보 불러오는 중...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * BlockNote 커스텀 블록 스펙 — type: "youtube"
 * createReactBlockSpec은 factory 함수를 반환하므로 스키마 등록 시 호출(`()`)해야 함.
 */
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
