"""
FastAPI Router cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
- Màn 1/5: Giao diện phát tín hiệu cấp cứu khẩn cấp (Emergency SOS Dispatch)
- Màn 2/5: Popup xác nhận khẩn cấp (GỬI YÊU CẦU CỨU HỘ?)
- Màn 3/5: Giao diện phân bổ cứu hộ Tình nguyện viên & Đội phản ứng nhanh (Community Volunteer Response Dashboard)
- Màn 4/5: Trung tâm theo dõi hành trình cứu nạn (Live Tracking & Stepper & Chat)
- Màn 5/5: Popup xác nhận huỷ yêu cầu SOS (HUỶ YÊU CẦU SOS? & Safeguard < 100m)

Tuân thủ Clean Architecture, Dependency Injection và OCC (Optimistic Concurrency Control).
"""

from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.crud.flood_sos.flood_sos_repository import FloodSosRepository
from app.services.flood_sos.flood_sos_service import FloodSosService
from app.schemas.flood_sos.schemas import (
    CreateFloodSosRequest,
    CreateFloodSosResponse,
    VolunteerSosCardResponse,
    AcceptSosRequest,
    SkipSosRequest,
    SosTrackingDetailResponse,
    UpdateSosProgressRequest,
    SendChatMessageRequest,
    ChatMessageItem,
    CancelSosRequest,
    CancelSosResponse,
    CompleteSosRatingRequest,
)
from app.utils.security import decode_access_token

router = APIRouter(prefix="/flood-sos", tags=["Cứu hộ ngập cộng đồng (Flood SOS - STT 46)"])


def get_flood_sos_service() -> FloodSosService:
    """Dependency Injection cung cấp FloodSosService."""
    repo = FloodSosRepository()
    return FloodSosService(repository=repo)


def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[uuid.UUID]:
    """Trích xuất user_id từ Bearer Token nếu có (hỗ trợ cả khách vãng lai trong trường hợp khẩn cấp)."""
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


