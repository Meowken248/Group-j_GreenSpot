import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy import desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.alert_notification import (
    EnvironmentalAlert,
    Notification,
    NotificationType,
)
from app.models.rbac import User


class NotificationService:
    @staticmethod
    async def dispatch_alert_push(
        db: AsyncSession,
        alert: EnvironmentalAlert,
    ) -> List[Notification]:
        """
        Điều phối thông báo đẩy khi có bản tin cảnh báo mới phát hành.
        Tạo thông báo công khai cho toàn thể người dùng và thông báo riêng cho cư dân.
        Áp dụng quy tắc PUSH_001 (Deduplication trong 5 phút).
        """
        # PUSH_001: Deduplication không gửi 2 tin cùng nội dung/alert trong 5 phút
        five_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        dedup_stmt = select(Notification).where(
            Notification.alert_id == alert.alert_id,
            Notification.created_at >= five_mins_ago,
        ).limit(1)
        existing_recent = (await db.execute(dedup_stmt)).scalar_one_or_none()
        if existing_recent:
            # Thông báo cảnh báo trùng lặp đã được loại trừ tự động (PUSH_001)
            return []

        severity_map = {
            "YELLOW": "WARNING",
            "ORANGE": "WARNING",
            "RED": "CRITICAL",
        }
        mapped_severity = severity_map.get(alert.severity_level, "WARNING")

        notifications_created: List[Notification] = []

        # 1. Tạo thông báo phát thanh chung cho Cổng thông tin (user_id = None)
        public_noti = Notification(
            user_id=None,
            alert_id=alert.alert_id,
            notification_type=NotificationType.POLLUTION_ALERT.value,
            severity=mapped_severity,
            title=f"[{alert.severity_level}] {alert.title}",
            message=alert.description[:200] + ("..." if len(alert.description) > 200 else ""),
            target_url="#alerts",
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(public_noti)
        notifications_created.append(public_noti)

        # 2. Quét người dùng đang hoạt động để gửi thông báo vào hòm thư cá nhân (In-App Push)
        user_stmt = select(User.user_id).where(User.status == "ACTIVE").limit(100)
        active_user_ids = (await db.execute(user_stmt)).scalars().all()

        for uid in active_user_ids:
            user_noti = Notification(
                user_id=uid,
                alert_id=alert.alert_id,
                notification_type=NotificationType.POLLUTION_ALERT.value,
                severity=mapped_severity,
                title=f"[{alert.severity_level}] {alert.title}",
                message=alert.description[:200] + ("..." if len(alert.description) > 200 else ""),
                target_url="#alerts",
                is_read=False,
                created_at=datetime.now(timezone.utc),
            )
            db.add(user_noti)
            notifications_created.append(user_noti)

        await db.commit()
        return notifications_created

    @staticmethod
    async def dispatch_all_clear_push(
        db: AsyncSession,
        alert: EnvironmentalAlert,
    ) -> Notification:
        """Thông báo công bố an toàn / hạ cảnh báo ô nhiễm"""
        noti = Notification(
            user_id=None,
            alert_id=alert.alert_id,
            notification_type=NotificationType.POLLUTION_ALERT.value,
            severity="INFO",
            title=f"[AN TOÀN] Kết thúc cảnh báo: {alert.title}",
            message=alert.resolved_note or "Tình hình ô nhiễm đã được kiểm soát và trở lại ngưỡng an toàn.",
            target_url="#alerts",
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(noti)
        await db.commit()
        await db.refresh(noti)
        return noti

    @staticmethod
    async def list_notifications(
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
        only_unread: bool = False,
        limit: int = 20,
        skip: int = 0,
    ) -> Tuple[List[Notification], int, int]:
        """
        Lấy danh sách thông báo cho người dùng (bao gồm thông báo chung và thông báo riêng).
        """
        stmt = select(Notification).where(Notification.is_deleted == False)

        if user_id:
            stmt = stmt.where(or_(Notification.user_id == user_id, Notification.user_id.is_(None)))
        else:
            stmt = stmt.where(Notification.user_id.is_(None))

        if only_unread:
            stmt = stmt.where(Notification.is_read == False)

        # Đếm tổng số
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        # Đếm số tin chưa đọc
        unread_stmt = select(func.count()).select_from(
            select(Notification)
            .where(
                Notification.is_deleted == False,
                Notification.is_read == False,
                or_(Notification.user_id == user_id, Notification.user_id.is_(None)) if user_id else Notification.user_id.is_(None),
            )
            .subquery()
        )
        unread_count = (await db.execute(unread_stmt)).scalar() or 0

        # Lấy danh sách sắp xếp theo thời gian mới nhất
        stmt = stmt.order_by(desc(Notification.created_at)).offset(skip).limit(limit)
        items = list((await db.execute(stmt)).scalars().all())

        return items, unread_count, total

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
        notification_ids: Optional[List[uuid.UUID]] = None,
    ) -> int:
        now = datetime.now(timezone.utc)
        stmt = update(Notification).values(is_read=True, read_at=now)

        if notification_ids:
            stmt = stmt.where(Notification.notification_id.in_(notification_ids))
        elif user_id:
            stmt = stmt.where(or_(Notification.user_id == user_id, Notification.user_id.is_(None)))
        else:
            stmt = stmt.where(Notification.user_id.is_(None))

        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount

    @staticmethod
    async def delete_notification(
        db: AsyncSession,
        notification_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
    ) -> bool:
        stmt = select(Notification).where(Notification.notification_id == notification_id)
        noti = (await db.execute(stmt)).scalar_one_or_none()
        if not noti:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo")

        if user_id and noti.user_id and noti.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="PUSH_003: Thao tác không hợp lệ trên thông báo của tài khoản khác.",
            )

        noti.is_deleted = True
        await db.commit()
        return True

    @staticmethod
    async def get_push_stats(db: AsyncSession) -> dict:
        total_stmt = select(func.count(Notification.notification_id))
        total_sent = (await db.execute(total_stmt)).scalar() or 0

        unread_stmt = select(func.count(Notification.notification_id)).where(Notification.is_read == False)
        unread_count = (await db.execute(unread_stmt)).scalar() or 0

        read_count = total_sent - unread_count
        rate = round((read_count / total_sent * 100), 2) if total_sent > 0 else 0.0

        return {
            "total_notifications_sent": total_sent,
            "unread_count": unread_count,
            "read_count": read_count,
            "open_rate_percentage": rate,
        }
