import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, UserSession
from app.api.v1.auth import get_current_user_and_session
from app.schemas.offline_sync import (
    OfflineSubmissionRequest,
    OfflineSubmissionResponse,
    OfflineSubmissionStatusResponse,
)
from app.services.offline_sync_service import (
    submit_offline_incident,
    get_submission_status,
)
from app.services.watermark_service import (
    apply_image_watermark,
    save_video_media,
    save_audio_media,
)

router = APIRouter(prefix="/offline-sync", tags=["Offline Sync (STT 19)"])


@router.post("/incidents", response_model=OfflineSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_offline_incident_endpoint(
    payload: OfflineSubmissionRequest,
    auth_data: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Tiếp nhận và đồng bộ phản ánh sự cố ngoại tuyến (STT 19 - Chế độ Offline-First).
    Hỗ trợ Idempotency: gửi lại cùng client_submission_id sẽ trả về kết quả cũ mà không tạo trùng.
    """
    current_user, _ = auth_data

    # Kiểm tra ràng buộc bắt buộc: có ít nhất 1 bằng chứng media (ảnh, video hoặc ghi âm)
    if not payload.media or len(payload.media) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng đính kèm ít nhất 1 ảnh, video hoặc bản ghi âm sự cố.",
        )

    try:
        response = await submit_offline_incident(
            db=db,
            data=payload,
            current_user_id=current_user.user_id,
        )
        return response
    except PermissionError as pe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(pe),
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi đồng bộ phản ánh ngoại tuyến: {str(e)}",
        )


@router.get("/submissions/{client_submission_id}", response_model=OfflineSubmissionStatusResponse)
async def get_offline_submission_status_endpoint(
    client_submission_id: str,
    auth_data: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Tra cứu trạng thái biên nhận đồng bộ ngoại tuyến theo client_submission_id.
    """
    current_user, _ = auth_data
    try:
        result = await get_submission_status(
            db=db,
            client_submission_id=client_submission_id,
            current_user_id=current_user.user_id,
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy biên nhận phản ánh ngoại tuyến với mã này.",
            )
        return result
    except PermissionError as pe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(pe),
        )


@router.post("/media/upload")
async def upload_offline_media_endpoint(
    file: UploadFile = File(...),
    client_file_id: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    captured_at: Optional[str] = Form(None),
    auth_data: tuple[User, UserSession] = Depends(get_current_user_and_session),
):
    """
    Upload tệp đa phương tiện (ảnh, video, âm thanh) được lưu trong hàng đợi ngoại tuyến.
    Bảo toàn mộc thời gian chụp/ghi âm thực tế ngoại tuyến (captured_at).
    """
    content = await file.read()
    file_size = len(content)
    filename = file.filename or "media.jpg"
    content_type = file.content_type or ""

    is_image = content_type.startswith("image/") or filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    is_audio = (
        content_type.startswith("audio/")
        or filename.lower().endswith((".mp3", ".wav", ".m4a", ".ogg", ".aac"))
    )
    is_video = (
        not is_audio
        and (
            content_type.startswith("video/")
            or filename.lower().endswith((".mp4", ".mov", ".webm", ".avi", ".mkv"))
        )
    )

    if not is_image and not is_video and not is_audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp không hợp lệ (ảnh tối đa 10MB, video tối đa 50MB, âm thanh tối đa 20MB)",
        )

    if is_image and file_size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp ảnh vượt quá dung lượng tối đa 10MB.",
        )
    if is_video and file_size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp video vượt quá dung lượng tối đa 50MB.",
        )
    if is_audio and file_size > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp ghi âm vượt quá dung lượng tối đa 20MB.",
        )

    # Đóng dấu watermark và lưu trữ theo loại phương tiện
    if is_image:
        file_url, thumb_url, actual_size, watermark_text = apply_image_watermark(
            input_bytes=content,
            latitude=latitude,
            longitude=longitude,
            server_time_str=captured_at,
        )
    elif is_video:
        ext = filename.split(".")[-1] if "." in filename else "mp4"
        file_url, thumb_url, actual_size, watermark_text = save_video_media(
            video_bytes=content,
            extension=ext,
            latitude=latitude,
            longitude=longitude,
            server_time_str=captured_at,
        )
    else:
        # Audio
        ext = filename.split(".")[-1] if "." in filename else "webm"
        file_url, thumb_url, actual_size, watermark_text = save_audio_media(
            audio_bytes=content,
            extension=ext,
            latitude=latitude,
            longitude=longitude,
            server_time_str=captured_at,
        )

    return {
        "client_file_id": client_file_id,
        "file_url": file_url,
        "thumbnail_url": thumb_url,
        "media_type": "IMAGE" if is_image else ("VIDEO" if is_video else "AUDIO"),
        "file_size_bytes": actual_size,
        "mime_type": content_type or ("image/jpeg" if is_image else ("video/mp4" if is_video else "audio/webm")),
        "captured_at": captured_at,
        "watermark_applied": bool(is_image or is_video),
        "watermark_text": watermark_text,
    }
