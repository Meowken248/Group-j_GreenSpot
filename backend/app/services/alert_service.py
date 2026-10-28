import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.alert_notification import (
    AlertSeverity,
    AlertStatus,
    EnvironmentalAlert,
)
from app.schemas.alert_notification import (
    AlertCreateRequest,
    AlertResolveRequest,
    AlertRevokeRequest,
    AlertTemplate,
    AlertUpdateRequest,
)


STANDARD_ALERT_TEMPLATES: List[AlertTemplate] = [
    AlertTemplate(
        code="TMP_PM25_HIGH",
        title="Cảnh báo nồng độ bụi mịn PM2.5 vượt ngưỡng an toàn",
        category="AIR",
        severity_level="ORANGE",
        default_description="Chỉ số chất lượng không khí AQI đo được tại các trạm quan trắc vượt mức 175, nồng độ bụi mịn PM2.5 tăng đột biến do hiện tượng nghịch nhiệt và phương tiện giao thông gia tăng.",
        default_safety_advice="Người già, trẻ em và người có bệnh hô hấp hạn chế ra đường; đeo khẩu trang lọc bụi N95 hoặc tương đương khi tham gia giao thông; đóng kín cửa sổ nhà ở.",
    ),
    AlertTemplate(
        code="TMP_LANDFILL_FIRE",
        title="Cảnh báo khói độc do hỏa hoạn tại khu xử lý rác thải",
        category="HAZARDOUS",
        severity_level="RED",
        default_description="Phát hiện sự cố cháy âm ỉ tại bãi tập kết rác, sinh nhiều khói đen và khí độc SO2, CO có mùi khét nồng nặc lan rộng theo hướng gió Đông Nam.",
        default_safety_advice="Người dân khu vực lân cận di tản tạm thời khỏi vùng tỏa khói; sử dụng khăn ướt bịt mũi miệng; tắt máy điều hòa lấy gió ngoài; lập tức báo tin khẩn cấp cho cơ quan y tế nếu thấy khó thở.",
    ),
    AlertTemplate(
        code="TMP_WATER_POLLUTION",
        title="Cảnh báo ô nhiễm nguồn nước kênh rạch bất thường",
        category="WATER",
        severity_level="YELLOW",
        default_description="Nguồn nước kênh xuất hiện màu đen đục và váng dầu, chỉ số oxy hòa tan (DO) giảm sâu, nghi vấn có sự cố rò rỉ nước thải chưa qua xử lý.",
        default_safety_advice="Tuyệt đối không lấy nước kênh phục vụ tưới tiêu, giặt giũ hoặc nuôi trồng thủy sản; phối hợp báo cáo khi phát hiện điểm xả thải lén lút.",
    ),
    AlertTemplate(
        code="TMP_ORGANIC_ODOR",
        title="Cảnh báo mùi hôi phát tán từ trạm trung chuyển rác",
        category="WASTE",
        severity_level="YELLOW",
        default_description="Do lượng rác thải tồn đọng tăng cao sau các đợt mưa lớn, trạm trung chuyển rác phát sinh mùi hôi hữu cơ ảnh hưởng khu dân cư bán kính 500m.",
        default_safety_advice="Đơn vị vận hành đang tăng cường phun chế phẩm khử mùi vi sinh; người dân đóng cửa hướng gió chính trong khung giờ cao điểm 18h - 21h.",
    ),
]


