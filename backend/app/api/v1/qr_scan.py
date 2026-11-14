"""
GreenSpot API Router - Quét & Tạo mã QR nhận điểm thưởng (Chức năng 34)
Endpoints:
- POST /api/v1/gamification/qr/scan: Quét mã QR nhận điểm
- POST /api/v1/gamification/qr/create: Tạo mã QR mới (Lưu hệ thống)
- GET  /api/v1/gamification/qr/list: Danh sách mã QR hệ thống
- GET  /api/v1/gamification/qr/info/{code}: Tra cứu thông tin mã QR
"""

from typing import Optional
from fastapi import APIRouter, Depends, Path, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models.rbac import User
from app.utils.security import decode_access_token
from app.api.v1.rbac import get_current_active_user
from app.services.qr_scan_service import QRScanService
from app.schemas.qr_scan import (
    QRScanRequest,
    QRScanResponse,
    QRCodeDetail,
    QRCodeCreateRequest,
    QRCodeListResponse,
)

router = APIRouter(prefix="/gamification/qr", tags=["Quét & Tạo mã QR nhận điểm thưởng (34)"])


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None
    try:
        user_uuid = uuid.UUID(user_id_str)
        res = await db.execute(select(User).where(User.user_id == user_uuid))
        return res.scalar_one_or_none()
    except Exception:
        return None


@router.post("/scan", response_model=QRScanResponse, summary="Xác thực mã QR và cộng điểm thưởng cho công dân")
async def scan_qr_code(
    payload: QRScanRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await QRScanService.process_qr_scan(
        db=db,
        user=current_user,
        code=payload.code,
        user_lat=payload.user_lat,
        user_lng=payload.user_lng,
    )


@router.post("/create", response_model=QRCodeDetail, summary="Tạo mã QR trạm thu gom / sự kiện mới")
async def create_qr_code(
    payload: QRCodeCreateRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await QRScanService.create_qr_code(
        db=db,
        payload=payload,
        creator=current_user,
    )


@router.get("/list", response_model=QRCodeListResponse, summary="Lấy danh sách mã QR hệ thống")
async def list_qr_codes(
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo mã, tên trạm, địa chỉ"),
    qr_type: Optional[str] = Query(None, description="Loại mã: ALL | RECYCLING_STATION | EVENT | PROMOTION | GENERAL"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await QRScanService.list_qr_codes(
        db=db,
        search=search,
        qr_type=qr_type,
        page=page,
        limit=limit,
    )


@router.get("/info/{code}", response_model=QRCodeDetail, summary="Tra cứu thông tin trạm tái chế theo mã QR")
async def get_qr_info(
    code: str = Path(..., description="Mã QR trạm (VD: ECO-BIN-101)"),
    db: AsyncSession = Depends(get_db),
):
    return await QRScanService.get_qr_info(db, code)

