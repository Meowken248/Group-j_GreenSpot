"""
Data Access / Persistence Layer cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
Triển khai toàn bộ câu truy vấn CSDL 100% Explicit SQL (PostGIS / Haversine, Soft Delete, OCC).
"""

from datetime import datetime, timezone
import math
from typing import Any, List, Optional, Tuple
import uuid
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.flood_sos.flood_sos_interface import IFloodSosRepository
from app.models.flood_sos.sos_request import FloodSosRequest, VolunteerProfile, FloodSosChatMessage


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách đường tròn lớn giữa 2 toạ độ GPS (đơn vị: mét)"""
    r = 6371000.0  # Bán kính Trái Đất (mét)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class FloodSosRepository(IFloodSosRepository):
    """
    Triển khai các truy vấn SQL tường minh cho Flood SOS
    """

    async def create_sos_request(
        self,
        db: AsyncSession,
        sos_code: str,
        victim_id: Optional[uuid.UUID],
        victim_name: str,
        victim_phone: str,
        total_victims: int,
        elderly_count: int,
        children_count: int,
        medical_urgent_count: int,
        description: str,
        image_url: Optional[str],
        latitude: float,
        longitude: float,
        address_text: str,
        district: Optional[str],
        ward: Optional[str],
        severity_level: str,
        flood_depth_meters: Optional[float],
    ) -> FloodSosRequest:
        """Tạo mới một yêu cầu cấp cứu khẩn cấp (Màn 1/5 và 2/5)"""
        req_id = uuid.uuid4()
        location_wkt = f"SRID=4326;POINT({longitude} {latitude})"

        sos_req = FloodSosRequest(
            request_id=req_id,
            sos_code=sos_code,
            victim_id=victim_id,
            victim_name=victim_name,
            victim_phone=victim_phone,
            total_victims=total_victims,
            elderly_count=elderly_count,
            children_count=children_count,
            medical_urgent_count=medical_urgent_count,
            description=description,
            image_url=image_url,
            latitude=latitude,
            longitude=longitude,
            location=location_wkt,
            address_text=address_text,
            district=district,
            ward=ward,
            severity_level=severity_level,
            flood_depth_meters=flood_depth_meters,
            status="PENDING",
            version=1,
        )
        db.add(sos_req)
        await db.commit()
        await db.refresh(sos_req)
        return sos_req

    async def get_sos_by_id(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> Optional[FloodSosRequest]:
        """Truy vấn ca cứu hộ theo ID bằng SQL tường minh (loại trừ soft delete)"""
        stmt = (
            select(FloodSosRequest)
            .where(
                FloodSosRequest.request_id == request_id,
                FloodSosRequest.deleted_at.is_(None)
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_sos_by_code(
        self,
        db: AsyncSession,
        sos_code: str,
    ) -> Optional[FloodSosRequest]:
        """Truy vấn ca cứu hộ theo mã SOS"""
        stmt = (
            select(FloodSosRequest)
            .where(
                FloodSosRequest.sos_code == sos_code,
                FloodSosRequest.deleted_at.is_(None)
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_nearby_sos_requests(
        self,
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 3.0,
    ) -> List[Tuple[FloodSosRequest, float]]:
        """
        Truy vấn danh sách ca cứu hộ PENDING trong bán kính radius_km (mặc định 3km).
        Tính cự ly di chuyển chính xác và sắp xếp theo khoảng cách gần nhất trước.
        """
        radius_meters = radius_km * 1000.0

        # Lấy các ca đang PENDING chưa bị xoá mềm
        stmt = (
            select(FloodSosRequest)
            .where(
                FloodSosRequest.status == "PENDING",
                FloodSosRequest.deleted_at.is_(None)
            )
            .order_by(FloodSosRequest.created_at.desc())
        )
        res = await db.execute(stmt)
        all_pending = res.scalars().all()

        nearby_list: List[Tuple[FloodSosRequest, float]] = []
        for req in all_pending:
            dist = haversine_distance_meters(lat, lng, req.latitude, req.longitude)
            if dist <= radius_meters:
                nearby_list.append((req, round(dist, 1)))

        # Sắp xếp theo khoảng cách tăng dần
        nearby_list.sort(key=lambda item: item[1])
        return nearby_list

    async def count_nearby_volunteers(
        self,
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 3.0,
    ) -> int:
        """Đếm số lượng tình nguyện viên đang sẵn sàng trong bán kính 3km"""
        radius_meters = radius_km * 1000.0
        stmt = (
            select(VolunteerProfile)
            .where(
                VolunteerProfile.is_available.is_(True),
                VolunteerProfile.deleted_at.is_(None)
            )
        )
        res = await db.execute(stmt)
        all_vols = res.scalars().all()

        count = 0
        for vol in all_vols:
            dist = haversine_distance_meters(lat, lng, vol.current_latitude, vol.current_longitude)
            if dist <= radius_meters:
                count += 1
        return count

    async def accept_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        volunteer_id: Optional[uuid.UUID],
        volunteer_name: str,
        volunteer_phone: str,
        team_name: Optional[str],
        vehicle_type: Optional[str],
        vol_lat: float,
        vol_lng: float,
        distance_meters: float,
        eta_minutes: int,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        """
        Tình nguyện viên bấm Nhận yêu cầu cứu hộ (Màn 3/5).
        Áp dụng Optimistic Concurrency Control (OCC).
        """
        now = datetime.now(timezone.utc)

        # 1. Kiểm tra trạng thái hiện tại
        sos = await self.get_sos_by_id(db, request_id)
        if not sos:
            return False, None, "Ca cứu hộ không tồn tại hoặc đã bị xoá."
        
        if sos.status != "PENDING":
            return False, sos, "Yêu cầu cứu hộ này đã được một tình nguyện viên khác tiếp nhận."

        if sos.version != expected_version:
            return False, sos, "Dữ liệu ca cứu hộ đã bị thay đổi bởi người khác, vui lòng tải lại."

        # 2. Cập nhật có OCC Version check bằng SQL tường minh
        update_sql = text("""
            UPDATE flood_sos_requests
            SET status = 'ACCEPTED',
                assigned_volunteer_id = :vol_id,
                assigned_rescuer_name = :rescuer_name,
                assigned_rescuer_phone = :rescuer_phone,
                assigned_team_name = :team_name,
                assigned_vehicle_type = :vehicle_type,
                rescuer_latitude = :vol_lat,
                rescuer_longitude = :vol_lng,
                rescuer_distance_meters = :dist,
                rescuer_eta_minutes = :eta,
                assigned_at = :assigned_at,
                version = version + 1,
                updated_at = :updated_at
            WHERE request_id = :req_id
              AND version = :expected_version
              AND status = 'PENDING'
              AND deleted_at IS NULL
        """)

        res: Any = await db.execute(
            update_sql,
            {
                "vol_id": volunteer_id,
                "rescuer_name": volunteer_name,
                "rescuer_phone": volunteer_phone,
                "team_name": team_name or "Đội Phản ứng nhanh cơ sở",
                "vehicle_type": vehicle_type or "Xuồng máy cứu nạn",
                "vol_lat": vol_lat,
                "vol_lng": vol_lng,
                "dist": distance_meters,
                "eta": eta_minutes,
                "assigned_at": now,
                "updated_at": now,
                "req_id": request_id,
                "expected_version": expected_version,
            }
        )
        await db.commit()

        if res.rowcount == 0:
            # Có xung đột phiên bản hoặc vừa có người khác nhận
            updated_sos = await self.get_sos_by_id(db, request_id)
            return False, updated_sos, "Yêu cầu cứu hộ này đã được một tình nguyện viên khác tiếp nhận."

        updated_sos = await self.get_sos_by_id(db, request_id)
        return True, updated_sos, None

    async def update_sos_progress(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        status: str,
        rescuer_lat: float,
        rescuer_lng: float,
        distance_meters: float,
        eta_minutes: int,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        """Cập nhật tiến trình di chuyển của người cứu hộ (Màn 4/5)"""
        now = datetime.now(timezone.utc)
        sos = await self.get_sos_by_id(db, request_id)
        if not sos:
            return False, None, "Ca cứu hộ không tồn tại."

        if sos.version != expected_version:
            return False, sos, "Phiên bản dữ liệu xung đột (OCC Conflict), vui lòng tải lại."

        completed_at = now if status == "COMPLETED" else None

        update_sql = text("""
            UPDATE flood_sos_requests
            SET status = :status,
                rescuer_latitude = :rescuer_lat,
                rescuer_longitude = :rescuer_lng,
                rescuer_distance_meters = :dist,
                rescuer_eta_minutes = :eta,
                completed_at = COALESCE(:completed_at, completed_at),
                version = version + 1,
                updated_at = :updated_at
            WHERE request_id = :req_id
              AND version = :expected_version
              AND deleted_at IS NULL
        """)

        res: Any = await db.execute(
            update_sql,
            {
                "status": status,
                "rescuer_lat": rescuer_lat,
                "rescuer_lng": rescuer_lng,
                "dist": distance_meters,
                "eta": eta_minutes,
                "completed_at": completed_at,
                "updated_at": now,
                "req_id": request_id,
                "expected_version": expected_version,
            }
        )
        await db.commit()

        if res.rowcount == 0:
            return False, await self.get_sos_by_id(db, request_id), "Không thể cập nhật tiến trình do xung đột."

        return True, await self.get_sos_by_id(db, request_id), None

    async def add_chat_message(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        sender_id: Optional[uuid.UUID],
        sender_type: str,
        sender_name: str,
        content: str,
    ) -> FloodSosChatMessage:
        """Thêm tin nhắn trao đổi khẩn cấp giữa người gặp nạn và người cứu hộ"""
        msg = FloodSosChatMessage(
            message_id=uuid.uuid4(),
            request_id=request_id,
            sender_id=sender_id,
            sender_type=sender_type,
            sender_name=sender_name,
            content=content,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    async def get_chat_messages(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> List[FloodSosChatMessage]:
        """Lấy danh sách tin nhắn của ca cứu hộ theo thứ tự thời gian"""
        stmt = (
            select(FloodSosChatMessage)
            .where(FloodSosChatMessage.request_id == request_id)
            .order_by(FloodSosChatMessage.created_at.asc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def cancel_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        cancel_reason: str,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        """Nạn nhân huỷ yêu cầu SOS (Màn 5/5)"""
        now = datetime.now(timezone.utc)
        sos = await self.get_sos_by_id(db, request_id)
        if not sos:
            return False, None, "Ca cứu hộ không tồn tại."

        if sos.status in ["COMPLETED", "CANCELLED"]:
            return False, sos, f"Ca cứu hộ đã ở trạng thái {sos.status}, không thể huỷ."

        if sos.version != expected_version:
            return False, sos, "Dữ liệu ca cứu hộ đã thay đổi, vui lòng thử lại."

        update_sql = text("""
            UPDATE flood_sos_requests
            SET status = 'CANCELLED',
                cancel_reason = :cancel_reason,
                cancelled_at = :cancelled_at,
                version = version + 1,
                updated_at = :updated_at
            WHERE request_id = :req_id
              AND version = :expected_version
              AND deleted_at IS NULL
        """)

        res: Any = await db.execute(
            update_sql,
            {
                "cancel_reason": cancel_reason,
                "cancelled_at": now,
                "updated_at": now,
                "req_id": request_id,
                "expected_version": expected_version,
            }
        )
        await db.commit()

        if res.rowcount == 0:
            return False, await self.get_sos_by_id(db, request_id), "Huỷ ca cứu hộ thất bại do xung đột OCC."

        return True, await self.get_sos_by_id(db, request_id), None

    async def complete_sos_rating(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        rating: int,
        feedback_notes: Optional[str],
    ) -> Optional[FloodSosRequest]:
        """Gửi đánh giá ca cứu nạn sau khi hoàn tất"""
        sos = await self.get_sos_by_id(db, request_id)
        if not sos:
            return None

        sos.rating = rating
        sos.feedback_notes = feedback_notes
        sos.version += 1
        await db.commit()
        await db.refresh(sos)
        return sos

    async def soft_delete_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> bool:
        """Xoá mềm ca cứu hộ"""
        sos = await self.get_sos_by_id(db, request_id)
        if not sos:
            return False

        sos.deleted_at = datetime.now(timezone.utc)
        sos.version += 1
        await db.commit()
        return True
