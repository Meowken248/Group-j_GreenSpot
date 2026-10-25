import asyncio
import math
import uuid

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

from fastapi import HTTPException, status
from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import (
    Event,
    EventCheckin,
    EventInterest,
    EventParticipant,
    EventStatus,
)
from app.models.notification import Notification
from app.models.rbac import Role, User
from app.schemas.event import (
    CheckinRequest,
    CheckinResponse,
    EventCreate,
    EventListResponse,
    EventResponse,
    EventReviewRequest,
    EventUpdate,
    ParticipantItem,
)

# Tọa độ giới hạn địa lý TP.HCM (Bounding Box bao quát cả Cần Giờ, Củ Chi)
HCM_BOUNDS = {
    "min_lat": 10.35,
    "max_lat": 11.20,
    "min_lon": 106.35,
    "max_lon": 107.05,
}

# Quy tắc nghiệp vụ Chức năng 21
CHECKIN_POINTS = 50          # Điểm Xanh cho mỗi lượt check-in hợp lệ
DAILY_GP_CAP = 150           # Giới hạn Điểm Xanh nhận từ sự kiện trong 1 ngày
CHECKIN_OPEN_BEFORE = timedelta(hours=1)
CHECKIN_CLOSE_AFTER = timedelta(hours=3)
REMINDER_WINDOWS = (
    (1, "EVENT_REMINDER_1H", "còn 1 giờ"),
    (24, "EVENT_REMINDER_24H", "còn 24 giờ"),
)
PARTICIPANTS_PREVIEW_LIMIT = 10


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách giữa 2 điểm GPS (WGS84) theo công thức Haversine (mét)."""
    R = 6371000.0
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


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    """Chuẩn hoá datetime về timezone UTC."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def event_end_time(event: Event) -> datetime:
    """Thời điểm kết thúc hiệu lực: end_time hoặc start_time + 3 giờ."""
    start = _as_utc(event.start_time) or datetime.now(timezone.utc)
    end = _as_utc(event.end_time)
    return end if end else start + CHECKIN_CLOSE_AFTER


