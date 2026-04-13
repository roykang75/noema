"""YouTube 메타데이터 프록시 라우터

YouTube oEmbed + (선택) Data API v3 통합.
- oEmbed: 제목, 채널, 썸네일 (API 키 불필요)
- Data API v3: 조회수, 좋아요, 재생시간, 설명, 태그 (YOUTUBE_API_KEY 필요)

보안:
- 인증 필수
- Redis TTL 캐시
- video_id 정규식 검증 (11자 [A-Za-z0-9_-])
- author_url 화이트리스트
"""

import json
import logging
import re
from urllib.parse import quote, urlparse

import httpx
import redis.asyncio as redis_async
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import get_settings
from app.core.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/youtube", tags=["youtube"])

VIDEO_ID_PATTERN = r"^[A-Za-z0-9_-]{11}$"
VIDEO_ID_RE = re.compile(VIDEO_ID_PATTERN)
CACHE_TTL_SECONDS = 3600
ALLOWED_AUTHOR_HOSTS = {"www.youtube.com", "youtube.com"}

# ISO 8601 duration → "MM:SS" or "HH:MM:SS"
ISO_DURATION_RE = re.compile(
    r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?",
)


def _sanitize_author_url(url: str | None) -> str:
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            return ""
        if parsed.hostname not in ALLOWED_AUTHOR_HOSTS:
            return ""
        return url
    except Exception:
        return ""


def _sanitize_thumbnail(url: str | None, video_id: str) -> str:
    fallback = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    if not url:
        return fallback
    try:
        p = urlparse(url)
        if p.scheme != "https":
            return fallback
        host = p.hostname or ""
        if host.endswith(".ytimg.com") or host.endswith(".youtube.com"):
            return url
        return fallback
    except Exception:
        return fallback


def _parse_iso_duration(iso: str) -> str:
    """ISO 8601 duration (PT35M21S) → '35:21' or '1:02:03' 포맷"""
    if not iso:
        return ""
    m = ISO_DURATION_RE.fullmatch(iso)
    if not m:
        return ""
    h = int(m.group(1) or 0)
    mi = int(m.group(2) or 0)
    s = int(m.group(3) or 0)
    if h:
        return f"{h}:{mi:02d}:{s:02d}"
    return f"{mi}:{s:02d}"


def _extract_hashtags(description: str) -> list[str]:
    """설명 텍스트에서 해시태그(#foo) 추출 (중복 제거, 최대 5개)"""
    if not description:
        return []
    tags = re.findall(r"#([\w가-힣]+)", description)
    seen: list[str] = []
    for t in tags:
        if t not in seen:
            seen.append(t)
        if len(seen) >= 5:
            break
    return [f"#{t}" for t in seen]


async def _fetch_oembed(client: httpx.AsyncClient, video_id: str) -> dict:
    watch_url = f"https://www.youtube.com/watch?v={quote(video_id, safe='')}"
    oembed_url = (
        f"https://www.youtube.com/oembed?url={quote(watch_url, safe=':/?=&')}"
        f"&format=json"
    )
    res = await client.get(oembed_url)
    if res.status_code == 401:
        raise HTTPException(status_code=403, detail="비공개 영상입니다")
    if res.status_code == 404:
        raise HTTPException(status_code=404, detail="영상을 찾을 수 없습니다")
    if res.status_code >= 500:
        raise HTTPException(status_code=502, detail="YouTube 일시적 오류")
    if res.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"YouTube 예상치 못한 응답 ({res.status_code})",
        )
    return res.json()


async def _fetch_data_api(
    client: httpx.AsyncClient, video_id: str, api_key: str,
) -> dict | None:
    """YouTube Data API v3 — 조회수/좋아요/재생시간/설명/태그

    실패하거나 API 키 없으면 None 반환 (graceful fallback).
    """
    if not api_key:
        return None

    url = (
        "https://www.googleapis.com/youtube/v3/videos"
        f"?part=snippet,statistics,contentDetails"
        f"&id={quote(video_id, safe='')}"
        f"&key={quote(api_key, safe='')}"
    )
    try:
        res = await client.get(url)
        if res.status_code != 200:
            logger.warning("YouTube Data API 응답 %s", res.status_code)
            return None
        data = res.json()
        items = data.get("items") or []
        if not items:
            return None
        item = items[0]
        snippet = item.get("snippet") or {}
        stats = item.get("statistics") or {}
        details = item.get("contentDetails") or {}

        description = str(snippet.get("description") or "")
        return {
            "description": description[:1000],  # 너무 길면 컷
            "hashtags": _extract_hashtags(description),
            "view_count": int(stats.get("viewCount") or 0),
            "like_count": int(stats.get("likeCount") or 0),
            "duration": _parse_iso_duration(details.get("duration") or ""),
            "published_at": str(snippet.get("publishedAt") or ""),
        }
    except Exception as e:
        logger.warning("YouTube Data API 호출 실패: %s", e)
        return None


@router.get("/metadata")
async def get_youtube_metadata(
    video_id: str = Query(
        ...,
        min_length=11,
        max_length=11,
        pattern=VIDEO_ID_PATTERN,
    ),
    _user: User = Depends(get_current_user),
):
    """YouTube 영상 메타데이터 조회 — oEmbed + 선택적 Data API v3 + Redis 캐시"""
    if not VIDEO_ID_RE.fullmatch(video_id):
        raise HTTPException(status_code=400, detail="잘못된 video_id 형식")

    settings = get_settings()
    cache_key = f"youtube:meta:{video_id}"

    # 1) Redis 캐시
    redis_client: redis_async.Redis | None = None
    try:
        redis_client = redis_async.from_url(
            settings.REDIS_URL, decode_responses=True,
        )
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning("Redis 캐시 조회 실패: %s", e)

    # 2) oEmbed + Data API v3 병렬 호출
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            oembed = await _fetch_oembed(client, video_id)
            extra = await _fetch_data_api(
                client, video_id, settings.YOUTUBE_API_KEY,
            )
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.warning("YouTube 호출 실패: %s", e)
        raise HTTPException(status_code=502, detail="YouTube 서버 응답 실패")

    payload = {
        "video_id": video_id,
        "title": str(oembed.get("title", ""))[:500],
        "author_name": str(oembed.get("author_name", ""))[:200],
        "author_url": _sanitize_author_url(oembed.get("author_url")),
        "thumbnail_url": _sanitize_thumbnail(
            oembed.get("thumbnail_url"), video_id,
        ),
        # Data API v3 부가 정보 — 키 없으면 빈 값
        "description": (extra or {}).get("description", ""),
        "hashtags": (extra or {}).get("hashtags", []),
        "view_count": (extra or {}).get("view_count", 0),
        "like_count": (extra or {}).get("like_count", 0),
        "duration": (extra or {}).get("duration", ""),
        "published_at": (extra or {}).get("published_at", ""),
    }

    # 3) 캐시 저장
    if redis_client is not None:
        try:
            await redis_client.set(
                cache_key, json.dumps(payload), ex=CACHE_TTL_SECONDS,
            )
        except Exception as e:
            logger.warning("Redis 캐시 저장 실패: %s", e)
        finally:
            try:
                await redis_client.aclose()
            except Exception:
                pass

    return payload
