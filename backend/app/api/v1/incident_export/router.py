"""
FastAPI Router cho STT 47: Xuất danh sách sự cố ra Excel hoặc PDF theo bộ lọc
- Màn 1/4: Giao diện quản lý và trích xuất dữ liệu sự cố (Data Export & Incident Reporting Console)
- Màn 2/4: Modal Popup XUẤT DANH SÁCH (Tùy chọn định dạng Excel/PDF)
- Màn 3/4: Modal Popup ĐÃ TẠO TỆP (Download kèm bảo mật hết hạn 15 phút)
- Màn 4/4: Modal Popup KHÔNG CÓ DỮ LIỆU (Empty State Warning)

Tuân thủ Clean Architecture, Dependency Injection và Explicit SQL.
"""

import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.crud.incident_export.incident_export_repository import IncidentExportRepository
from app.services.incident_export.incident_export_service import IncidentExportService
from app.schemas.incident_export.schemas import (
    ExportCreatedResponse,
    ExportMetadataOptionsResponse,
    ExportStatusResponse,
    IncidentExportFilterParams,
    IncidentPreviewResponse,
    TriggerExportRequest,
)
from app.utils.security import decode_access_token

router = APIRouter(prefix="/incidents/export", tags=["Xuất danh sách sự cố (Data Export - STT 47)"])


def get_incident_export_service(
    session: AsyncSession = Depends(get_db),
) -> IncidentExportService:
    """Dependency Injection cung cấp IncidentExportService tuân thủ DIP."""
    repo = IncidentExportRepository(session=session)
    return IncidentExportService(repository=repo)


def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[uuid.UUID]:
    """Trích xuất user_id từ Authorization Bearer Token nếu có."""
    if not authorization:
        return None
    try:
        token = authorization.replace("Bearer ", "").strip()
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            return uuid.UUID(payload["sub"])
    except Exception:
        pass
    return None


@router.get(
    "/options",
    response_model=ExportMetadataOptionsResponse,
    summary="Lấy danh mục tùy chọn cho bộ lọc Màn 1/4 (22 quận/huyện, loại sự cố, trạng thái, chọn nhanh ngày)",
)
async def get_filter_metadata(
    service: IncidentExportService = Depends(get_incident_export_service),
):
    """Cung cấp danh mục quận huyện, loại sự cố cho dropdown bộ lọc cột trái."""
    return await service.get_metadata_options()


@router.post(
    "/preview",
    response_model=IncidentPreviewResponse,
    summary="Áp dụng bộ lọc và xem trước danh sách sự cố tại cột giữa (Màn 1/4)",
)
async def preview_incidents(
    params: IncidentExportFilterParams,
    service: IncidentExportService = Depends(get_incident_export_service),
):
    """
    Truy vấn và trả về danh sách sự cố theo bộ lọc với các cột chuẩn:
    Mã | Loại | Quận | Trạng thái (phân trang).
    """
    try:
        return await service.preview_incidents(params)
    except Exception as e:
        # Khi xảy ra lỗi truy vấn CSDL: Banner cảnh báo đỏ xuất hiện tại đầu trang
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi truy vấn danh sách sự cố. Vui lòng thử lại sau ít phút.",
        )


@router.post(
    "/generate",
    response_model=ExportCreatedResponse,
    summary="Khởi tạo tiến trình xuất dữ liệu ra Excel hoặc PDF (Màn 2/4 chuyển sang Màn 3/4)",
)
async def generate_export(
    request: TriggerExportRequest,
    user_id: Optional[uuid.UUID] = Depends(get_optional_user_id),
    service: IncidentExportService = Depends(get_incident_export_service),
):
    """
    Sinh tệp Excel (.xlsx) hoặc Adobe PDF (.pdf) dựa trên các tiêu chí lọc hiện tại.
    Tạo link tải có thời hạn bảo mật 15 phút.
    """
    try:
        return await service.generate_export(request, user_id=user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khởi tạo tệp xuất dữ liệu: {str(e)}",
        )


@router.get(
    "/{export_id}/status",
    response_model=ExportStatusResponse,
    summary="Kiểm tra trạng thái tệp xuất và thời hạn bảo mật 15 phút (Màn 3/4)",
)
async def get_export_status(
    export_id: uuid.UUID,
    service: IncidentExportService = Depends(get_incident_export_service),
):
    """Kiểm tra tệp và cảnh báo nếu liên kết đã hết hạn sau 15 phút."""
    try:
        return await service.get_export_status(export_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/{export_id}/download",
    summary="Tải tệp báo cáo về máy tính thông qua Secure Download Link (Màn 3/4)",
)
async def download_file(
    export_id: uuid.UUID,
    service: IncidentExportService = Depends(get_incident_export_service),
):
    """
    Tải trực tiếp tệp về máy người dùng.
    Nếu liên kết quá 15 phút sẽ trả về mã lỗi 410 Gone theo chính sách an toàn thông tin.
    """
    try:
        file_path, file_name, mime_type = await service.get_download_file(export_id)
        return FileResponse(
            path=file_path,
            filename=file_name,
            media_type=mime_type,
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=str(e),
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
