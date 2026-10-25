import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.event import (
    Event,
    EventParticipant,
    EventInterest,
    EventCheckin,
    EventStatus,
)
from app.models.rbac import User
from app.schemas.event import (
    EventCreate,
    EventResponse,
    EventListResponse,
    ParticipantItem,
    CheckinRequest,
    CheckinResponse,
    EventReviewRequest,
)

# Tọa độ giới hạn địa lý TP.HCM (Bounding Box bao quát cả Cần Giờ, Củ Chi)
HCM_BOUNDS = {
    "min_lat": 10.35,
    "max_lat": 11.20,
    "min_lon": 106.35,
    "max_lon": 107.05,
}


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách giữa 2 điểm GPS (WGS84) theo công thức Haversine.
    Đầu ra tính bằng MÉT (meters).
    """
    R = 6371000.0  # Bán kính Trái Đất (mét)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _is_within_hcm(self, lat: float, lon: float) -> bool:
        return (
            HCM_BOUNDS["min_lat"] <= lat <= HCM_BOUNDS["max_lat"]
            and HCM_BOUNDS["min_lon"] <= lon <= HCM_BOUNDS["max_lon"]
        )

    async def create_event(self, creator_id: uuid.UUID, data: EventCreate) -> EventResponse:
        """Tạo sự kiện mới (Màn 2/4)"""
        now = datetime.now(timezone.utc)
        # 1. Ràng buộc ngày giờ bắt đầu sau ít nhất 24 giờ
        start_time = data.start_time
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        if start_time < now + timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian bắt đầu sự kiện phải sau thời điểm hiện tại ít nhất 24 giờ để chuẩn bị công tác tổ chức.",
            )

        # 2. Ràng buộc địa giới hành chính TP.HCM
        if not self._is_within_hcm(data.latitude, data.longitude):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tọa độ điểm tập trung phải nằm trong địa bàn 22 quận/huyện của TP. Hồ Chí Minh.",
            )

        event_id = uuid.uuid4()
        new_event = Event(
            event_id=event_id,
            title=data.title.strip(),
            description=data.description.strip(),
            cover_image_url=data.cover_image_url.strip(),
            start_time=start_time,
            end_time=data.end_time,
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address.strip(),
            district=data.district.strip(),
            max_participants=data.max_participants,
            current_participants=1,
            interested_count=0,
            creator_id=creator_id,
            status=EventStatus.PENDING.value,
            checkin_radius_meters=100,
            version=1,
            is_deleted=False,
        )
        self.db.add(new_event)
        await self.db.flush()

        # Người tạo tự động là người tham gia đầu tiên (Màn 2/4)
        creator_participant = EventParticipant(
            id=uuid.uuid4(),
            event_id=event_id,
            user_id=creator_id,
            is_creator=True,
            joined_at=now,
        )
        self.db.add(creator_participant)
        await self.db.commit()
        await self.db.refresh(new_event)

        return await self.get_event_detail(event_id, current_user_id=creator_id)

    async def list_events(
        self,
        current_user_id: Optional[uuid.UUID] = None,
        district: Optional[str] = None,
        time_filter: Optional[str] = "upcoming",  # upcoming, this_week, past, all
        search: Optional[str] = None,
        my_events: bool = False,
        page: int = 1,
        page_size: int = 12,
    ) -> EventListResponse:
        """Lấy danh sách sự kiện kèm bộ lọc và phân trang (Màn 1/4)"""
        now = datetime.now(timezone.utc)
        query = select(Event).where(Event.is_deleted == False)

        if my_events and current_user_id:
            # Sự kiện của tôi: Tôi là người tạo HOẶC tôi đã đăng ký tham gia
            participated_event_ids_query = select(EventParticipant.event_id).where(
                EventParticipant.user_id == current_user_id
            )
            query = query.where(
                or_(
                    Event.creator_id == current_user_id,
                    Event.event_id.in_(participated_event_ids_query)
                )
            )
        else:
            # Danh sách công khai: Chỉ xem sự kiện APPROVED
            query = query.where(Event.status == EventStatus.APPROVED.value)

        # Lọc theo quận/huyện
        if district and district.lower() not in ("all", "tất cả", "tất cả quận/huyện"):
            query = query.where(Event.district.ilike(f"%{district.strip()}%"))

        # Lọc theo thời gian
        if time_filter == "upcoming":
            query = query.where(Event.start_time >= now)
        elif time_filter == "past":
            query = query.where(Event.start_time < now)
        elif time_filter == "this_week":
            end_of_week = now + timedelta(days=7)
            query = query.where(and_(Event.start_time >= now, Event.start_time <= end_of_week))

        # Tìm kiếm theo tên
        if search and search.strip():
            query = query.where(Event.title.ilike(f"%{search.strip()}%"))

        # Đếm tổng
        count_query = select(func.count()).select_from(query.subquery())
        total_count_res = await self.db.execute(count_query)
        total = total_count_res.scalar_one() or 0

        # Sắp xếp theo ngày diễn ra gần nhất
        if time_filter == "past":
            query = query.order_by(desc(Event.start_time))
        else:
            query = query.order_by(asc(Event.start_time))

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        exec_res = await self.db.execute(query)
        events = exec_res.scalars().all()

        items = []
        for ev in events:
            ev_dto = await self._map_event_dto(ev, current_user_id)
            items.append(ev_dto)

        return EventListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_event_detail(
        self, event_id: uuid.UUID, current_user_id: Optional[uuid.UUID] = None
    ) -> EventResponse:
        """Xem chi tiết sự kiện và trạng thái tương tác (Màn 3/4)"""
        q = select(Event).where(Event.event_id == event_id, Event.is_deleted == False)
        res = await self.db.execute(q)
        event = res.scalar_one_or_none()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy sự kiện hoặc sự kiện đã bị hủy.",
            )

        return await self._map_event_dto(event, current_user_id, include_participants=True)

    async def toggle_interest(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """Toggle Quan tâm sự kiện (Màn 3/4)"""
        event = await self._get_active_event(event_id)

        # Kiểm tra xem đã quan tâm chưa
        chk = await self.db.execute(
            select(EventInterest).where(
                EventInterest.event_id == event_id,
                EventInterest.user_id == user_id,
            )
        )
        existing = chk.scalar_one_or_none()

        if existing:
            # Hủy quan tâm
            await self.db.delete(existing)
            event.interested_count = max(0, event.interested_count - 1)
            is_interested = False
        else:
            # Đánh dấu quan tâm
            new_interest = EventInterest(
                id=uuid.uuid4(),
                event_id=event_id,
                user_id=user_id,
                created_at=datetime.now(timezone.utc),
            )
            self.db.add(new_interest)
            event.interested_count += 1
            is_interested = True

        await self.db.commit()
        await self.db.refresh(event)

        return {
            "is_interested": is_interested,
            "interested_count": event.interested_count,
            "message": "Đã lưu vào danh sách quan tâm" if is_interested else "Đã bỏ quan tâm",
        }

    async def toggle_join(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """Toggle Tham gia sự kiện (Màn 3/4)"""
        event = await self._get_active_event(event_id)

        chk = await self.db.execute(
            select(EventParticipant).where(
                EventParticipant.event_id == event_id,
                EventParticipant.user_id == user_id,
            )
        )
        existing = chk.scalar_one_or_none()

        if existing:
            # Không cho phép người tạo tự hủy tham gia sự kiện của chính mình
            if existing.is_creator:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bạn là người tổ chức sự kiện này nên không thể hủy tham gia.",
                )
            await self.db.delete(existing)
            event.current_participants = max(1, event.current_participants - 1)
            is_joined = False
        else:
            # Kiểm tra số lượng người tối đa
            if event.current_participants >= event.max_participants:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sự kiện đã đủ số người tham gia (tối đa {event.max_participants} người).",
                )
            new_p = EventParticipant(
                id=uuid.uuid4(),
                event_id=event_id,
                user_id=user_id,
                is_creator=False,
                joined_at=datetime.now(timezone.utc),
            )
            self.db.add(new_p)
            event.current_participants += 1
            is_joined = True

        await self.db.commit()
        await self.db.refresh(event)

        return {
            "is_joined": is_joined,
            "current_participants": event.current_participants,
            "message": "Đăng ký tham gia thành công!" if is_joined else "Đã hủy tham gia sự kiện",
        }

    async def checkin_event(
        self, event_id: uuid.UUID, user_id: uuid.UUID, req: CheckinRequest
    ) -> CheckinResponse:
        """
        Xác thực và ghi nhận Check-in GPS tại hiện trường sự kiện (Màn 4/4)
        Quy tắc:
        - Phải là người đã đăng ký tham gia
        - Đúng khung giờ: Từ 1h trước đến 3h sau giờ bắt đầu
        - Sai số GPS <= 50m
        - Khoảng cách Haversine <= 100m
        - Cộng ngay 50 Điểm Xanh (GP)
        """
        now = datetime.now(timezone.utc)
        event = await self._get_active_event(event_id)

        # 1. Kiểm tra đã tham gia chưa
        p_res = await self.db.execute(
            select(EventParticipant).where(
                EventParticipant.event_id == event_id,
                EventParticipant.user_id == user_id,
            )
        )
        participant = p_res.scalar_one_or_none()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn chưa đăng ký tham gia sự kiện này. Vui lòng bấm 'Tham gia' trước khi check-in.",
            )

        # 2. Kiểm tra đã check-in trước đó chưa (Mỗi người chỉ check-in 1 lần)
        c_res = await self.db.execute(
            select(EventCheckin).where(
                EventCheckin.event_id == event_id,
                EventCheckin.user_id == user_id,
            )
        )
        if c_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã check-in sự kiện này rồi. Mỗi sự kiện chỉ được check-in 1 lần.",
            )

        # 3. Kiểm tra khung giờ check-in: Từ T_start - 1h đến T_start + 3h (hoặc end_time)
        event_start = event.start_time
        if event_start.tzinfo is None:
            event_start = event_start.replace(tzinfo=timezone.utc)

        allowed_start = event_start - timedelta(hours=1)
        allowed_end = event_start + timedelta(hours=3)
        if event.end_time:
            ev_end = event.end_time
            if ev_end.tzinfo is None:
                ev_end = ev_end.replace(tzinfo=timezone.utc)
            if ev_end > allowed_end:
                allowed_end = ev_end

        if now < allowed_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chưa đến thời gian check-in. Check-in chỉ mở trước giờ bắt đầu sự kiện 1 tiếng.",
            )
        if now > allowed_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Đã hết thời gian check-in cho sự kiện này.",
            )

        # 4. Kiểm tra độ chính xác GPS (Accuracy <= 50m)
        if req.accuracy > 50.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Độ chính xác định vị thấp (±{req.accuracy:.1f}m > 50m). Hãy ra nơi thoáng hơn và thử lại.",
            )

        # 5. Kiểm tra khoảng cách Haversine (Distance <= checkin_radius_meters, mặc định 100m)
        distance = calculate_haversine_distance(
            req.latitude, req.longitude, event.latitude, event.longitude
        )

        if distance > float(event.checkin_radius_meters):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bạn đang cách điểm tập trung {distance:.1f}m (vượt quá bán kính cho phép {event.checkin_radius_meters}m). Hãy di chuyển lại gần điểm tập trung hơn để check-in.",
            )

        # 6. Ghi nhận Check-in và cộng 50 Điểm Xanh
        checkin_record = EventCheckin(
            id=uuid.uuid4(),
            event_id=event_id,
            user_id=user_id,
            latitude=req.latitude,
            longitude=req.longitude,
            distance_meters=round(distance, 2),
            accuracy_meters=round(req.accuracy, 2),
            points_awarded=50,
            checkin_time=now,
            device_info=req.device_info,
        )
        self.db.add(checkin_record)

        # Cộng điểm vào tài khoản user
        u_res = await self.db.execute(select(User).where(User.user_id == user_id))
        user_record = u_res.scalar_one_or_none()
        total_pts = 50
        if user_record:
            user_record.total_green_points = (user_record.total_green_points or 0) + 50
            total_pts = user_record.total_green_points

        await self.db.commit()

        return CheckinResponse(
            success=True,
            message="Check-in thành công! Bạn đã nhận được +50 Điểm Xanh.",
            event_id=event_id,
            checkin_time=now,
            distance_meters=round(distance, 1),
            accuracy_meters=round(req.accuracy, 1),
            points_awarded=50,
            total_green_points=total_pts,
        )

    async def review_event(
        self, event_id: uuid.UUID, admin_id: uuid.UUID, data: EventReviewRequest
    ) -> EventResponse:
        """Admin duyệt hoặc từ chối sự kiện"""
        event = await self._get_active_event(event_id)
        if data.status not in (EventStatus.APPROVED.value, EventStatus.REJECTED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trạng thái xét duyệt chỉ có thể là APPROVED hoặc REJECTED.",
            )

        event.status = data.status
        if data.status == EventStatus.REJECTED.value:
            event.reject_reason = data.reject_reason or "Không đạt tiêu chuẩn kiểm duyệt nội dung."
        else:
            event.reject_reason = None

        event.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(event)

        return await self._map_event_dto(event, current_user_id=admin_id)

    async def cancel_event(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """Hủy sự kiện (Người tạo hoặc Admin)"""
        event = await self._get_active_event(event_id)
        if event.creator_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người tổ chức sự kiện mới có quyền hủy sự kiện này.",
            )

        event.status = EventStatus.CANCELLED.value
        event.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        return {"success": True, "message": "Đã hủy sự kiện thành công."}

    async def get_event_participants(self, event_id: uuid.UUID) -> List[ParticipantItem]:
        """Lấy toàn bộ danh sách người tham gia sự kiện"""
        q = (
            select(EventParticipant, User)
            .join(User, EventParticipant.user_id == User.user_id)
            .where(EventParticipant.event_id == event_id)
            .order_by(asc(EventParticipant.joined_at))
        )
        res = await self.db.execute(q)
        rows = res.all()

        participants = []
        for p, u in rows:
            avatar = getattr(u, "avatar_url", None)
            participants.append(
                ParticipantItem(
                    user_id=p.user_id,
                    full_name=u.full_name or "Người tham gia",
                    avatar_url=avatar,
                    joined_at=p.joined_at,
                    is_creator=p.is_creator,
                )
            )
        return participants

    async def _get_active_event(self, event_id: uuid.UUID) -> Event:
        q = select(Event).where(Event.event_id == event_id, Event.is_deleted == False)
        res = await self.db.execute(q)
        event = res.scalar_one_or_none()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy sự kiện hoặc sự kiện đã bị xóa.",
            )
        return event

    async def _map_event_dto(
        self,
        event: Event,
        current_user_id: Optional[uuid.UUID] = None,
        include_participants: bool = False,
    ) -> EventResponse:
        # Lấy thông tin người tạo
        creator_name = "Quản trị viên"
        creator_avatar = None
        if event.creator_id:
            c_res = await self.db.execute(
                select(User).where(User.user_id == event.creator_id)
            )
            c_user = c_res.scalar_one_or_none()
            if c_user:
                creator_name = c_user.full_name or "Người tổ chức"
                creator_avatar = getattr(c_user, "avatar_url", None)

        is_joined = False
        is_interested = False
        is_checked_in = False

        if current_user_id:
            # Check joined
            j_res = await self.db.execute(
                select(EventParticipant).where(
                    EventParticipant.event_id == event.event_id,
                    EventParticipant.user_id == current_user_id,
                )
            )
            is_joined = j_res.scalar_one_or_none() is not None

            # Check interested
            i_res = await self.db.execute(
                select(EventInterest).where(
                    EventInterest.event_id == event.event_id,
                    EventInterest.user_id == current_user_id,
                )
            )
            is_interested = i_res.scalar_one_or_none() is not None

            # Check checkin
            chk_res = await self.db.execute(
                select(EventCheckin).where(
                    EventCheckin.event_id == event.event_id,
                    EventCheckin.user_id == current_user_id,
                )
            )
            is_checked_in = chk_res.scalar_one_or_none() is not None

        # Tối đa 10 avatar người tham gia đầu tiên (Màn 3/4)
        participants_preview = []
        if include_participants or True:
            q_p = (
                select(EventParticipant, User)
                .join(User, EventParticipant.user_id == User.user_id)
                .where(EventParticipant.event_id == event.event_id)
                .order_by(asc(EventParticipant.joined_at))
                .limit(10)
            )
            p_rows = (await self.db.execute(q_p)).all()
            for p, u in p_rows:
                participants_preview.append(
                    ParticipantItem(
                        user_id=p.user_id,
                        full_name=u.full_name or "Người tham gia",
                        avatar_url=getattr(u, "avatar_url", None),
                        joined_at=p.joined_at,
                        is_creator=p.is_creator,
                    )
                )

        return EventResponse(
            event_id=event.event_id,
            title=event.title,
            description=event.description,
            cover_image_url=event.cover_image_url,
            start_time=event.start_time,
            end_time=event.end_time,
            latitude=event.latitude,
            longitude=event.longitude,
            address=event.address,
            district=event.district,
            max_participants=event.max_participants,
            current_participants=event.current_participants,
            interested_count=event.interested_count,
            creator_id=event.creator_id,
            creator_name=creator_name,
            creator_avatar=creator_avatar,
            status=event.status,
            reject_reason=event.reject_reason,
            checkin_radius_meters=event.checkin_radius_meters,
            created_at=event.created_at,
            updated_at=event.updated_at,
            is_joined=is_joined,
            is_interested=is_interested,
            is_checked_in=is_checked_in,
            participants_preview=participants_preview,
        )