def is_event_ended(event: Event, now: Optional[datetime] = None) -> bool:
    now = now or datetime.now(timezone.utc)
    return event_end_time(event) <= now


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _is_within_hcm(self, lat: float, lon: float) -> bool:
        return (
            HCM_BOUNDS["min_lat"] <= lat <= HCM_BOUNDS["max_lat"]
            and HCM_BOUNDS["min_lon"] <= lon <= HCM_BOUNDS["max_lon"]
        )

    async def _get_active_event(self, event_id: uuid.UUID) -> Event:
        q = select(Event).where(Event.event_id == event_id, Event.is_deleted == False)  # noqa: E712
        event = (await self.db.execute(q)).scalar_one_or_none()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy sự kiện hoặc sự kiện đã bị xoá.",
            )
        return event

    async def is_admin(self, user_id: Optional[uuid.UUID]) -> bool:
        """Kiểm tra vai trò ADMIN dựa trên RBAC (không dựa vào email)."""
        if not user_id:
            return False
        q = (
            select(Role.role_code)
            .join(User, User.role_id == Role.role_id)
            .where(User.user_id == user_id)
        )
        code = (await self.db.execute(q)).scalar_one_or_none()
        return code == "ADMIN"

    async def _can_view(self, event: Event, viewer_id: Optional[uuid.UUID]) -> bool:
        """Sự kiện chưa duyệt chỉ hiển thị với người tạo và Quản trị viên."""
        if event.status == EventStatus.APPROVED.value:
            return True
        if not viewer_id:
            return False
        if event.creator_id == viewer_id:
            return True
        return await self.is_admin(viewer_id)

    def _ensure_interactable(self, event: Event, now: datetime) -> None:
        if event.status != EventStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện chưa được duyệt hoặc đã bị huỷ nên không thể tương tác.",
            )
        if is_event_ended(event, now):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện đã kết thúc nên không thể đăng ký tham gia hay quan tâm nữa.",
            )
    async def _notify(
        self,
        user_ids: Iterable[uuid.UUID],
        title: str,
        message: str,
        notification_type: str,
        reference_id: str,
    ) -> int:
        """Tạo thông báo in-app cho danh sách người dùng (không tự commit)."""
        unique_ids: Set[uuid.UUID] = {uid for uid in user_ids if uid}
        for uid in unique_ids:
            self.db.add(
                Notification(
                    notification_id=uuid.uuid4(),
                    user_id=uid,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    reference_id=reference_id,
                    is_read=False,
                )
            )
        return len(unique_ids)

    async def _admin_ids(self) -> List[uuid.UUID]:
        q = (
            select(User.user_id)
            .join(Role, User.role_id == Role.role_id)
            .where(Role.role_code == "ADMIN", User.deleted_at.is_(None))
        )
        return list((await self.db.execute(q)).scalars().all())

    async def _participant_ids(
        self, event_id: uuid.UUID, exclude: Optional[uuid.UUID] = None
    ) -> List[uuid.UUID]:
        q = select(EventParticipant.user_id).where(EventParticipant.event_id == event_id)
        if exclude:
            q = q.where(EventParticipant.user_id != exclude)
        return list((await self.db.execute(q)).scalars().all())

    # ------------------------------------------------------------------ #
    # Tạo sự kiện (Màn 2/4)
    # ------------------------------------------------------------------ #
    async def create_event(self, creator_id: uuid.UUID, data: EventCreate) -> EventResponse:
        """Tạo sự kiện mới (Màn 2/4)."""
        now = datetime.now(timezone.utc)
        start_time = _as_utc(data.start_time)
        end_time = _as_utc(data.end_time)

        # 1. Ràng buộc ngày giờ bắt đầu sau ít nhất 24 giờ
        if start_time < now + timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian bắt đầu sự kiện phải sau thời điểm hiện tại ít nhất 24 giờ để chuẩn bị công tác tổ chức.",
            )

        # 2. Ràng buộc thời gian kết thúc
        if end_time and end_time <= start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian kết thúc phải sau thời gian bắt đầu sự kiện.",
            )

        # 3. Ràng buộc địa giới hành chính TP.HCM
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
            end_time=end_time,
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
        self.db.add(
            EventParticipant(
                id=uuid.uuid4(),
                event_id=event_id,
                user_id=creator_id,
                is_creator=True,
                joined_at=now,
            )
        )

        # Thông báo cho Quản trị viên có sự kiện mới cần duyệt
        await self._notify(
            await self._admin_ids(),
            title="Sự kiện Chủ Nhật Xanh mới cần duyệt",
            message=f"Sự kiện '{new_event.title}' vừa được gửi duyệt. Vui lòng kiểm tra và phê duyệt.",
            notification_type="EVENT_PENDING_REVIEW",
            reference_id=str(event_id),
        )

        await self.db.commit()
        await self.db.refresh(new_event)
        return await self._map_event_dto(new_event, current_user_id=creator_id)
    # ------------------------------------------------------------------ #
    # Danh sách sự kiện (Màn 1/4)
    # ------------------------------------------------------------------ #
    async def list_events(
        self,
        current_user_id: Optional[uuid.UUID] = None,
        district: Optional[str] = None,
        time_filter: Optional[str] = "upcoming",  # upcoming, this_week, past, all
        search: Optional[str] = None,
        my_events: bool = False,
        page: int = 1,
        page_size: int = 12,
        status_filter: Optional[str] = None,
        is_admin: bool = False,
    ) -> EventListResponse:
        """Lấy danh sách sự kiện kèm bộ lọc và phân trang (Màn 1/4)."""
        now = datetime.now(timezone.utc)
        query = select(Event).where(Event.is_deleted == False)  # noqa: E712

        if my_events and current_user_id:
            # Sự kiện của tôi: tôi là người tạo HOẶC tôi đã đăng ký tham gia
            participated_event_ids_query = select(EventParticipant.event_id).where(
                EventParticipant.user_id == current_user_id
            )
            query = query.where(
                or_(
                    Event.creator_id == current_user_id,
                    Event.event_id.in_(participated_event_ids_query),
                )
            )
        elif status_filter and is_admin:
            # Quản trị viên xem theo trạng thái (phục vụ màn duyệt sự kiện)
            query = query.where(Event.status == status_filter.upper())
        else:
            # Danh sách công khai: chỉ xem sự kiện APPROVED
            query = query.where(Event.status == EventStatus.APPROVED.value)

        if status_filter and my_events:
            query = query.where(Event.status == status_filter.upper())


        # Lọc theo quận/huyện
        if district and district.lower() not in ("all", "tất cả", "tất cả quận/huyện"):
            query = query.where(Event.district.ilike(f"%{district.strip()}%"))

        # Lọc theo thời gian
        ended_condition = or_(
            and_(Event.end_time.is_not(None), Event.end_time < now),
            and_(Event.end_time.is_(None), Event.start_time < now - CHECKIN_CLOSE_AFTER),
        )
        if time_filter == "upcoming":
            query = query.where(
                or_(
                    Event.start_time >= now,
                    and_(Event.end_time.is_not(None), Event.end_time >= now),
                )
            )
        elif time_filter == "past":
            query = query.where(ended_condition)
        elif time_filter == "this_week":
            # "Tuần này" = 7 ngày kế tiếp tính từ thời điểm hiện tại
            query = query.where(
                and_(Event.start_time >= now, Event.start_time <= now + timedelta(days=7))
            )

        # Tìm kiếm theo tên hoặc địa chỉ
        if search and search.strip():
            keyword = f"%{search.strip()}%"
            query = query.where(or_(Event.title.ilike(keyword), Event.address.ilike(keyword)))

        # Đếm tổng
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one() or 0

        # Sắp xếp theo ngày diễn ra gần nhất
        if time_filter == "past":
            query = query.order_by(desc(Event.start_time))
        else:
            query = query.order_by(asc(Event.start_time))

        offset = (page - 1) * page_size
        events = (await self.db.execute(query.offset(offset).limit(page_size))).scalars().all()
        items = await self._map_events(events, current_user_id, include_participants=True)

        return EventListResponse(items=items, total=total, page=page, page_size=page_size)

    # ------------------------------------------------------------------ #
    # Chi tiết sự kiện (Màn 3/4)
    # ------------------------------------------------------------------ #
    async def get_event_detail(
        self, event_id: uuid.UUID, current_user_id: Optional[uuid.UUID] = None
    ) -> EventResponse:
        """Xem chi tiết sự kiện và trạng thái tương tác (Màn 3/4)."""
        event = await self._get_active_event(event_id)
        if not await self._can_view(event, current_user_id):
            # Trả 404 để không làm lộ sự tồn tại của sự kiện chưa được duyệt
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy sự kiện hoặc sự kiện chưa được phê duyệt.",
            )
        return await self._map_event_dto(event, current_user_id, include_participants=True)
    # ------------------------------------------------------------------ #
    # Chỉnh sửa sự kiện (Màn 3/4)
    # ------------------------------------------------------------------ #
    async def update_event(
        self, event_id: uuid.UUID, editor_id: uuid.UUID, data: EventUpdate
    ) -> EventResponse:
        """Người tạo chỉnh sửa sự kiện trước khi diễn ra; sự kiện quay lại trạng thái chờ duyệt."""
        event = await self._get_active_event(event_id)
        editor_is_admin = await self.is_admin(editor_id)

        if event.creator_id != editor_id and not editor_is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người tổ chức sự kiện mới có quyền chỉnh sửa.",
            )
        if event.status == EventStatus.CANCELLED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện đã bị huỷ nên không thể chỉnh sửa.",
            )

        now = datetime.now(timezone.utc)
        if _as_utc(event.start_time) <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện đã bắt đầu nên không thể chỉnh sửa.",
            )

        # Optimistic locking (Quy tắc 2 - PROJECT_RULES.md)
        if data.version != event.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "VERSION_CONFLICT",
                    "message": "Sự kiện vừa được cập nhật bởi người khác. Vui lòng tải lại dữ liệu trước khi lưu.",
                },
            )

        new_start = _as_utc(data.start_time) if data.start_time else _as_utc(event.start_time)
        new_end = _as_utc(data.end_time) if data.end_time else _as_utc(event.end_time)

        if new_start < now + timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian bắt đầu sự kiện phải sau thời điểm hiện tại ít nhất 24 giờ.",
            )
        if new_end and new_end <= new_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian kết thúc phải sau thời gian bắt đầu sự kiện.",
            )

        new_lat = data.latitude if data.latitude is not None else event.latitude
        new_lon = data.longitude if data.longitude is not None else event.longitude
        if not self._is_within_hcm(new_lat, new_lon):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tọa độ điểm tập trung phải nằm trong địa bàn 22 quận/huyện của TP. Hồ Chí Minh.",
            )

        if data.max_participants is not None and data.max_participants < event.current_participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Số người tối đa không thể nhỏ hơn số người đã đăng ký "
                    f"({event.current_participants} người)."
                ),
            )

        for field in (
            "title",
            "description",
            "cover_image_url",
            "address",
            "district",
            "max_participants",
        ):
            value = getattr(data, field)
            if value is not None:
                setattr(event, field, value)

        event.start_time = new_start
        event.end_time = new_end
        event.latitude = new_lat
        event.longitude = new_lon
        event.status = EventStatus.PENDING.value
        event.reject_reason = None
        event.version += 1
        event.updated_at = now

        await self._notify(
            await self._participant_ids(event_id, exclude=editor_id),
            title="Sự kiện bạn tham gia vừa được cập nhật",
            message=f"Sự kiện '{event.title}' đã được người tổ chức cập nhật và đang chờ duyệt lại.",
            notification_type="EVENT_UPDATED",
            reference_id=str(event_id),
        )
        await self._notify(
            await self._admin_ids(),
            title="Sự kiện Chủ Nhật Xanh cần duyệt lại",
            message=f"Sự kiện '{event.title}' vừa được chỉnh sửa. Vui lòng kiểm tra và phê duyệt lại.",
            notification_type="EVENT_PENDING_REVIEW",
            reference_id=str(event_id),
        )

        await self.db.commit()
        await self.db.refresh(event)
        return await self._map_event_dto(event, current_user_id=editor_id)

    # ------------------------------------------------------------------ #
    # Quan tâm / Tham gia (Màn 3/4)
    # ------------------------------------------------------------------ #
    async def toggle_interest(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """Toggle Quan tâm sự kiện (Màn 3/4)."""
        now = datetime.now(timezone.utc)
        event = await self._get_active_event(event_id)
        self._ensure_interactable(event, now)

        existing = (
            await self.db.execute(
                select(EventInterest).where(
                    EventInterest.event_id == event_id,
                    EventInterest.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        if existing:
            await self.db.delete(existing)
            event.interested_count = max(0, event.interested_count - 1)
            is_interested = False
        else:
            self.db.add(
                EventInterest(
                    id=uuid.uuid4(),
                    event_id=event_id,
                    user_id=user_id,
                    created_at=now,
                )
            )
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
        """Toggle Tham gia sự kiện (Màn 3/4)."""
        now = datetime.now(timezone.utc)
        event = await self._get_active_event(event_id)
        self._ensure_interactable(event, now)

        existing = (
            await self.db.execute(
                select(EventParticipant).where(
                    EventParticipant.event_id == event_id,
                    EventParticipant.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        if existing:
            # Không cho phép người tạo tự huỷ tham gia sự kiện của chính mình
            if existing.is_creator:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bạn là người tổ chức sự kiện này nên không thể huỷ tham gia.",
                )
            await self.db.delete(existing)
            event.current_participants = max(1, event.current_participants - 1)
            is_joined = False
        else:
            if event.current_participants >= event.max_participants:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sự kiện đã đủ số người tham gia (tối đa {event.max_participants} người).",
                )
            self.db.add(
                EventParticipant(
                    id=uuid.uuid4(),
                    event_id=event_id,
                    user_id=user_id,
                    is_creator=False,
                    joined_at=now,
                )
            )
            event.current_participants += 1
            is_joined = True

        await self.db.commit()
        await self.db.refresh(event)

        return {
            "is_joined": is_joined,
            "current_participants": event.current_participants,
            "message": "Đăng ký tham gia thành công!" if is_joined else "Đã huỷ tham gia sự kiện",
        }

    # ------------------------------------------------------------------ #
    # Check-in GPS (Màn 4/4)
    # ------------------------------------------------------------------ #
    async def checkin_event(
        self, event_id: uuid.UUID, user_id: uuid.UUID, req: CheckinRequest
    ) -> CheckinResponse:
        """
        Xác thực và ghi nhận Check-in GPS tại hiện trường sự kiện (Màn 4/4).

        Quy tắc:
        - Phải là người đã đăng ký tham gia và sự kiện đã được duyệt.
        - Khung giờ: từ 1 giờ TRƯỚC đến 3 giờ SAU giờ bắt đầu (đặc tả Trang 176).
        - Sai số GPS <= 50m; khoảng cách Haversine <= bán kính check-in (100m).
        - Cộng 50 Điểm Xanh, tối đa 150 GP/ngày cho mỗi tài khoản.
        """
        now = datetime.now(timezone.utc)
        event = await self._get_active_event(event_id)
        if event.status != EventStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện chưa được duyệt hoặc đã bị huỷ nên không thể check-in.",
            )

        # 1. Kiểm tra đã tham gia chưa
        participant = (
            await self.db.execute(
                select(EventParticipant).where(
                    EventParticipant.event_id == event_id,
                    EventParticipant.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn chưa đăng ký tham gia sự kiện này. Vui lòng bấm 'Tham gia' trước khi check-in.",
            )

        # 2. Mỗi người chỉ check-in 1 lần / sự kiện
        already = (
            await self.db.execute(
                select(EventCheckin).where(
                    EventCheckin.event_id == event_id,
                    EventCheckin.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if already:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã check-in sự kiện này rồi. Mỗi sự kiện chỉ được check-in 1 lần.",
            )

        # 3. Khung giờ check-in: [T_start - 1h, T_start + 3h]
        event_start = _as_utc(event.start_time) or now
        allowed_start = event_start - CHECKIN_OPEN_BEFORE
        allowed_end = event_start + CHECKIN_CLOSE_AFTER

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

        # 4. Độ chính xác GPS <= 50m
        if req.accuracy > 50.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Độ chính xác định vị thấp (±{req.accuracy:.1f}m > 50m). Hãy ra nơi thoáng hơn và thử lại.",
            )

        # 5. Khoảng cách Haversine <= bán kính cho phép
        distance = calculate_haversine_distance(
            req.latitude, req.longitude, event.latitude, event.longitude
        )
        if distance > float(event.checkin_radius_meters):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Bạn đang cách điểm tập trung {distance:.1f}m "
                    f"(vượt quá bán kính cho phép {event.checkin_radius_meters}m). "
                    "Hãy di chuyển lại gần điểm tập trung hơn để check-in."
                ),
            )

        # 6. Giới hạn Điểm Xanh theo ngày (sổ cái = event_checkins.points_awarded)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        earned_today = (
            await self.db.execute(
                select(func.coalesce(func.sum(EventCheckin.points_awarded), 0)).where(
                    EventCheckin.user_id == user_id,
                    EventCheckin.checkin_time >= day_start,
                )
            )
        ).scalar_one() or 0
        earned_today = int(earned_today)
        points_awarded = max(0, min(CHECKIN_POINTS, DAILY_GP_CAP - earned_today))

        self.db.add(
            EventCheckin(
                id=uuid.uuid4(),
                event_id=event_id,
                user_id=user_id,
                latitude=req.latitude,
                longitude=req.longitude,
                distance_meters=round(distance, 2),
                accuracy_meters=round(req.accuracy, 2),
                points_awarded=points_awarded,
                checkin_time=now,
                device_info=req.device_info,
            )
        )

        user_record = (
            await self.db.execute(select(User).where(User.user_id == user_id))
        ).scalar_one_or_none()
        total_pts = 0
        if user_record:
            user_record.total_green_points = (user_record.total_green_points or 0) + points_awarded
            total_pts = user_record.total_green_points

        if points_awarded > 0:
            message = f"Check-in thành công! Bạn đã nhận được +{points_awarded} Điểm Xanh."
        else:
            message = (
                "Check-in thành công! Hôm nay bạn đã đạt giới hạn "
                f"{DAILY_GP_CAP} Điểm Xanh từ sự kiện nên lượt này không cộng thêm điểm."
            )

        await self._notify(
            [user_id],
            title="Check-in sự kiện thành công",
            message=f"{message} (Sự kiện: {event.title})",
            notification_type="EVENT_CHECKIN",
            reference_id=str(event_id),
        )

        await self.db.commit()

        return CheckinResponse(
            success=True,
            message=message,
            event_id=event_id,
            checkin_time=now,
            distance_meters=round(distance, 1),
            accuracy_meters=round(req.accuracy, 1),
            points_awarded=points_awarded,
            total_green_points=total_pts,
            daily_points_earned=earned_today + points_awarded,
            daily_points_cap=DAILY_GP_CAP,
        )

    # ------------------------------------------------------------------ #
    # Duyệt / Huỷ sự kiện
    # ------------------------------------------------------------------ #
    async def review_event(
        self, event_id: uuid.UUID, admin_id: uuid.UUID, data: EventReviewRequest
    ) -> EventResponse:
        """Quản trị viên duyệt hoặc từ chối sự kiện, đồng thời thông báo cho người tạo."""
        event = await self._get_active_event(event_id)
        if event.status == EventStatus.CANCELLED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện đã bị huỷ nên không thể duyệt.",
            )

        now = datetime.now(timezone.utc)
        event.status = data.status
        if data.status == EventStatus.REJECTED.value:
            event.reject_reason = (data.reject_reason or "").strip() or "Không đạt tiêu chuẩn kiểm duyệt nội dung."
        else:
            event.reject_reason = None
        event.version += 1
        event.updated_at = now

        if data.status == EventStatus.APPROVED.value:
            await self._notify(
                [event.creator_id],
                title="Sự kiện đã được phê duyệt",
                message=f"Sự kiện '{event.title}' đã được duyệt và hiển thị công khai trên Chủ Nhật Xanh.",
                notification_type="EVENT_APPROVED",
                reference_id=str(event_id),
            )
        else:
            await self._notify(
                [event.creator_id],
                title="Sự kiện bị từ chối duyệt",
                message=f"Sự kiện '{event.title}' đã bị từ chối. Lý do: {event.reject_reason}",
                notification_type="EVENT_REJECTED",
                reference_id=str(event_id),
            )

        await self.db.commit()
        await self.db.refresh(event)
        return await self._map_event_dto(event, current_user_id=admin_id)

    async def cancel_event(self, event_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """Huỷ sự kiện (Người tạo hoặc Admin) và thông báo cho toàn bộ người tham gia."""
        event = await self._get_active_event(event_id)
        actor_is_admin = await self.is_admin(user_id)
        if event.creator_id != user_id and not actor_is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người tổ chức sự kiện hoặc Quản trị viên mới có quyền huỷ sự kiện này.",
            )
        if event.status == EventStatus.CANCELLED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện này đã được huỷ trước đó.",
            )
        if is_event_ended(event):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sự kiện đã kết thúc nên không thể huỷ.",
            )

        now = datetime.now(timezone.utc)
        event.status = EventStatus.CANCELLED.value
        event.version += 1
        event.updated_at = now

        notified = await self._notify(
            await self._participant_ids(event_id, exclude=user_id),
            title="Sự kiện bạn tham gia đã bị huỷ",
            message=f"Sự kiện '{event.title}' đã bị huỷ bởi ban tổ chức. Xin lỗi vì sự bất tiện này.",
            notification_type="EVENT_CANCELLED",
            reference_id=str(event_id),
        )

        await self.db.commit()
        return {
            "success": True,
            "message": "Đã huỷ sự kiện thành công.",
            "notified_count": notified,
        }

    # ------------------------------------------------------------------ #
    # Danh sách người tham gia
    # ------------------------------------------------------------------ #
    async def get_event_participants(
        self, event_id: uuid.UUID, viewer_id: Optional[uuid.UUID] = None
    ) -> List[ParticipantItem]:
        """Lấy toàn bộ danh sách người tham gia sự kiện."""
        event = await self._get_active_event(event_id)
        if not await self._can_view(event, viewer_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy sự kiện hoặc sự kiện chưa được phê duyệt.",
            )

        rows = (
            await self.db.execute(
                select(EventParticipant, User)
                .join(User, EventParticipant.user_id == User.user_id)
                .where(EventParticipant.event_id == event_id)
                .order_by(asc(EventParticipant.joined_at))
            )
        ).all()

        return [
            ParticipantItem(
                user_id=p.user_id,
                full_name=u.full_name or "Người tham gia",
                avatar_url=getattr(u, "avatar_url", None),
                joined_at=p.joined_at,
                is_creator=p.is_creator,
            )
            for p, u in rows
        ]

    # ------------------------------------------------------------------ #
    # Mapping DTO (batch, tránh N+1)
    # ------------------------------------------------------------------ #
    async def _map_events(
        self,
        events: Sequence[Event],
        current_user_id: Optional[uuid.UUID] = None,
        include_participants: bool = False,
    ) -> List[EventResponse]:
        if not events:
            return []

        event_ids = [e.event_id for e in events]
        creator_ids = {e.creator_id for e in events if e.creator_id}

        creators: Dict[uuid.UUID, User] = {}
        if creator_ids:
            rows = await self.db.execute(select(User).where(User.user_id.in_(creator_ids)))
            creators = {u.user_id: u for u in rows.scalars().all()}

        participants_map: Dict[uuid.UUID, List[ParticipantItem]] = {}
        if include_participants:
            p_rows = (
                await self.db.execute(
                    select(EventParticipant, User)
                    .join(User, EventParticipant.user_id == User.user_id)
                    .where(EventParticipant.event_id.in_(event_ids))
                    .order_by(asc(EventParticipant.joined_at))
                )
            ).all()
            for p, u in p_rows:
                bucket = participants_map.setdefault(p.event_id, [])
                if len(bucket) < PARTICIPANTS_PREVIEW_LIMIT:
                    bucket.append(
                        ParticipantItem(
                            user_id=p.user_id,
                            full_name=u.full_name or "Người tham gia",
                            avatar_url=getattr(u, "avatar_url", None),
                            joined_at=p.joined_at,
                            is_creator=p.is_creator,
                        )
                    )

        joined: Set[uuid.UUID] = set()
        interested: Set[uuid.UUID] = set()
        checked_in: Set[uuid.UUID] = set()
        if current_user_id:
            joined = set(
                (
                    await self.db.execute(
                        select(EventParticipant.event_id).where(
                            EventParticipant.user_id == current_user_id,
                            EventParticipant.event_id.in_(event_ids),
                        )
                    )
                ).scalars().all()
            )
            interested = set(
                (
                    await self.db.execute(
                        select(EventInterest.event_id).where(
                            EventInterest.user_id == current_user_id,
                            EventInterest.event_id.in_(event_ids),
                        )
                    )
                ).scalars().all()
            )
            checked_in = set(
                (
                    await self.db.execute(
                        select(EventCheckin.event_id).where(
                            EventCheckin.user_id == current_user_id,
                            EventCheckin.event_id.in_(event_ids),
                        )
                    )
                ).scalars().all()
            )

        now = datetime.now(timezone.utc)
        result: List[EventResponse] = []
        for event in events:
            creator = creators.get(event.creator_id)
            result.append(
                EventResponse(
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
                    creator_name=(creator.full_name or "Người tổ chức") if creator else "Quản trị viên",
                    creator_avatar=getattr(creator, "avatar_url", None) if creator else None,
                    status=event.status,
                    reject_reason=event.reject_reason,
                    checkin_radius_meters=event.checkin_radius_meters,
                    created_at=event.created_at,
                    updated_at=event.updated_at,
                    version=event.version,
                    is_ended=is_event_ended(event, now),
                    is_joined=event.event_id in joined,
                    is_interested=event.event_id in interested,
                    is_checked_in=event.event_id in checked_in,
                    participants_preview=participants_map.get(event.event_id, []),
                )
            )
        return result

    async def _map_event_dto(
        self,
        event: Event,
        current_user_id: Optional[uuid.UUID] = None,
        include_participants: bool = False,
    ) -> EventResponse:
        mapped = await self._map_events([event], current_user_id, include_participants)
        return mapped[0]


async def send_due_reminders(db: AsyncSession) -> int:
    """
    Gửi thông báo nhắc nhở trước giờ diễn ra sự kiện (1 giờ và 24 giờ).

    Được gọi định kỳ bởi background task trong ``app.main``. Mỗi cặp
    (người nhận, sự kiện, mốc nhắc) chỉ gửi đúng 1 lần nhờ khoá dedupe
    ``notification_type`` + ``reference_id``.
    """
    now = datetime.now(timezone.utc)
    created = 0

    for hours, notif_type, label in REMINDER_WINDOWS:
        if hours == 1:
            lower, upper = now, now + timedelta(hours=1)
        else:
            lower, upper = now + timedelta(hours=1), now + timedelta(hours=hours)

        events = (
            await db.execute(
                select(Event).where(
                    Event.status == EventStatus.APPROVED.value,
                    Event.is_deleted == False,  # noqa: E712
                    Event.start_time > lower,
                    Event.start_time <= upper,
                )
            )
        ).scalars().all()
        if not events:
            continue

        for event in events:
            reference_id = f"{event.event_id}:{notif_type}"
            recipients = set(
                (
                    await db.execute(
                        select(EventParticipant.user_id).where(
                            EventParticipant.event_id == event.event_id
                        )
                    )
                ).scalars().all()
            )
            if not recipients:
                continue

            already = set(
                (
                    await db.execute(
                        select(Notification.user_id).where(
                            Notification.notification_type == notif_type,
                            Notification.reference_id == reference_id,
                        )
                    )
                ).scalars().all()
            )
            start_display = (_as_utc(event.start_time)).strftime("%H:%M %d/%m/%Y")
            for uid in recipients - already:
                db.add(
                    Notification(
                        notification_id=uuid.uuid4(),
                        user_id=uid,
                        title=f"Nhắc nhở: sự kiện sắp diễn ra ({label})",
                        message=(
                            f"Sự kiện '{event.title}' sẽ bắt đầu lúc {start_display} "
                            f"tại {event.address}. Hãy sắp xếp thời gian tham gia nhé!"
                        ),
                        notification_type=notif_type,
                        reference_id=reference_id,
                        is_read=False,
                    )
                )
                created += 1

    if created:
        await db.commit()
    return created


async def run_event_reminder_worker(interval_seconds: int = 300) -> None:
    """
    Background worker gửi nhắc nhở sự kiện định kỳ (mặc định 5 phút/lần).

    Chạy cùng lifespan của FastAPI, tự nuốt lỗi để không làm sập ứng dụng.
    """
    from app.database import AsyncSessionLocal

    while True:
        try:
            async with AsyncSessionLocal() as db:
                sent = await send_due_reminders(db)
                if sent:
                    print(f"[Event Reminder] Đã gửi {sent} thông báo nhắc nhở sự kiện.")
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # pragma: no cover - phòng vệ runtime
            print(f"[Event Reminder] Bỏ qua chu kỳ do lỗi: {exc}")
        await asyncio.sleep(interval_seconds)






