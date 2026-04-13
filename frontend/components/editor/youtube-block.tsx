"use client";

/**
 * BlockNote 커스텀 YouTube 블록 — 4가지 표시 모드 지원
 *
 * props:
 *   - videoId: string (11자)
 *   - displayMode: "small" | "medium" | "card" | "embed"
 *
 * 모드:
 *   - small:  작은 썸네일 + 제목만 (가로 한 줄)
 *   - medium: 썸네일 + 제목 + 해시태그 + 채널/통계 (가로)
 *   - card:   세로 카드 (썸네일 위, 제목/설명/채널/통계 아래)
 *   - embed:  플레이어 iframe + 메타 카드 (기본값, 클릭 시 재생)
 */

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { createReactBlockSpec } from "@blocknote/react";

export type YouTubeDisplayMode = "small" | "medium" | "card" | "embed";

interface YouTubeMetadata {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  description: string;
  hashtags: string[];
  view_count: number;
  like_count: number;
  duration: string;
  published_at: string;
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

function formatCount(n: number): string {
  if (!n) return "";
  return n.toLocaleString("en-US");
}

/** 작은 YouTube 아이콘 (빨간 원형) */
function YouTubeIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-red-600"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        className="fill-white"
        style={{ width: size * 0.65, height: size * 0.65 }}
        aria-hidden
      >
        <path d="M23.498 6.186a2.99 2.99 0 0 0-2.106-2.116C19.537 3.5 12 3.5 12 3.5s-7.537 0-9.392.57A2.99 2.99 0 0 0 .502 6.186C0 8.06 0 12 0 12s0 3.94.502 5.814a2.99 2.99 0 0 0 2.106 2.116C4.463 20.5 12 20.5 12 20.5s7.537 0 9.392-.57a2.99 2.99 0 0 0 2.106-2.116C24 15.94 24 12 24 12s0-3.94-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z" />
      </svg>
    </span>
  );
}