@router.post(
    "/dispatch",
    response_model=CreateFloodSosResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Màn 1/5 & 2/5] Phát tín hiệu cấp cứu khẩn cấp SOS ngập lụt",
)
async def dispatch_sos_request(
    payload: CreateFloodSosRequest,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Tiếp nhận yêu cầu cứu hộ từ Màn 1/5 sau khi xác nhận ở Màn 2/5.
    Kiểm tra tính hợp lệ của số người cần cứu, định vị GPS, và phát sóng tới các đội cứu nạn trong bán kính 3km.
    """
    return await service.dispatch_sos(db=db, req=payload)


@router.get(
    "/nearby",
    response_model=List[VolunteerSosCardResponse],
    summary="[Màn 3/5] Danh sách yêu cầu SOS gần vị trí tình nguyện viên (Bán kính 3km)",
)
async def get_nearby_sos_requests(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Vĩ độ hiện tại của tình nguyện viên"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Kinh độ hiện tại của tình nguyện viên"),
    radius_km: float = Query(3.0, gt=0, le=50.0, description="Bán kính quét (mặc định 3km)"),
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Lấy danh sách các thẻ cứu hộ SOS gần tình nguyện viên.
    Tính toán khoảng cách chính xác theo Haversine, độ sâu nước ngập và mức độ nguy hiểm.
    """
    return await service.get_nearby_sos_for_volunteer(
        db=db,
        lat=latitude,
        lng=longitude,
        radius_km=radius_km,
    )


@router.post(
    "/{request_id}/accept",
    response_model=SosTrackingDetailResponse,
    summary="[Màn 3/5] Tình nguyện viên tiếp nhận ca cứu hộ (Khóa quyền với OCC)",
)
async def accept_sos_request(
    request_id: uuid.UUID,
    payload: AcceptSosRequest,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Xác nhận tiếp nhận ca cứu hộ.
    Nếu ca đã được tình nguyện viên khác nhận trước hoặc phiên bản version bị lệch,
    hệ thống lập tức trả về HTTP 409 Conflict với thông báo chuẩn quy định.
    """
    return await service.accept_sos(db=db, request_id=request_id, req=payload)


@router.post(
    "/{request_id}/skip",
    status_code=status.HTTP_200_OK,
    summary="[Màn 3/5] Tình nguyện viên bỏ qua yêu cầu cứu hộ",
)
async def skip_sos_request(
    request_id: uuid.UUID,
    payload: SkipSosRequest,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Bỏ qua yêu cầu cứu hộ để nhường quyền cho các tình nguyện viên khác trong khu vực.
    """
    return await service.skip_sos(db=db, request_id=request_id, req=payload)


@router.get(
    "/{request_id}/tracking",
    response_model=SosTrackingDetailResponse,
    summary="[Màn 4/5] Theo dõi tiến trình cứu nạn trực tiếp (Live Tracking & Stepper)",
)
async def get_sos_tracking_detail(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Lấy thông tin tiến trình cứu nạn thời gian thực:
    - Stepper 4 bước (Đã gửi -> Đã nhận -> Đang đến -> Hoàn tất)
    - Thông tin người cứu hộ, cự ly và ước tính thời gian (ETA)
    - Tọa độ GPS live tracking trên bản đồ
    - Lịch sử chat trao đổi nhận diện
    """
    return await service.get_sos_tracking(db=db, request_id=request_id)


@router.post(
    "/{request_id}/progress",
    response_model=SosTrackingDetailResponse,
    summary="[Màn 4/5] Cập nhật tiến độ & vị trí GPS của người cứu hộ",
)
async def update_sos_progress(
    request_id: uuid.UUID,
    payload: UpdateSosProgressRequest,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Cập nhật trạng thái tiến trình (EN_ROUTE, COMPLETED)
    và tọa độ di chuyển thời gian thực của đội cứu hộ.
    """
    return await service.update_sos_progress(db=db, request_id=request_id, req=payload)


@router.post(
    "/{request_id}/chat",
    response_model=ChatMessageItem,
    status_code=status.HTTP_201_CREATED,
    summary="[Màn 4/5] Gửi tin nhắn trao đổi nhận diện khẩn cấp",
)
async def send_sos_chat_message(
    request_id: uuid.UUID,
    payload: SendChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Gửi tin nhắn ngắn trong ca cứu hộ (VD: "Tôi đang mặc áo mưa vàng trên mái nhà").
    """
    return await service.send_chat_message(db=db, request_id=request_id, req=payload)


@router.post(
    "/{request_id}/cancel",
    response_model=CancelSosResponse,
    summary="[Màn 5/5] Huỷ yêu cầu cứu hộ SOS (Kèm kiểm tra khoảng cách < 100m)",
)
async def cancel_sos_request(
    request_id: uuid.UUID,
    payload: CancelSosRequest,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Huỷ yêu cầu cứu nạn khi nạn nhân đã an toàn hoặc tự di chuyển.
    Nếu đội cứu hộ đã đến sát vị trí (< 100m), hệ thống cảnh báo xác nhận lần 2
    nhằm bảo đảm an toàn trước khi dừng ca trực.
    """
    return await service.cancel_sos(db=db, request_id=request_id, req=payload)


@router.post(
    "/{request_id}/rating",
    summary="[Màn 4/5] Đánh giá chất lượng hỗ trợ sau khi ca cứu hộ hoàn tất",
)
async def submit_sos_rating(
    request_id: uuid.UUID,
    payload: CompleteSosRatingRequest,
    db: AsyncSession = Depends(get_db),
    service: FloodSosService = Depends(get_flood_sos_service),
):
    """
    Lưu số sao đánh giá (1-5 sao) và nhận xét hỗ trợ của nạn nhân sau khi an toàn.
    """
    return await service.submit_rating(db=db, request_id=request_id, req=payload)
