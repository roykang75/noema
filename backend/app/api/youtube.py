"""YouTube 메타데이터 프록시 라우터

YouTube oEmbed는 CORS를 지원하지 않으므로 백엔드에서 프록시합니다.
"""

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.get("/metadata")
async def get_youtube_metadata(video_id: str = Query(..., min_length=5, max_length=20)):
    """YouTube 영상 메타데이터 조회 (제목, 채널명, 썸네일)

    YouTube oEmbed API 사용 — API 키 불필요, CORS 우회용 프록시.
    응답 예: {"title": "...", "author_name": "...", "thumbnail_url": "..."}
    """
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    oembed_url = f"https://www.youtube.com/oembed?url={watch_url}&format=json"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(oembed_url)
            if res.status_code != 200:
                raise HTTPException(
                    status_code=404,
                    detail=f"YouTube 메타데이터를 조회할 수 없습니다 (video_id={video_id})",
                )
            data = res.json()

        return {
            "video_id": video_id,
            "title": data.get("title", ""),
            "author_name": data.get("author_name", ""),
            "author_url": data.get("author_url", ""),
            "thumbnail_url": data.get(
                "thumbnail_url",
                f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            ),
            "provider_name": data.get("provider_name", "YouTube"),
        }
    except httpx.HTTPError as e:
        logger.warning("YouTube oEmbed 조회 실패: %s", e)
        raise HTTPException(status_code=502, detail="YouTube 서버 응답 실패")
