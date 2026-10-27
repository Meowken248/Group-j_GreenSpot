"""
Business Logic Service Layer cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
Tuân thủ Clean Architecture: Phụ thuộc vào IFloodSosRepository trừu tượng (DIP).
Xử lý toàn bộ logic nghiệp vụ, tính toán cự ly, bước tiến trình, OCC và kiểm tra an toàn.
"""

from datetime import datetime, timezone
import math
from typing import List, Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.flood_sos.flood_sos_interface import IFloodSosRepository
from app.crud.flood_sos.flood_sos_repository import FloodSosRepository, haversine_distance_meters
from app.models.flood_sos.sos_request import FloodSosRequest, FloodSosChatMessage
from app.models.rbac import User
from app.schemas.flood_sos.schemas import (
    CreateFloodSosRequest,
    CreateFloodSosResponse,
    VolunteerSosCardResponse,
    AcceptSosRequest,
    SkipSosRequest,
    ChatMessageItem,
    SendChatMessageRequest,
    UpdateSosProgressRequest,
    SosTrackingDetailResponse,
    CompleteSosRatingRequest,
    CancelSosRequest,
    CancelSosResponse,
)


class FloodSosService:
    """
    Dịch vụ điều phối cứu hộ ngập lụt khẩn cấp (Emergency SOS Dispatch Service)
    """

    def __init__(self, repository: Optional[IFloodSosRepository] = None):
        self.repo: IFloodSosRepository = repository or FloodSosRepository()

    def generate_sos_code(self) -> str:
        """Sinh mã cấp cứu SOS chuẩn ISO: SOS-YYYYMMDD-XXXX"""
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        rand_suffix = uuid.uuid4().hex[:4].upper()
        return f"SOS-{now_str}-{rand_suffix}"

    def format_distance(self, distance_meters: float) -> str:
        """Định dạng cự ly hiển thị người dùng (VD: Cách bạn 650m hoặc Cách bạn 1.8km)"""
        if distance_meters < 1000:
            return f"Cách bạn {int(round(distance_meters))}m"
        return f"Cách bạn {distance_meters / 1000.0:.1f}km"

    def calculate_eta_minutes(self, distance_meters: float, avg_speed_kmh: float = 15.0) -> int:
        """Tính thời gian tiếp cận dự kiến (ETA) theo vận tốc trung bình của ca nô/xuồng máy"""
        speed_mps = (avg_speed_kmh * 1000.0) / 3600.0  # ~4.16 m/s
        seconds = distance_meters / max(speed_mps, 1.0)
        minutes = int(math.ceil(seconds / 60.0))
        return max(minutes, 1)

    def determine_status_step(self, status: str) -> int:
        """Ánh xạ trạng thái sang chỉ số bước Stepper (1: Đã gửi, 2: Đã nhận, 3: Đang đến, 4: Hoàn tất)"""
        mapping = {
            "PENDING": 1,
            "ACCEPTED": 2,
            "EN_ROUTE": 3,
            "COMPLETED": 4,
            "CANCELLED": 0,
        }
        return mapping.get(status, 1)

    async def dispatch_sos(
        self,
        db: AsyncSession,
        req: CreateFloodSosRequest,
        current_user: Optional[User] = None,
    ) -> CreateFloodSosResponse:
        """
        Nghiệp vụ Màn 1/5 và 2/5: Tiếp nhận và phát sóng tín hiệu cứu hộ SOS
        """
        if req.total_victims < 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vui lòng nhập ước tính số người cần cứu hộ (tối thiểu 1 người).",
            )

        sos_code = self.generate_sos_code()
        victim_id = current_user.user_id if current_user else None
        victim_name = req.victim_name or (current_user.full_name if current_user else "Người dân gặp nạn")
        victim_phone = req.victim_phone or (current_user.phone_number if current_user and getattr(current_user, "phone_number", None) else "112")

        # Đếm số tình nguyện viên trong bán kính 3km
        nearby_vol_count = await self.repo.count_nearby_volunteers(
            db, lat=req.latitude, lng=req.longitude, radius_km=3.0
        )

        sos = await self.repo.create_sos_request(
            db=db,
            sos_code=sos_code,
            victim_id=victim_id,
            victim_name=victim_name,
            victim_phone=victim_phone,
            total_victims=req.total_victims,
            elderly_count=req.elderly_count,
            children_count=req.children_count,
            medical_urgent_count=req.medical_urgent_count,
            description=req.description,
            image_url=req.image_url,
            latitude=req.latitude,
            longitude=req.longitude,
            address_text=req.address_text,
            district=req.district,
            ward=req.ward,
            severity_level=req.severity_level,
            flood_depth_meters=req.flood_depth_meters,
        )

        # Thêm tin nhắn khởi tạo hệ thống
        await self.repo.add_chat_message(
            db=db,
            request_id=sos.request_id,
            sender_id=None,
            sender_type="SYSTEM",
            sender_name="Hệ thống Cứu nạn GreenSpot",
            content=f"Đã phát tín hiệu cứu hộ SOS ({sos.sos_code}) tới mạng lưới tình nguyện viên và ca nô trong bán kính 3km.",
        )

        return CreateFloodSosResponse(
            success=True,
            request_id=sos.request_id,
            sos_code=sos.sos_code,
            status=sos.status,
            message="Đã phát tín hiệu cứu hộ SOS! Đang quét tình nguyện viên và đội cơ động gần nhất...",
            estimated_nearby_volunteers=nearby_vol_count,
            broadcast_radius_km=3.0,
        )

    async def get_nearby_sos_for_volunteer(
        self,
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 3.0,
    ) -> List[VolunteerSosCardResponse]:
        """
        Nghiệp vụ Màn 3/5: Bảng điều khiển Tình nguyện viên
        Lấy các ca cứu hộ PENDING trong bán kính 3km, sắp xếp theo khoảng cách.
        """
        items = await self.repo.get_nearby_sos_requests(db, lat=lat, lng=lng, radius_km=radius_km)
        results: List[VolunteerSosCardResponse] = []

        for req, dist in items:
            results.append(
                VolunteerSosCardResponse(
                    request_id=req.request_id,
                    sos_code=req.sos_code,
                    victim_name=req.victim_name,
                    victim_phone=req.victim_phone,
                    total_victims=req.total_victims,
                    elderly_count=req.elderly_count,
                    children_count=req.children_count,
                    medical_urgent_count=req.medical_urgent_count,
                    description=req.description,
                    image_url=req.image_url,
                    latitude=req.latitude,
                    longitude=req.longitude,
                    address_text=req.address_text,
                    district=req.district,
                    severity_level=req.severity_level,
                    flood_depth_meters=req.flood_depth_meters,
                    distance_meters=dist,
                    distance_text=self.format_distance(dist),
                    status=req.status,
                    created_at=req.created_at,
                    version=req.version,
                )
            )

        return results

    async def accept_sos(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        req: AcceptSosRequest,
        current_user: Optional[User] = None,
    ) -> SosTrackingDetailResponse:
        """
        Nghiệp vụ Màn 3/5: Tình nguyện viên xác nhận Nhận yêu cầu cứu hộ
        Kiểm tra khóa quyền và OCC version để ngăn chặn trùng nhận.
        """
        sos = await self.repo.get_sos_by_id(db, request_id)
        if not sos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ca cứu hộ không tồn tại hoặc đã kết thúc.",
            )

        dist = haversine_distance_meters(req.volunteer_latitude, req.volunteer_longitude, sos.latitude, sos.longitude)
        eta = self.calculate_eta_minutes(dist)

        rescuer_name = current_user.full_name if current_user else "Tình nguyện viên cơ sở"
        rescuer_phone = getattr(current_user, "phone_number", None) or "0908123456"
        vol_id = current_user.user_id if current_user else None

        success, updated_sos, error_msg = await self.repo.accept_sos_request(
            db=db,
            request_id=request_id,
            volunteer_id=vol_id,
            volunteer_name=rescuer_name,
            volunteer_phone=rescuer_phone,
            team_name=req.team_name or "Đội Phản ứng nhanh cơ sở",
            vehicle_type=req.vehicle_type or "Xuồng máy cứu nạn",
            vol_lat=req.volunteer_latitude,
            vol_lng=req.volunteer_longitude,
            distance_meters=round(dist, 1),
            eta_minutes=eta,
            expected_version=req.version,
        )

        if not success or not updated_sos:
            # Lỗi tương tranh OCC hoặc đã có người nhận trước (HTTP 409 Conflict)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg or "Yêu cầu cứu hộ này đã được một tình nguyện viên khác tiếp nhận.",
            )

        # Gửi tin nhắn thông báo vào phòng chat
        await self.repo.add_chat_message(
            db=db,
            request_id=request_id,
            sender_id=vol_id,
            sender_type="RESCUER",
            sender_name=rescuer_name,
            content=f"Chào bạn, tôi là {rescuer_name} thuộc {req.team_name or 'Đội cứu hộ'}. Tôi đã tiếp nhận ca cứu hộ và đang chuẩn bị phương tiện xuất phát!",
        )

        return await self.get_sos_tracking(db, request_id)

    async def skip_sos(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        req: SkipSosRequest,
    ) -> dict:
        """Nghiệp vụ Màn 3/5: Tình nguyện viên bỏ qua yêu cầu"""
        sos = await self.repo.get_sos_by_id(db, request_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ca cứu hộ không tồn tại.")

        return {
            "success": True,
            "message": "Đã bỏ qua yêu cầu. Hệ thống đang chuyển tiếp thông tin tới tình nguyện viên khác.",
        }

    async def get_sos_tracking(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> SosTrackingDetailResponse:
        """
        Nghiệp vụ Màn 4/5: Truy vấn chi tiết theo dõi hành trình cho nạn nhân và đội cứu hộ
        """
        sos = await self.repo.get_sos_by_id(db, request_id)
        if not sos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin ca cứu hộ yêu cầu.",
            )

        messages_raw = await self.repo.get_chat_messages(db, request_id)
        messages_dto = [
            ChatMessageItem(
                message_id=m.message_id,
                sender_type=m.sender_type,
                sender_name=m.sender_name,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages_raw
        ]

        dist_display = None
        if sos.rescuer_distance_meters is not None:
            dist_display = self.format_distance(sos.rescuer_distance_meters)
            if sos.rescuer_eta_minutes:
                dist_display += f" - Ước tính {sos.rescuer_eta_minutes} phút"

        return SosTrackingDetailResponse(
            request_id=sos.request_id,
            sos_code=sos.sos_code,
            status=sos.status,
            status_step=self.determine_status_step(sos.status),
            victim_name=sos.victim_name,
            victim_phone=sos.victim_phone,
            total_victims=sos.total_victims,
            elderly_count=sos.elderly_count,
            children_count=sos.children_count,
            medical_urgent_count=sos.medical_urgent_count,
            description=sos.description,
            image_url=sos.image_url,
            latitude=sos.latitude,
            longitude=sos.longitude,
            address_text=sos.address_text,
            assigned_rescuer_name=sos.assigned_rescuer_name,
            assigned_rescuer_phone=sos.assigned_rescuer_phone,
            assigned_team_name=sos.assigned_team_name,
            assigned_vehicle_type=sos.assigned_vehicle_type,
            rescuer_latitude=sos.rescuer_latitude,
            rescuer_longitude=sos.rescuer_longitude,
            rescuer_distance_meters=sos.rescuer_distance_meters,
            rescuer_eta_minutes=sos.rescuer_eta_minutes,
            distance_display=dist_display,
            messages=messages_dto,
            rating=sos.rating,
            feedback_notes=sos.feedback_notes,
            cancel_reason=sos.cancel_reason,
            cancelled_at=sos.cancelled_at,
            created_at=sos.created_at,
            updated_at=sos.updated_at,
            version=sos.version,
        )

    async def update_sos_progress(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        req: UpdateSosProgressRequest,
        current_user: Optional[User] = None,
    ) -> SosTrackingDetailResponse:
        """
        Nghiệp vụ Màn 4/5: Cập nhật vị trí di chuyển và trạng thái tiến độ (Đang đến / Hoàn tất)
        """
        sos = await self.repo.get_sos_by_id(db, request_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ca cứu hộ không tồn tại.")

        dist = haversine_distance_meters(req.rescuer_latitude, req.rescuer_longitude, sos.latitude, sos.longitude)
        eta = self.calculate_eta_minutes(dist)

        success, updated_sos, err = await self.repo.update_sos_progress(
            db=db,
            request_id=request_id,
            status=req.status,
            rescuer_lat=req.rescuer_latitude,
            rescuer_lng=req.rescuer_longitude,
            distance_meters=round(dist, 1),
            eta_minutes=eta,
            expected_version=req.version,
        )

        if not success or not updated_sos:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=err or "Xung đột dữ liệu khi cập nhật tiến trình cứu hộ.",
            )

        # Thông báo trạng thái qua tin nhắn hệ thống nếu hoàn tất
        if req.status == "COMPLETED":
            await self.repo.add_chat_message(
                db=db,
                request_id=request_id,
                sender_id=None,
                sender_type="SYSTEM",
                sender_name="Hệ thống Cứu nạn GreenSpot",
                content="Ca cứu hộ đã hoàn tất thành công. Nạn nhân đã an toàn!",
            )

        return await self.get_sos_tracking(db, request_id)

    async def send_chat_message(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        req: SendChatMessageRequest,
        current_user: Optional[User] = None,
    ) -> ChatMessageItem:
        """Nghiệp vụ Màn 4/5: Gửi tin nhắn trao đổi khẩn cấp"""
        sos = await self.repo.get_sos_by_id(db, request_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ca cứu hộ không tồn tại.")

        sender_id = current_user.user_id if current_user else None
        msg = await self.repo.add_chat_message(
            db=db,
            request_id=request_id,
            sender_id=sender_id,
            sender_type=req.sender_type,
            sender_name=req.sender_name,
            content=req.content,
        )

        return ChatMessageItem(
            message_id=msg.message_id,
            sender_type=msg.sender_type,
            sender_name=msg.sender_name,
            content=msg.content,
            created_at=msg.created_at,
        )

    async def cancel_sos(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        req: CancelSosRequest,
    ) -> CancelSosResponse:
        """
        Nghiệp vụ Màn 5/5: Nạn nhân bấm Huỷ yêu cầu SOS
        Cảnh báo khi người cứu hộ đã đến rất gần (< 100m).
        """
        sos = await self.repo.get_sos_by_id(db, request_id)
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ca cứu hộ không tồn tại.")

        # Kiểm tra khoảng cách người cứu hộ
        if (
            sos.status in ["ACCEPTED", "EN_ROUTE"]
            and sos.rescuer_distance_meters is not None
            and sos.rescuer_distance_meters < 100.0
            and not req.is_confirmed_near
        ):
            return CancelSosResponse(
                success=False,
                requires_near_confirmation=True,
                warning_message="Cảnh báo: Người cứu hộ đã đến rất gần vị trí của bạn (< 100m). Bạn có chắc chắn muốn huỷ?",
                message="Yêu cầu xác nhận bổ sung do người cứu hộ đã ở sát vị trí.",
            )

        success, updated_sos, err = await self.repo.cancel_sos_request(
            db=db,
            request_id=request_id,
            cancel_reason=req.cancel_reason or "Nước đã rút / Đã tự di chuyển an toàn",
            expected_version=req.version,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=err or "Huỷ yêu cầu thất bại do xung đột dữ liệu.",
            )

        # Thông báo vào tin nhắn
        await self.repo.add_chat_message(
            db=db,
            request_id=request_id,
            sender_id=None,
            sender_type="SYSTEM",
            sender_name="Hệ thống Cứu nạn GreenSpot",
            content=f"Yêu cầu cứu hộ đã được huỷ. Lý do: {req.cancel_reason or 'Người dân đã an toàn'}.",
        )

        return CancelSosResponse(
            success=True,
            requires_near_confirmation=False,
            warning_message=None,
            message="Đã huỷ yêu cầu cứu hộ thành công. Hệ thống đã thông báo cho người cứu hộ.",
        )

    async def submit_rating(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        req: CompleteSosRatingRequest,
    ) -> dict:
        """Nghiệp vụ Màn 4/5: Gửi đánh giá hỗ trợ sau khi hoàn tất"""
        sos = await self.repo.complete_sos_rating(
            db=db,
            request_id=request_id,
            rating=req.rating,
            feedback_notes=req.feedback_notes,
        )
        if not sos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ca cứu hộ không tồn tại.")

        return {
            "success": True,
            "message": "Cảm ơn bạn đã đánh giá chất lượng cứu hộ!",
            "rating": req.rating,
        }
