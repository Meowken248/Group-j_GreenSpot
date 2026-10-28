import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, WasteCategory
from app.models.alert_notification import Notification, NotificationType
from app.models.system_config import SystemConfig
from app.models.audit import AuditLog
from app.schemas.sos_alert import (
    SOSSubmitRequest,
    SOSSubmitResponse,
    SOSBroadcastBannerStatus,
    ToggleSOSBannerRequest,
)

CONFIG_KEY_SOS_BANNER = "SOS_EMERGENCY_BROADCAST_BANNER"
CONFIG_KEY_HOTLINE = "SYSTEM_EMERGENCY_HOTLINE"


class SOSService:
    @staticmethod
    async def submit_sos_incident(
        db: AsyncSession,
        req: SOSSubmitRequest,
        client_ip: Optional[str] = "127.0.0.1",
    ) -> SOSSubmitResponse:
        # 1. Kiểm tra tọa độ GPS (SOS_002)
        if req.latitude is None or req.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SOS_002: Vui lòng cho phép định vị vị trí hiện tại của sự cố.",
            )

        # 2. Rate-limit: Tối đa 1 tin SOS / 5 phút trên 1 SĐT (SOS_003)
        five_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        recent_stmt = select(Incident).where(
            Incident.reporter_phone_masked == req.phone_number,
            Incident.created_at >= five_mins_ago,
            Incident.severity == "CRITICAL",
        )
        recent_sos = (await db.execute(recent_stmt)).first()
        if recent_sos:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="SOS_003: Bạn vừa gửi tin khẩn cấp. Cán bộ trực ban đang xử lý liên hệ.",
            )

        # 3. Lấy category mặc định cho sự cố khẩn cấp
        cat_stmt = select(WasteCategory).where(WasteCategory.category_code == "NGUY_HAI")
        cat = (await db.execute(cat_stmt)).scalar_one_or_none()
        if not cat:
            cat_stmt_fallback = select(WasteCategory).limit(1)
            cat = (await db.execute(cat_stmt_fallback)).scalar_one_or_none()
        category_id = cat.category_id if cat else 1

        # 4. Sinh mã theo dõi khẩn cấp (VD: SOS-2026-0042)
        current_year = datetime.now(timezone.utc).year
        cnt_stmt = select(func.count(Incident.incident_id)).where(Incident.severity == "CRITICAL")
        sos_count = (await db.execute(cnt_stmt)).scalar() or 0
        tracking_code = f"SOS-{current_year}-{(sos_count + 1):04d}"

        # 5. Phân loại tiêu đề sự cố theo loại nguy cấp
        type_titles = {
            "CHAY_DOC": "Hỏa hoạn phát sinh khói độc hại cấp bách",
            "TRAN_HOA_CHAT": "Tràn / rò rỉ hóa chất độc hại đe dọa khu dân cư",
            "NUOC_DOC": "Xả trộm nước thải công nghiệp đen kịt nồng nặc mùi hóa chất",
            "KHAC": "Sự cố ô nhiễm môi trường đặc biệt khẩn cấp",
        }
        title = type_titles.get(req.incident_type, "Sự cố ô nhiễm môi trường nguy cấp")

        incident_id = uuid.uuid4()
        location_point = WKTElement(f"POINT({req.longitude} {req.latitude})", srid=4326)

        incident = Incident(
            incident_id=incident_id,
            tracking_code=tracking_code,
            category_id=category_id,
            title=f"[SOS] {title}",
            description=f"Tín hiệu cứu nạn khẩn cấp từ số {req.phone_number}. Ghi chú: {req.note or 'Không có'}. Địa chỉ: {req.address_text or 'Tọa độ GPS'}",
            address_text=req.address_text or f"Tọa độ ({req.latitude:.5f}, {req.longitude:.5f})",
            location=location_point,
            latitude=req.latitude,
            longitude=req.longitude,
            severity="CRITICAL",
            status="PENDING",
            risk_score=95.0,
            is_anonymous=False,
            reporter_phone_masked=req.phone_number,
        )
        db.add(incident)

        # 6. Gửi thông báo trực ban Notification khẩn cấp
        notif = Notification(
            notification_id=uuid.uuid4(),
            incident_id=incident_id,
            notification_type=NotificationType.POLLUTION_ALERT.value,
            severity="CRITICAL",
            title=f"🚨 TÍN HIỆU SOS KHẨN CẤP: {tracking_code}",
            message=f"Công dân báo tin nguy cấp tại {incident.address_text}. SĐT: {req.phone_number}. Trực ban xử lý ngay!",
            target_url=f"/tracking/{tracking_code}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(notif)

        # 7. Ghi AuditLog
        audit = AuditLog(
            action="SUBMIT_SOS_INCIDENT",
            table_name="incidents",
            record_id=str(incident_id),
            new_data={"tracking_code": tracking_code, "phone": req.phone_number, "type": req.incident_type},
            ip_address=client_ip,
        )
        db.add(audit)

        await db.commit()
        await db.refresh(incident)

        return SOSSubmitResponse(
            success=True,
            incident_id=incident_id,
            tracking_code=tracking_code,
            message="Tín hiệu cứu nạn SOS đã được chuyển ưu tiên số 1 tới Ban trực ban khẩn cấp đô thị. Cán bộ sẽ liên hệ lại ngay!",
            severity="CRITICAL",
            submitted_at=datetime.now(timezone.utc).strftime("%H:%M:%S %d/%m/%Y"),
            hotline="1800-1090",
        )

    @staticmethod
    async def get_broadcast_banner(db: AsyncSession) -> SOSBroadcastBannerStatus:
        stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_SOS_BANNER)
        row = (await db.execute(stmt)).scalar_one_or_none()

        hl_stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_HOTLINE)
        hl_row = (await db.execute(hl_stmt)).scalar_one_or_none()
        hotline = hl_row.config_value if hl_row else "1800-1090"

        if not row or not row.config_value:
            return SOSBroadcastBannerStatus(is_active=False, hotline=hotline)

        try:
            data = json.loads(row.config_value)
            return SOSBroadcastBannerStatus(
                is_active=data.get("is_active", False),
                title=data.get("title"),
                message=data.get("message"),
                affected_areas=data.get("affected_areas", ["Toàn thành phố"]),
                severity_level=data.get("severity_level", "RED"),
                activated_at=data.get("activated_at"),
                hotline=hotline,
            )
        except Exception:
            return SOSBroadcastBannerStatus(is_active=False, hotline=hotline)

    @staticmethod
    async def toggle_broadcast_banner(
        db: AsyncSession,
        req: ToggleSOSBannerRequest,
        actor_id: Optional[uuid.UUID] = None,
        client_ip: Optional[str] = "127.0.0.1",
    ) -> SOSBroadcastBannerStatus:
        stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_SOS_BANNER)
        cfg = (await db.execute(stmt)).scalar_one_or_none()

        now = datetime.now(timezone.utc)
        payload = {
            "is_active": req.is_active,
            "title": req.title,
            "message": req.message,
            "affected_areas": req.affected_areas,
            "severity_level": req.severity_level or "RED",
            "activated_at": now.strftime("%H:%M %d/%m/%Y") if req.is_active else None,
        }

        if cfg:
            cfg.config_value = json.dumps(payload, ensure_ascii=False)
            cfg.updated_at = now
            cfg.updated_by = actor_id
        else:
            cfg = SystemConfig(
                config_key=CONFIG_KEY_SOS_BANNER,
                config_value=json.dumps(payload, ensure_ascii=False),
                value_type="JSON",
                description="Trạng thái Banner phát sóng cảnh báo khẩn cấp màu đỏ trên đầu cổng thông tin",
                is_public=True,
                updated_at=now,
                updated_by=actor_id,
            )
            db.add(cfg)

        # Ghi AuditLog
        audit = AuditLog(
            user_id=actor_id,
            action="TOGGLE_SOS_BROADCAST_BANNER",
            table_name="system_configs",
            record_id="SOS_BANNER",
            new_data=payload,
            ip_address=client_ip,
        )
        db.add(audit)

        await db.commit()

        hl_stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_HOTLINE)
        hl_row = (await db.execute(hl_stmt)).scalar_one_or_none()
        hotline = hl_row.config_value if hl_row else "1800-1090"

        return SOSBroadcastBannerStatus(
            is_active=req.is_active,
            title=req.title,
            message=req.message,
            affected_areas=req.affected_areas,
            severity_level=req.severity_level,
            activated_at=payload["activated_at"],
            hotline=hotline,
        )

    @staticmethod
    async def get_recent_sos_incidents(db: AsyncSession, limit: int = 10):
        stmt = (
            select(Incident)
            .where(Incident.severity == "CRITICAL")
            .order_by(desc(Incident.created_at))
            .limit(limit)
        )
        res = await db.execute(stmt)
        return res.scalars().all()