class AlertService:
    @staticmethod
    def get_templates() -> List[AlertTemplate]:
        return STANDARD_ALERT_TEMPLATES

    @staticmethod
    async def generate_alert_code(db: AsyncSession) -> str:
        current_year = datetime.now(timezone.utc).year
        stmt = select(func.count(EnvironmentalAlert.alert_id))
        count = (await db.execute(stmt)).scalar() or 0
        return f"ALT-{current_year}-{(count + 1):04d}"

    @staticmethod
    async def create_alert(
        db: AsyncSession,
        req: AlertCreateRequest,
        creator_id: Optional[uuid.UUID] = None,
    ) -> EnvironmentalAlert:
        # Ràng buộc nghiệp vụ theo chuẩn SRS Bùi Nguyễn Minh Quân:
        # WARN_001: Tiêu đề bản tin cảnh báo phải có độ dài từ 10 ký tự trở lên
        if not req.title or len(req.title.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="WARN_001: Tiêu đề bản tin cảnh báo phải có độ dài từ 10 ký tự trở lên.",
            )

        # WARN_002: Bắt buộc chọn 1 trong 3 mức Vàng/Cam/Đỏ
        valid_severities = [s.value for s in AlertSeverity]
        if req.severity_level.upper() not in valid_severities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="WARN_002: Vui lòng chọn mức độ cảnh báo phù hợp (YELLOW, ORANGE, RED).",
            )

        # WARN_003: Danh sách địa bàn phải có ít nhất 1 đơn vị khi phát hành
        if req.publish_now and (not req.affected_districts or len(req.affected_districts) == 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="WARN_003: Vui lòng chọn ít nhất một Phường/Xã chịu ảnh hưởng.",
            )

        # WARN_004: Bắt buộc nhập khuyến cáo phòng hộ cho dân (tối thiểu 10 ký tự)
        if not req.safety_advice or len(req.safety_advice.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="WARN_004: Nội dung khuyến cáo an toàn cho người dân không được để trống.",
            )

        alert_code = await AlertService.generate_alert_code(db)
        districts_json = json.dumps(req.affected_districts or [], ensure_ascii=False)
        
        now = datetime.now(timezone.utc)
        initial_status = AlertStatus.ACTIVE.value if req.publish_now else AlertStatus.DRAFT.value
        published_at = now if req.publish_now else None

        alert = EnvironmentalAlert(
            alert_code=alert_code,
            title=req.title.strip(),
            category=req.category.upper(),
            severity_level=req.severity_level.upper(),
            status=initial_status,
            affected_districts=districts_json,
            description=req.description.strip(),
            safety_advice=req.safety_advice.strip(),
            template_code=req.template_code,
            expires_at=req.expires_at,
            published_at=published_at,
            created_by=creator_id,
            updated_by=creator_id,
        )
        db.add(alert)
        await db.commit()
        await db.refresh(alert)

        # Nếu phát hành ngay lập tức -> tự động điều phối Push Notifications (Chức năng 29)
        if req.publish_now:
            from app.services.notification_service import NotificationService
            await NotificationService.dispatch_alert_push(db, alert)

        return alert

    @staticmethod
    async def get_alert(db: AsyncSession, alert_id: uuid.UUID) -> EnvironmentalAlert:
        stmt = select(EnvironmentalAlert).where(EnvironmentalAlert.alert_id == alert_id)
        alert = (await db.execute(stmt)).scalar_one_or_none()
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản tin cảnh báo")
        return alert

    @staticmethod
    async def list_alerts(
        db: AsyncSession,
        status_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        district_keyword: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[EnvironmentalAlert], int, dict]:
        stmt = select(EnvironmentalAlert)

        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(EnvironmentalAlert.status == status_filter.upper())
        if severity_filter and severity_filter.upper() != "ALL":
            stmt = stmt.where(EnvironmentalAlert.severity_level == severity_filter.upper())
        if category_filter and category_filter.upper() != "ALL":
            stmt = stmt.where(EnvironmentalAlert.category == category_filter.upper())
        if district_keyword:
            stmt = stmt.where(EnvironmentalAlert.affected_districts.ilike(f"%{district_keyword}%"))
        if search_query:
            stmt = stmt.where(
                or_(
                    EnvironmentalAlert.title.ilike(f"%{search_query}%"),
                    EnvironmentalAlert.description.ilike(f"%{search_query}%"),
                    EnvironmentalAlert.alert_code.ilike(f"%{search_query}%"),
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(desc(EnvironmentalAlert.created_at)).offset(skip).limit(limit)
        items = list((await db.execute(stmt)).scalars().all())

        # Thống kê nhanh trạng thái
        stats_stmt = select(
            EnvironmentalAlert.status,
            func.count(EnvironmentalAlert.alert_id),
        ).group_by(EnvironmentalAlert.status)
        stats_rows = (await db.execute(stats_stmt)).all()
        counts_map = {row[0]: row[1] for row in stats_rows}

        stats = {
            "active_count": counts_map.get(AlertStatus.ACTIVE.value, 0),
            "draft_count": counts_map.get(AlertStatus.DRAFT.value, 0),
            "resolved_count": counts_map.get(AlertStatus.RESOLVED.value, 0),
            "revoked_count": counts_map.get(AlertStatus.REVOKED.value, 0),
        }

        return items, total, stats

    @staticmethod
    async def update_alert(
        db: AsyncSession,
        alert_id: uuid.UUID,
        req: AlertUpdateRequest,
        editor_id: Optional[uuid.UUID] = None,
    ) -> EnvironmentalAlert:
        alert = await AlertService.get_alert(db, alert_id)
        if alert.status in [AlertStatus.RESOLVED.value, AlertStatus.REVOKED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể chỉnh sửa bản tin đã đóng an toàn hoặc đã bị thu hồi",
            )

        if req.title is not None:
            alert.title = req.title.strip()
        if req.category is not None:
            alert.category = req.category.upper()
        if req.severity_level is not None:
            alert.severity_level = req.severity_level.upper()
        if req.description is not None:
            alert.description = req.description.strip()
        if req.safety_advice is not None:
            alert.safety_advice = req.safety_advice.strip()
        if req.affected_districts is not None:
            alert.affected_districts = json.dumps(req.affected_districts, ensure_ascii=False)
        if req.expires_at is not None:
            alert.expires_at = req.expires_at

        # Nếu có đính chính cho bản tin đang ACTIVE
        if alert.status == AlertStatus.ACTIVE.value and req.amendment_note:
            now_str = datetime.now(timezone.utc).strftime("%H:%M %d/%m/%Y")
            alert.description += f"\n\n[ĐÍNH CHÍNH LÚC {now_str}]: {req.amendment_note.strip()}"

        alert.updated_by = editor_id
        await db.commit()
        await db.refresh(alert)
        return alert

    @staticmethod
    async def publish_alert(
        db: AsyncSession,
        alert_id: uuid.UUID,
        publisher_id: Optional[uuid.UUID] = None,
    ) -> EnvironmentalAlert:
        alert = await AlertService.get_alert(db, alert_id)
        if alert.status == AlertStatus.ACTIVE.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bản tin này đang có hiệu lực hoạt động rồi")
        if alert.status in [AlertStatus.RESOLVED.value, AlertStatus.REVOKED.value]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tái phát hành bản tin đã đóng hoặc đã thu hồi")

        districts = json.loads(alert.affected_districts) if alert.affected_districts else []
        if not districts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="WARN_003: Vui lòng chọn ít nhất một Phường/Xã chịu ảnh hưởng.",
            )

        alert.status = AlertStatus.ACTIVE.value
        alert.published_at = datetime.now(timezone.utc)
        alert.updated_by = publisher_id
        await db.commit()
        await db.refresh(alert)

        # Điều phối Push Notifications
        from app.services.notification_service import NotificationService
        await NotificationService.dispatch_alert_push(db, alert)

        return alert

    @staticmethod
    async def resolve_alert(
        db: AsyncSession,
        alert_id: uuid.UUID,
        req: AlertResolveRequest,
        resolver_id: Optional[uuid.UUID] = None,
    ) -> EnvironmentalAlert:
        alert = await AlertService.get_alert(db, alert_id)
        if alert.status != AlertStatus.ACTIVE.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chỉ có thể công bố an toàn cho bản tin đang ACTIVE")

        alert.status = AlertStatus.RESOLVED.value
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_note = req.resolved_note.strip()
        alert.updated_by = resolver_id
        await db.commit()
        await db.refresh(alert)

        # Gửi thông báo hạ cảnh báo (All-Clear Notification)
        from app.services.notification_service import NotificationService
        await NotificationService.dispatch_all_clear_push(db, alert)

        return alert

    @staticmethod
    async def revoke_alert(
        db: AsyncSession,
        alert_id: uuid.UUID,
        req: AlertRevokeRequest,
        revoker_id: Optional[uuid.UUID] = None,
    ) -> EnvironmentalAlert:
        alert = await AlertService.get_alert(db, alert_id)
        if alert.status == AlertStatus.REVOKED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bản tin này đã được thu hồi trước đó")

        alert.status = AlertStatus.REVOKED.value
        alert.revoked_at = datetime.now(timezone.utc)
        alert.revoke_reason = req.revoke_reason.strip()
        alert.updated_by = revoker_id
        await db.commit()
        await db.refresh(alert)
        return alert