/** ▶ 재생 버튼 오버레이 */
function PlayOverlay({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-8 w-12" : "h-14 w-20";
  const icon = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
      <div className={`flex ${box} items-center justify-center rounded-xl bg-red-600/95 shadow-lg transition-transform group-hover:scale-110`}>
        <svg viewBox="0 0 24 24" className={`${icon} fill-white`} aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

/** 썸네일 + onError 폴백 */
function Thumb({
  src, alt, videoId, className,
}: { src: string; alt: string; videoId: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={(e) => {
        const img = e.currentTarget;
        const fallback = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        if (img.src !== fallback) img.src = fallback;
      }}
      className={className}
    />
  );
}

// ─────────────────────────────────────────────
// 4가지 레이아웃

/** 작은 상태 — 썸네일 + 제목만 */
function SmallLayout({
  videoId, meta, thumbnailUrl, watchUrl,
}: LayoutProps) {
  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 flex max-w-2xl items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-blue-300"
    >
      <div className="relative h-16 w-28 flex-shrink-0 bg-black">
        <Thumb
          src={thumbnailUrl}
          alt={meta?.title || ""}
          videoId={videoId}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center px-3">
        <span className="line-clamp-2 text-sm font-medium text-gray-900">
          {meta?.title || "YouTube 영상"}
        </span>
      </div>
    </a>
  );
}

/** 보통 상태 — 썸네일 + 제목 + 해시태그 + 채널/통계 */
function MediumLayout({
  videoId, meta, thumbnailUrl, watchUrl, safeAuthorUrl,
}: LayoutProps) {
  return (
    <div className="my-2 flex max-w-3xl items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* 썸네일 */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block h-24 w-40 flex-shrink-0 bg-black"
      >
        <Thumb
          src={thumbnailUrl}
          alt={meta?.title || ""}
          videoId={videoId}
          className="h-full w-full object-cover"
        />
      </a>
      {/* 컨텐츠 */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
        <div className="min-w-0">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-1 text-base font-semibold text-gray-900 hover:underline"
          >
            {meta?.title || "YouTube 영상"}
          </a>
          {(meta?.hashtags && meta.hashtags.length > 0) || meta?.description ? (
            <p className="mt-1 line-clamp-1 text-xs text-gray-500">
              {meta?.hashtags?.join(" ")}
              {meta?.hashtags && meta.hashtags.length > 0 && meta?.description
                ? "  —  "
                : ""}
              {meta?.description?.split("\n")[0]}
            </p>
          ) : null}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
          <YouTubeIcon size={18} />
          <a
            href={safeAuthorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:text-gray-900"
          >
            {meta?.author_name || ""}
          </a>
          {meta?.duration && <span>{meta.duration} min</span>}
          {meta?.view_count ? (
            <span>{formatCount(meta.view_count)} Views</span>
          ) : null}
          {meta?.like_count ? (
            <span>{formatCount(meta.like_count)} Likes</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 카드 형태 — 세로 카드 */
function CardLayout({
  videoId, meta, thumbnailUrl, watchUrl, safeAuthorUrl,
}: LayoutProps) {
  return (
    <div className="my-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-video w-full bg-black"
      >
        <Thumb
          src={thumbnailUrl}
          alt={meta?.title || ""}
          videoId={videoId}
          className="h-full w-full object-cover"
        />
        <PlayOverlay size="sm" />
      </a>
      <div className="p-3">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-semibold text-gray-900 hover:underline"
        >
          {meta?.title || "YouTube 영상"}
        </a>
        {meta?.hashtags && meta.hashtags.length > 0 ? (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
            {meta.hashtags.join(" ")}
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <YouTubeIcon size={18} />
          <a
            href={safeAuthorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:text-gray-900"
          >
            {meta?.author_name || ""}
          </a>
          {meta?.duration && <span className="ml-auto">{meta.duration}</span>}
        </div>
      </div>
    </div>
  );
}

/** 임베드 — 재생 가능한 iframe (기본) */
function EmbedLayout({
  videoId, meta, thumbnailUrl, watchUrl, safeAuthorUrl,
  playing, setPlaying,
}: LayoutProps & { playing: boolean; setPlaying: (v: boolean) => void }) {
  return (
    <div className="my-2 w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
              setPlaying(true);
            }}
            className="group relative block h-full w-full cursor-pointer overflow-hidden"
            aria-label="재생"
          >
            <Thumb
              src={thumbnailUrl}
              alt={meta?.title || ""}
              videoId={videoId}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <PlayOverlay />
          </button>
        )}
      </div>
      <div className="flex items-start gap-3 p-3">
        <YouTubeIcon size={32} />
        <div className="min-w-0 flex-1">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 text-sm font-semibold text-gray-900 hover:underline"
          >
            {meta?.title || "정보 불러오는 중..."}
          </a>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <a
              href={safeAuthorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-gray-700"
            >
              {meta?.author_name || ""}
            </a>
            {meta?.duration && <span>· {meta.duration} min</span>}
            {meta?.view_count ? (
              <span>· {formatCount(meta.view_count)} Views</span>
            ) : null}
            {meta?.like_count ? (
              <span>· {formatCount(meta.like_count)} Likes</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────

interface LayoutProps {
  videoId: string;
  meta: YouTubeMetadata | null;
  thumbnailUrl: string;
  watchUrl: string;
  safeAuthorUrl: string;
}

/** YouTube 블록 루트 — displayMode 분기 */
function YouTubeCard({
  videoId, displayMode,
}: { videoId: string; displayMode: YouTubeDisplayMode }) {
  const { data: session } = useSession();
  const [playing, setPlaying] = useState(false);
  const [meta, setMeta] = useState<YouTubeMetadata | null>(null);
  const [metaError, setMetaError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isValidId = VIDEO_ID_RE.test(videoId);

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

  const layoutProps: LayoutProps = {
    videoId,
    meta: metaError ? null : meta,
    thumbnailUrl,
    watchUrl,
    safeAuthorUrl,
  };

  const body = (() => {
    switch (displayMode) {
      case "small":
        return <SmallLayout {...layoutProps} />;
      case "medium":
        return <MediumLayout {...layoutProps} />;
      case "card":
        return <CardLayout {...layoutProps} />;
      case "embed":
      default:
        return (
          <EmbedLayout
            {...layoutProps}
            playing={playing}
            setPlaying={setPlaying}
          />
        );
    }
  })();

  return (
    <div
      ref={containerRef}
      contentEditable={false}
      suppressContentEditableWarning
      // 블록 내부 클릭이 BlockNote/ProseMirror로 전파되어 중복 처리되는 것을 방지
      // (small/medium/card 모드에서 링크 클릭 시 2개 탭이 열리던 버그)
      onClickCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
    >
      {body}
    </div>
  );
}

export const youtubeBlockSpec = createReactBlockSpec(
  {
    type: "youtube" as const,
    propSchema: {
      videoId: { default: "" as string },
      displayMode: {
        default: "embed" as const,
        values: ["small", "medium", "card", "embed"] as const,
      },
    },
    content: "none",
  },
  {
    render: ({ block }) => (
      <YouTubeCard
        videoId={block.props.videoId}
        displayMode={
          (block.props.displayMode as YouTubeDisplayMode) || "embed"
        }
      />
    ),
  },
);
