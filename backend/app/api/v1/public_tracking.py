from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.alert_notification import (
    PublicIncidentDetailResponse,
    PublicSubscribeRequest,
    PublicVerificationRequest,
)
from app.services.public_tracking_service import PublicTrackingService

router = APIRouter(prefix="/public/tracking", tags=["Chức năng 30: Cổng Tra cứu Công khai Tiến độ & Minh bạch Hồ sơ"])


@router.get("/{tracking_code}", response_model=PublicIncidentDetailResponse)
async def track_incident_publicly(
    tracking_code: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Tra cứu công khai hồ sơ tiến độ xử lý sự cố môi trường không cần đăng nhập.
    Bao gồm Timeline Stepper, ảnh đối chứng Before/After và phản hồi của chính quyền.
    """
    return await PublicTrackingService.track_incident(db, tracking_code)


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_incident_updates(
    req: PublicSubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Đăng ký nhận thông báo cập nhật tiến độ sự cố qua Email hoặc Số điện thoại.
    """
    sub = await PublicTrackingService.subscribe_incident(db, req)
    return {
        "status": "success",
        "message": f"Đã đăng ký nhận tin thành công cho hồ sơ sự cố {req.tracking_code}",
        "subscription_id": sub.subscription_id,
    }


@router.post("/verify", status_code=status.HTTP_201_CREATED)
async def verify_incident_cleanliness(
    req: PublicVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Cộng đồng kiểm chứng hiện trường sau khi dọn sạch (Citizen Double-Check).
    Người dân tại hiện trường xác nhận điểm rác đã sạch hay vẫn còn bẩn.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    verif = await PublicTrackingService.verify_incident(db, req, client_ip=client_ip)
    return {
        "status": "success",
        "message": "Cảm ơn bạn đã gửi ý kiến kiểm chứng hiện trường vì cộng đồng xanh",
        "verification_id": verif.verification_id,
    }
