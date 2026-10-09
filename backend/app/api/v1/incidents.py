import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, UserSession
from app.api.v1.auth import get_current_user_and_session
from app.schemas.incident import (
    WasteCategoryResponse,
    MediaUploadResponse,
    IncidentCreateRequest,
    IncidentCreateResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    IncidentDetailResponse,
)
from app.services.watermark_service import apply_image_watermark, save_video_media
from app.services.incident_service import (
    get_active_waste_categories,
    check_duplicate_incidents,
    create_new_incident,
    get_incident_detail,
)

router = APIRouter(prefix="/incidents", tags=["Incidents & Multimedia Reporting"])


@router.get("/categories", response_model=List[WasteCategoryResponse])
async def list_incident_categories(db: AsyncSession = Depends(get_db)):
    """
    Màn 1: Lấy danh sách 4 nhóm danh mục sự cố môi trường và thời hạn SLA cam kết.
    Dữ liệu 100% thời gian thực từ bảng waste_categories trong PostgreSQL.
    """
    return await get_active_waste_categories(db)


@router.post("/upload-media", response_model=MediaUploadResponse)
async def upload_and_watermark_media(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
):
    """
    Màn 2: Tiếp nhận bằng chứng hình ảnh/video sự cố, tự động đóng dấu Watermark:
    - Ngày giờ chụp (giờ máy chủ Việt Nam UTC+7)
    - Toạ độ GPS (Kinh độ & Vĩ độ)
    - Ràng buộc: Ảnh tối đa 10MB (JPG/PNG), Video tối đa 50MB (MP4, tối đa 30s).
    """
    content = await file.read()
    file_size = len(content)
    filename = file.filename or "media.jpg"
    content_type = file.content_type or ""

    # Kiểm tra định dạng và dung lượng theo đặc tả
    is_image = content_type.startswith("image/") or filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    is_video = content_type.startswith("video/") or filename.lower().endswith((".mp4", ".mov", ".webm"))

    if not is_image and not is_video:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp không hợp lệ (ảnh JPG/PNG tối đa 10MB, video MP4 tối đa 50MB)",
        )

    # 10MB cho ảnh
    if is_image and file_size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp không hợp lệ (ảnh JPG/PNG tối đa 10MB, video MP4 tối đa 50MB)",
        )

    # 50MB cho video
    if is_video and file_size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp không hợp lệ (ảnh JPG/PNG tối đa 10MB, video MP4 tối đa 50MB)",
        )

    try:
        if is_image:
            file_url, thumb_url, actual_size, watermark_text = apply_image_watermark(
                input_bytes=content,
                latitude=latitude,
                longitude=longitude,
            )
            media_type = "IMAGE"
        else:
            ext = filename.split(".")[-1] if "." in filename else "mp4"
            file_url, thumb_url, actual_size, watermark_text = save_video_media(
                video_bytes=content,
                extension=ext,
                latitude=latitude,
                longitude=longitude,
            )
            media_type = "VIDEO"

        return MediaUploadResponse(
            media_id=uuid.uuid4().hex,
            file_url=file_url,
            thumbnail_url=thumb_url,
            media_type=media_type,
            file_size_bytes=actual_size,
            mime_type=content_type or ("image/jpeg" if is_image else "video/mp4"),
            watermark_applied=True,
            watermark_text=watermark_text,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xử lý tệp này. Vui lòng thử lại",
        )


@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
async def check_duplicates_endpoint(
    payload: DuplicateCheckRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 5: Phát hiện báo cáo tương tự gần vị trí này (bán kính 100m) bằng PostGIS ST_DWithin.
    """
    return await check_duplicate_incidents(
        db=db,
        lat=payload.latitude,
        lng=payload.longitude,
        radius_meters=payload.radius_meters,
        category_id=payload.category_id,
    )


@router.post("", response_model=IncidentCreateResponse)
async def submit_incident_report(
    payload: IncidentCreateRequest,
    auth_data: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 5: Gửi toàn bộ thông tin phản ánh sự cố môi trường:
    - Bắt buộc token đăng nhập hợp lệ (từ nhánh Dat/4).
    - Kiểm tra vị trí trong 22 quận/huyện TP.HCM.
    - Áp dụng giới hạn tần suất (chống spam).
    - Cấp mã sự cố duy nhất #INC-0001 và cam kết thời hạn SLA theo loại sự cố.
    - Cộng điểm Green Points (+20 điểm) cho công dân.
    """
    current_user, _ = auth_data

    # Kiểm tra ràng buộc bắt buộc theo đặc tả: ít nhất 1 ảnh/video
    if not payload.media or len(payload.media) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng thêm ít nhất 1 ảnh hoặc video",
        )

    try:
        response = await create_new_incident(
            db=db,
            data=payload,
            current_user_id=current_user.user_id,
        )
        return response
    except PermissionError as pe:
        # Lỗi chống spam
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(pe),
        )
    except ValueError as ve:
        # Lỗi toạ độ ngoài phạm vi hoặc thiếu dữ liệu
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể gửi phản ánh. Vui lòng thử lại",
        )


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
async def get_incident_detail_endpoint(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy chi tiết phản ánh theo mã UUID hoặc xem lại tiến độ xử lý theo SLA.
    """
    inc = await get_incident_detail(db, incident_id)
    if not inc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sự cố phản ánh.",
        )
    return inc

