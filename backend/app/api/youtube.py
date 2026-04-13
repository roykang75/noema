"""YouTube 메타데이터 프록시 라우터

YouTube oEmbed는 CORS를 지원하지 않으므로 백엔드에서 프록시합니다.
- 인증 필수 (익명 프록시 악용 방지)
- Redis TTL 캐시 (YouTube rate limit 회피)
- video_id 엄격한 정규식 검증 (11자 [a-zA-Z0-9_-])
- author_url 화이트리스트 (javascript:, 악성 URL 차단)
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

# YouTube video ID: 정확히 11자, 영숫자와 '-', '_'만 허용
VIDEO_ID_PATTERN = r"^[A-Za-z0-9_-]{11}$"
VIDEO_ID_RE = re.compile(VIDEO_ID_PATTERN)

# oEmbed 캐시 TTL (1시간)
CACHE_TTL_SECONDS = 3600

# author_url 허용 호스트
ALLOWED_AUTHOR_HOSTS = {"www.youtube.com", "youtube.com"}


def _sanitize_author_url(url: str | None) -> str:
    """author_url을 YouTube 공식 호스트만 허용"""
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
    """YouTube 영상 메타데이터 조회 — oEmbed 프록시 + Redis 캐시"""
    if not VIDEO_ID_RE.fullmatch(video_id):
        # Pydantic pattern 검증을 통과한 경우에도 방어적으로 한 번 더
        raise HTTPException(status_code=400, detail="잘못된 video_id 형식")

    settings = get_settings()
    cache_key = f"youtube:meta:{video_id}"

    # 1) Redis 캐시 조회
    redis_client: redis_async.Redis | None = None
    try:
        redis_client = redis_async.from_url(
            settings.REDIS_URL, decode_responses=True,
        )
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning("Redis 캐시 조회 실패 (계속 진행): %s", e)

    # 2) oEmbed 조회
    watch_url = f"https://www.youtube.com/watch?v={quote(video_id, safe='')}"
    oembed_url = (
        f"https://www.youtube.com/oembed?url={quote(watch_url, safe=':/?=&')}"
        f"&format=json"
    )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(oembed_url)
    except httpx.HTTPError as e:
        logger.warning("YouTube oEmbed 호출 실패: %s", e)
        raise HTTPException(status_code=502, detail="YouTube 서버 응답 실패")

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

    try:
        data = res.json()
    except Exception:
        raise HTTPException(status_code=502, detail="YouTube 응답 파싱 실패")

    payload = {
        "video_id": video_id,
        "title": str(data.get("title", ""))[:500],
        "author_name": str(data.get("author_name", ""))[:200],
        "author_url": _sanitize_author_url(data.get("author_url")),
        "thumbnail_url": (
            _sanitize_author_url(data.get("thumbnail_url"))
            or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        ),
    }
    # thumbnail_url은 youtube 이미지 호스트도 허용되어야 함 — 별도 처리
    raw_thumb = data.get("thumbnail_url") or ""
    try:
        thumb_parsed = urlparse(raw_thumb)
        if thumb_parsed.scheme == "https" and (
            thumb_parsed.hostname
            and (
                thumb_parsed.hostname.endswith(".ytimg.com")
                or thumb_parsed.hostname.endswith(".youtube.com")
            )
        ):
            payload["thumbnail_url"] = raw_thumb
        else:
            payload["thumbnail_url"] = (
                f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
            )
    except Exception:
        payload["thumbnail_url"] = (
            f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        )

    # 3) Redis 캐시 저장 (best-effort)
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
