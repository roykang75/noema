"use client";

import { useState } from "react";

/**
 * YouTube URL에서 비디오 ID 추출
 * 지원 형식: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 */
function extractYouTubeId(url: string): string | null {
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

interface YouTubeEmbedProps {
  /** YouTube embed URL 삽입 콜백 */
  onInsert: (embedUrl: string) => void;
}

/**
 * YouTube URL 입력 → embed URL 생성 후 콜백 호출
 * 에디터 툴바에 배치되어 YouTube 동영상을 문서에 삽입하는 데 사용됨
 */
export default function YouTubeEmbed({ onInsert }: YouTubeEmbedProps) {
  const [url, setUrl] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState("");

  const handleInsert = () => {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setError("유효한 YouTube URL을 입력해주세요");
      return;
    }
    onInsert(`https://www.youtube.com/embed/${videoId}`);
    setUrl("");
    setShowInput(false);
    setError("");
  };

  const handleCancel = () => {
    setShowInput(false);
    setUrl("");
    setError("");
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
        title="YouTube 동영상 삽입"
      >
        ▶ YouTube
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleInsert();
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="YouTube URL 입력... (예: https://youtu.be/dQw4w9WgXcQ)"
        className="flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        autoFocus
      />
      <button
        onClick={handleInsert}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
      >
        삽입
      </button>
      <button
        onClick={handleCancel}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        취소
      </button>
      {error && <span className="w-full text-xs text-red-500">{error}</span>}
    </div>
  );
}

interface YouTubePlayerProps {
  /** YouTube embed URL (예: https://www.youtube.com/embed/VIDEO_ID) */
  embedUrl: string;
}

/**
 * YouTube 동영상 플레이어 (iframe 임베드)
 * 문서 내에서 삽입된 YouTube 동영상을 렌더링함
 */
export function YouTubePlayer({ embedUrl }: YouTubePlayerProps) {
  return (
    <div className="my-4 aspect-video w-full max-w-2xl overflow-hidden rounded-lg shadow-sm">
      <iframe
        src={embedUrl}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}
