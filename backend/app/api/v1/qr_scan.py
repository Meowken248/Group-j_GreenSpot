"""
GreenSpot API Router - Quét mã QR nhận điểm thưởng (Chức năng 34)
Endpoints:
- POST /api/v1/gamification/qr/scan
- GET  /api/v1/gamification/qr/info/{code}
"""

from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.services.qr_scan_service import QRScanService
from app.schemas.qr_scan import QRScanRequest, QRScanResponse, QRCodeDetail

router = APIRouter(prefix="/gamification/qr", tags=["Quét mã QR nhận điểm thưởng (34)"])

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

@router.get("/info/{code}", response_model=QRCodeDetail, summary="Tra cứu thông tin trạm tái chế theo mã QR")
async def get_qr_info(
    code: str = Path(..., description="Mã QR trạm (VD: ECO-BIN-101)"),
    db: AsyncSession = Depends(get_db),
):
    return await QRScanService.get_qr_info(db, code)
