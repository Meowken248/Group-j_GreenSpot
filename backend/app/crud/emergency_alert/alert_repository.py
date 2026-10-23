"""
Data Access / Persistence Layer cho STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
Triển khai toàn bộ câu truy vấn CSDL 100% Explicit SQL (PostGIS ST_DWithin, ST_Distance, Soft Delete, OCC).
"""

from datetime import datetime
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.emergency_alert.alert_interface import (
    IEmergencyAlertRepository,
    ISafetyCheckRepository,
)
from app.models.emergency_alert.alert import (
    UserDeviceLocation,
    EmergencyBroadcastAlert,
    EmergencyAlertRecipient,
    EmergencySOSSignal,
)
from app.models.emergency_alert.safety_check import (
    UserSafetyCheck,
    SafetyCheckFriendDelivery,
)


class EmergencyAlertRepository(IEmergencyAlertRepository):
    """
    Triển khai các truy vấn SQL tường minh cho Trung tâm phát lệnh cảnh báo & Geofencing
    """

    async def count_users_in_radius(
        self, db: AsyncSession, center_lat: float, center_lng: float, radius_meters: float
    ) -> int:
        """Đếm số lượng người dùng có vị trí trong bán kính ghim phát sóng bằng SQL tường minh."""
        sql = text("""
            SELECT COUNT(DISTINCT l.user_id) AS total_count
            FROM user_device_locations l
            WHERE l.is_active = TRUE
              AND l.deleted_at IS NULL
              AND ST_DWithin(
                  ST_Transform(l.location, 3857),
                  ST_Transform(ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326), 3857),
                  :radius_meters
              )
        """)
        res = await db.execute(
            sql,
            {
                "center_lat": center_lat,
                "center_lng": center_lng,
                "radius_meters": radius_meters,
            },
        )
        row = res.fetchone()
        return int(row[0]) if row and row[0] is not None else 0

    async def get_user_device_locations_in_radius(
        self, db: AsyncSession, center_lat: float, center_lng: float, radius_meters: float
    ) -> List[Tuple[uuid.UUID, float, float, float]]:
        """Lấy danh sách người dùng trong bán kính: (user_id, lat, lng, distance_meters) bằng SQL tường minh."""
        sql = text("""
            SELECT 
                l.user_id,
                l.latitude,
                l.longitude,
                ST_Distance(
                    ST_Transform(l.location, 3857),
                    ST_Transform(ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326), 3857)
                ) AS distance_meters
            FROM user_device_locations l
            WHERE l.is_active = TRUE
              AND l.deleted_at IS NULL
              AND ST_DWithin(
                  ST_Transform(l.location, 3857),
                  ST_Transform(ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326), 3857),
                  :radius_meters
              )
            ORDER BY distance_meters ASC
        """)
        res = await db.execute(
            sql,
            {
                "center_lat": center_lat,
                "center_lng": center_lng,
                "radius_meters": radius_meters,
            },
        )
        rows = res.fetchall()
        return [(r.user_id, float(r.latitude), float(r.longitude), float(r.distance_meters)) for r in rows]

    async def create_broadcast_alert(
        self, db: AsyncSession, alert: EmergencyBroadcastAlert
    ) -> EmergencyBroadcastAlert:
        """Lưu mới lệnh phát sóng cảnh báo khẩn cấp."""
        db.add(alert)
        await db.commit()
        await db.refresh(alert)
        return alert

    async def bulk_create_recipients(
        self, db: AsyncSession, recipients: List[EmergencyAlertRecipient]
    ) -> int:
        """Lưu hàng loạt danh sách người nhận cảnh báo."""
        if not recipients:
            return 0
        for r in recipients:
            db.add(r)
        await db.commit()
        return len(recipients)

    async def get_alert_by_id(
        self, db: AsyncSession, alert_id: uuid.UUID
    ) -> Optional[EmergencyBroadcastAlert]:
        """Truy vấn lệnh cảnh báo theo ID bằng SQL tường minh."""
        sql = text("""
            SELECT 
                a.alert_id,
                a.alert_code,
                a.alert_type,
                a.title,
                a.content,
                a.center_location,
                a.center_latitude,
                a.center_longitude,
                a.radius_meters,
                a.severity_level,
                a.estimated_recipients,
                a.actual_sent_count,
                a.status,
                a.created_by,
                a.broadcasted_at,
                a.version,
                a.deleted_at,
                a.created_at,
                a.updated_at
            FROM emergency_broadcast_alerts a
            WHERE a.alert_id = :alert_id
              AND a.deleted_at IS NULL
        """)
        stmt = select(EmergencyBroadcastAlert).from_statement(sql).params(alert_id=alert_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    async def get_active_alert_covering_location(
        self, db: AsyncSession, lat: float, lng: float
    ) -> Optional[Tuple[EmergencyBroadcastAlert, float]]:
        """Truy vấn cảnh báo khẩn cấp đang kích hoạt bao phủ vị trí người dùng bằng SQL tường minh."""
        sql = text("""
            SELECT 
                a.alert_id,
                ST_Distance(
                    ST_Transform(a.center_location, 3857),
                    ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 3857)
                ) AS distance_to_center_meters
            FROM emergency_broadcast_alerts a
            WHERE a.status = 'BROADCASTED'
              AND a.deleted_at IS NULL
              AND ST_DWithin(
                  ST_Transform(a.center_location, 3857),
                  ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 3857),
                  a.radius_meters
              )
            ORDER BY distance_to_center_meters ASC
            LIMIT 1
        """)
        res = await db.execute(sql, {"lat": lat, "lng": lng})
        row = res.fetchone()
        if not row:
            return None
        alert = await self.get_alert_by_id(db, row.alert_id)
        if not alert:
            return None
        return alert, float(row.distance_to_center_meters)

    async def update_recipient_action(
        self, db: AsyncSession, alert_id: uuid.UUID, user_id: uuid.UUID, action_taken: str
    ) -> None:
        """Cập nhật hành động của người dùng đối với cảnh báo bằng SQL tường minh."""
        sql = text("""
            UPDATE emergency_alert_recipients
            SET action_taken = :action_taken,
                status = :status,
                action_at = NOW(),
                updated_at = NOW()
            WHERE alert_id = :alert_id
              AND user_id = :user_id
        """)
        await db.execute(
            sql,
            {
                "action_taken": action_taken,
                "status": "ACKNOWLEDGED",
                "alert_id": alert_id,
                "user_id": user_id,
            },
        )
        await db.commit()

    async def create_sos_signal(
        self, db: AsyncSession, sos: EmergencySOSSignal
    ) -> EmergencySOSSignal:
        """Tạo tín hiệu cứu nạn khẩn cấp SOS."""
        db.add(sos)
        await db.commit()
        await db.refresh(sos)
        return sos

    async def get_broadcast_history(
        self, db: AsyncSession, limit: int = 20, alert_type: Optional[str] = None
    ) -> List[EmergencyBroadcastAlert]:
        """Lấy danh sách lịch sử phát sóng cảnh báo bằng SQL tường minh."""
        base_sql = """
            SELECT 
                a.alert_id,
                a.alert_code,
                a.alert_type,
                a.title,
                a.content,
                a.center_location,
                a.center_latitude,
                a.center_longitude,
                a.radius_meters,
                a.severity_level,
                a.estimated_recipients,
                a.actual_sent_count,
                a.status,
                a.created_by,
                a.broadcasted_at,
                a.version,
                a.deleted_at,
                a.created_at,
                a.updated_at
            FROM emergency_broadcast_alerts a
            WHERE a.deleted_at IS NULL
        """
        params = {}
        if alert_type:
            base_sql += " AND a.alert_type = :alert_type"
            params["alert_type"] = alert_type.upper()
        base_sql += " ORDER BY a.broadcasted_at DESC LIMIT :limit"
        params["limit"] = limit

        stmt = select(EmergencyBroadcastAlert).from_statement(text(base_sql)).params(**params)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def update_broadcast_alert(
        self, db: AsyncSession, alert: EmergencyBroadcastAlert
    ) -> EmergencyBroadcastAlert:
        """Cập nhật thông tin / trạng thái lệnh cảnh báo (OCC check)."""
        db.add(alert)
        await db.commit()
        await db.refresh(alert)
        return alert

    async def upsert_user_device_location(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        lat: float,
        lng: float,
        address_text: Optional[str] = None,
        district: Optional[str] = None,
        ward: Optional[str] = None,
    ) -> UserDeviceLocation:
        """Cập nhật hoặc tạo mới vị trí định vị của thiết bị người dùng."""
        check_sql = text("""
            SELECT 
                l.location_id,
                l.user_id,
                l.location,
                l.latitude,
                l.longitude,
                l.address_text,
                l.district,
                l.ward,
                l.is_active,
                l.last_ping_at,
                l.deleted_at,
                l.created_at,
                l.updated_at
            FROM user_device_locations l
            WHERE l.user_id = :user_id
              AND l.deleted_at IS NULL
            LIMIT 1
        """)
        stmt = select(UserDeviceLocation).from_statement(check_sql).params(user_id=user_id)
        res = await db.execute(stmt)
        loc = res.scalars().first()

        point_wkt = f"SRID=4326;POINT({lng} {lat})"
        if loc:
            loc.latitude = lat
            loc.longitude = lng
            loc.location = point_wkt
            if address_text:
                loc.address_text = address_text
            if district:
                loc.district = district
            if ward:
                loc.ward = ward
            loc.last_ping_at = datetime.utcnow()
            loc.is_active = True
        else:
            loc = UserDeviceLocation(
                user_id=user_id,
                latitude=lat,
                longitude=lng,
                location=point_wkt,
                address_text=address_text,
                district=district,
                ward=ward,
                is_active=True,
            )
            db.add(loc)
        await db.commit()
        await db.refresh(loc)
        return loc


class SafetyCheckRepository(ISafetyCheckRepository):
    """
    Triển khai các truy vấn SQL tường minh cho nghiệp vụ Community Disaster Safety Check
    """

    async def get_friends_for_safety_check(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> List[dict]:
        """Truy vấn danh sách bạn bè 2 chiều kết nối từ bảng friendships bằng SQL tường minh."""
        sql = text("""
            SELECT 
                u.user_id,
                u.full_name,
                u.avatar_url
            FROM friendships f
            JOIN users u ON (
                (f.user_id_1 = :user_id AND f.user_id_2 = u.user_id) OR
                (f.user_id_2 = :user_id AND f.user_id_1 = u.user_id)
            )
            WHERE f.deleted_at IS NULL
              AND u.deleted_at IS NULL
            ORDER BY u.full_name ASC
        """)
        res = await db.execute(sql, {"user_id": user_id})
        rows = res.fetchall()
        friends = []
        for r in rows:
            friends.append({
                "user_id": r.user_id,
                "full_name": r.full_name,
                "avatar_url": r.avatar_url,
                "is_selected": True,
                "push_notification_enabled": True,
            })
        return friends

    async def create_safety_check(
        self, db: AsyncSession, check: UserSafetyCheck
    ) -> UserSafetyCheck:
        """Lưu lượt báo an toàn của công dân."""
        db.add(check)
        await db.commit()
        await db.refresh(check)
        return check

    async def bulk_create_friend_deliveries(
        self, db: AsyncSession, deliveries: List[SafetyCheckFriendDelivery]
    ) -> int:
        """Lưu danh sách phân phối thông báo đến bạn bè."""
        if not deliveries:
            return 0
        for d in deliveries:
            db.add(d)
        await db.commit()
        return len(deliveries)

    async def get_latest_safety_check(
        self, db: AsyncSession, user_id: uuid.UUID, alert_id: Optional[uuid.UUID] = None
    ) -> Optional[UserSafetyCheck]:
        """Kiểm tra lượt báo an toàn gần nhất của người dùng bằng SQL tường minh."""
        base_sql = """
            SELECT 
                c.check_id,
                c.user_id,
                c.alert_id,
                c.is_safe,
                c.status_message,
                c.latitude,
                c.longitude,
                c.location_address,
                c.shared_with_count,
                c.sms_fallback_count,
                c.version,
                c.deleted_at,
                c.created_at,
                c.updated_at
            FROM user_safety_checks c
            WHERE c.user_id = :user_id
              AND c.deleted_at IS NULL
        """
        params = {"user_id": user_id}
        if alert_id:
            base_sql += " AND c.alert_id = :alert_id"
            params["alert_id"] = alert_id
        base_sql += " ORDER BY c.created_at DESC LIMIT 1"

        stmt = select(UserSafetyCheck).from_statement(text(base_sql)).params(**params)
        res = await db.execute(stmt)
        return res.scalars().first()
