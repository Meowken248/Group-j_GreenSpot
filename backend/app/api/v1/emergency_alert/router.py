"""
FastAPI Router cho STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
(Màn 1/4: Broadcast Console, Màn 2/4: Alert Modal, Màn 3/4: Safety Check, Màn 4/4: Result Modal)
Tuân thủ Clean Architecture, Dependency Injection qua FastAPI Depends và phân quyền RBAC.
"""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.crud.emergency_alert.alert_repository import (
    EmergencyAlertRepository,
    SafetyCheckRepository,
)
from app.services.emergency_alert.alert_service import EmergencyAlertService
from app.schemas.emergency_alert.schemas import (
    AlertEstimateRequest,
    AlertEstimateResponse,
    BroadcastAlertRequest,
    BroadcastAlertResponse,
    BroadcastHistoryItem,
    CancelAlertRequest,
    UserActiveAlertResponse,
    EmergencySOSRequest,
    EmergencySOSResponse,
    SafetyCheckInitResponse,
    MarkSafeSelfRequest,
    MarkSafeSelfResponse,
    SendSafetyCheckToFriendsRequest,
    SendSafetyCheckToFriendsResponse,
    UserLocationPingRequest,
)
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.utils.security import decode_access_token

router = APIRouter(prefix="/emergency-alerts", tags=["Cảnh báo khẩn cấp & Safety Check (STT 45)"])


def get_emergency_service() -> EmergencyAlertService:
    """Dependency Injection cung cấp instance EmergencyAlertService"""
    alert_repo = EmergencyAlertRepository()
    safety_repo = SafetyCheckRepository()
    return EmergencyAlertService(alert_repo, safety_repo)


def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[uuid.UUID]:
    """Trích xuất user_id từ Bearer Token nếu có (hỗ trợ cả người dùng vãng lai và đã đăng nhập)"""
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            payload = decode_access_token(parts[1])
            if payload and "sub" in payload:
                return uuid.UUID(payload["sub"])
    except Exception:
        pass
    return None


def verify_broadcast_authority(authorization: Optional[str] = Header(None)) -> Optional[uuid.UUID]:
    """Kiểm tra phân quyền: Chỉ Quản trị viên và Cán bộ Ban chỉ huy mới có quyền phát lệnh khẩn cấp"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu đăng nhập để truy cập chức năng này",
        )
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")
        payload = decode_access_token(parts[1])
        if not payload:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ hoặc đã hết hạn")
        role = payload.get("role")
        permissions = payload.get("permissions", [])

        allowed_roles = {"ADMIN", "OFFICER", "COORDINATOR", "DISTRICT_MANAGER"}
        has_perm = "INCIDENTS" in permissions or "STATISTICS" in permissions

        if role not in allowed_roles and not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Cán bộ quản trị và Ban Chỉ huy PCTT mới có quyền phát sóng cảnh báo khẩn cấp",
            )
        return uuid.UUID(payload["sub"])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token xác thực không hợp lệ")


# =========================================================================
# 1. ENDPOINTS CHO MÀN 1/4: EMERGENCY BROADCAST CONSOLE
# =========================================================================

@router.post(
    "/estimate-recipients",
    response_model=AlertEstimateResponse,
    summary="Ước tính số người nhận trong bán kính ghim bản đồ (Màn 1/4)",
)
async def estimate_recipients(
    payload: AlertEstimateRequest,
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
):
    """Tính toán thời gian thực số lượng thiết bị công dân nằm trong bán kính tâm ghim"""
    return await service.estimate_recipients(db, payload)


@router.post(
    "/broadcast",
    response_model=BroadcastAlertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Phát lệnh cảnh báo thiên tai khẩn cấp diện rộng (Màn 1/4)",
)
async def broadcast_alert(
    payload: BroadcastAlertRequest,
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    creator_id: Optional[uuid.UUID] = Depends(verify_broadcast_authority),
):
    """Phát lệnh khẩn cấp tới toàn bộ thiết bị trong phạm vi Geofencing"""
    return await service.broadcast_alert(db, payload, creator_id=creator_id)


@router.get(
    "/history",
    response_model=List[BroadcastHistoryItem],
    summary="Lấy lịch sử các lệnh phát sóng cảnh báo khẩn cấp (Màn 1/4)",
)
async def get_broadcast_history(
    limit: int = Query(20, ge=1, le=100),
    alert_type: Optional[str] = Query(None, description="Lọc theo loại: FLOOD, STORM, TIDE, POLLUTION"),
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    _user_id: Optional[uuid.UUID] = Depends(verify_broadcast_authority),
):
    """Xem danh sách các lệnh cảnh báo đã phát trong quá khứ"""
    return await service.get_broadcast_history(db, limit=limit, alert_type=alert_type)


@router.post(
    "/{alert_id}/cancel",
    summary="Hủy phát sóng lệnh cảnh báo khẩn cấp với Optimistic Locking (Màn 1/4)",
)
async def cancel_alert(
    alert_id: uuid.UUID,
    payload: CancelAlertRequest,
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    _user_id: Optional[uuid.UUID] = Depends(verify_broadcast_authority),
):
    """Hủy cảnh báo với kiểm tra xung đột phiên bản version"""
    return await service.cancel_alert(db, alert_id=alert_id, req=payload)


# =========================================================================
# 2. ENDPOINTS CHO MÀN 2/4: EMERGENCY ALERT MODAL (USER VIEW)
# =========================================================================

@router.get(
    "/active-for-user",
    response_model=UserActiveAlertResponse,
    summary="Kiểm tra cảnh báo khẩn cấp bao phủ vị trí người dùng (Màn 2/4)",
)
async def get_active_alert_for_user(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Vĩ độ hiện tại"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Kinh độ hiện tại"),
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    user_id: Optional[uuid.UUID] = Depends(get_optional_user_id),
):
    """Trả về dữ liệu Popup khẩn cấp khi người dùng đi vào vùng thiên tai"""
    return await service.get_active_alert_for_user(db, user_id=user_id, lat=lat, lng=lng)


@router.post(
    "/sos",
    response_model=EmergencySOSResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Gửi tín hiệu cứu nạn khẩn cấp SOS từ Modal (Màn 2/4)",
)
async def trigger_emergency_sos(
    payload: EmergencySOSRequest,
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    current_user: User = Depends(get_current_active_user),
):
    """Tiếp nhận yêu cầu SOS và chuyển tiếp tới Ban Chỉ huy Cứu nạn 114/115"""
    return await service.trigger_emergency_sos(db, user_id=current_user.user_id, req=payload)


@router.post(
    "/{alert_id}/acknowledge",
    summary="Ghi nhận phản hồi hành động của người dùng trên Modal cảnh báo (Màn 2/4)",
)
async def acknowledge_alert_action(
    alert_id: uuid.UUID,
    action_taken: str = Query(..., description="SAFE, SOS, VIEW_DETAILS"),
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    current_user: User = Depends(get_current_active_user),
):
    """Ghi nhận hành động bấm 'Tôi an toàn', 'Cần giúp đỡ', 'Xem chi tiết'"""
    return await service.acknowledge_alert_action(
        db=db, alert_id=alert_id, user_id=current_user.user_id, action_taken=action_taken
    )


# =========================================================================
# 3. ENDPOINTS CHO MÀN 3/4 & 4/4: COMMUNITY SAFETY CHECK
# =========================================================================

@router.get(
    "/safety-check/init",
    response_model=SafetyCheckInitResponse,
    summary="Tải dữ liệu màn hình Safety Check: vị trí GPS và danh sách bạn bè (Màn 3/4)",
)
async def init_safety_check(
    lat: Optional[float] = Query(None, description="Vĩ độ hiện tại"),
    lng: Optional[float] = Query(None, description="Kinh độ hiện tại"),
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy tọa độ GPS xác thực và danh sách bạn bè kết nối để chuẩn bị báo an toàn"""
    return await service.init_safety_check(db, user_id=current_user.user_id, lat=lat, lng=lng)


@router.post(
    "/safety-check/mark-safe",
    response_model=MarkSafeSelfResponse,
    summary="Công dân bấm 'Tôi an toàn' tại hồ sơ / Màn 3/4",
)
async def mark_safe_self(
    payload: MarkSafeSelfRequest,
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    current_user: User = Depends(get_current_active_user),
):
    """Cập nhật huy hiệu an toàn lên hồ sơ cá nhân và Geo-Feed"""
    return await service.mark_safe_self(db, user_id=current_user.user_id, req=payload)


@router.post(
    "/safety-check/send-to-friends",
    response_model=SendSafetyCheckToFriendsResponse,
    summary="Gửi thông báo an toàn đến danh sách bạn bè đã chọn (Màn 3/4 -> 4/4)",
)
async def send_safety_check_to_friends(
    payload: SendSafetyCheckToFriendsRequest,
    db: AsyncSession = Depends(get_db),
    service: EmergencyAlertService = Depends(get_emergency_service),
    current_user: User = Depends(get_current_active_user),
):
    """Phát thông báo an toàn cho bạn bè và mở Modal xác nhận Màn 4/4"""
    return await service.send_safety_check_to_friends(
        db, user_id=current_user.user_id, req=payload
    )


# =========================================================================
# 4. HỖ TRỢ BACKGROUND DEVICE LOCATION PING
# =========================================================================

@router.post(
    "/location/ping",
    summary="Cập nhật tọa độ GPS thiết bị người dùng (Background Ping)",
)
async def ping_device_location(
    payload: UserLocationPingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lưu trữ tọa độ GPS thiết bị người dùng phục vụ phát sóng cảnh báo khẩn cấp chính xác"""
    repo = EmergencyAlertRepository()
    loc = await repo.upsert_user_device_location(
        db=db,
        user_id=current_user.user_id,
        lat=payload.latitude,
        lng=payload.longitude,
        address_text=payload.address_text,
        district=payload.district,
        ward=payload.ward,
    )
    return {
        "success": True,
        "message": "Đã cập nhật vị trí thiết bị",
        "latitude": loc.latitude,
        "longitude": loc.longitude,
    }
