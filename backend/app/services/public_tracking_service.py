import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.alert_notification import (
    IncidentSubscription,
    IncidentVerification,
)
from app.models.incident import Incident, IncidentMedia, WasteCategory
from app.schemas.alert_notification import (
    PublicIncidentDetailResponse,
    PublicSubscribeRequest,
    PublicVerificationRequest,
    TimelineStep,
)


def mask_phone_number(phone: Optional[str]) -> Optional[str]:
    if not phone or len(phone) < 7:
        return "090****567"
    return phone[:3] + "****" + phone[-3:]


class PublicTrackingService:
    @staticmethod
    async def track_incident(
        db: AsyncSession,
        tracking_code: str,
    ) -> PublicIncidentDetailResponse:
        # TRK_001: Mã tra cứu để trống
        if not tracking_code or not tracking_code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TRK_001: Vui lòng nhập mã theo dõi sự cố cần tra cứu.",
            )

        cleaned_code = tracking_code.strip().upper()

        # TRK_002: Định dạng mã không đúng chuẩn (khớp tiền tố INC- và ký tự hợp lệ)
        if not re.match(r"^INC-[A-Za-z0-9_-]{3,30}$", cleaned_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TRK_002: Mã sự cố không đúng định dạng chuẩn (Ví dụ đúng: INC-2026-0042).",
            )

        stmt = (
            select(Incident)
            .where(func.upper(Incident.tracking_code) == cleaned_code)
        )
        incident = (await db.execute(stmt)).scalar_one_or_none()

        # TRK_003: Không tìm thấy hồ sơ
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="TRK_003: Không tìm thấy hồ sơ sự cố tương ứng với mã đã nhập.",
            )

        # TRK_004: Hồ sơ bị ẩn hoặc bảo mật nghiệp vụ
        if incident.status in ["HIDDEN", "CONFIDENTIAL", "LOCKED"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TRK_004: Hồ sơ này đang trong quá trình bảo mật nghiệp vụ kiểm tra.",
            )

        # Lấy thông tin phân loại
        cat_stmt = select(WasteCategory).where(WasteCategory.category_id == incident.category_id)
        category = (await db.execute(cat_stmt)).scalar_one_or_none()
        category_name = category.name if category else "Rác thải sinh hoạt đô thị"
        category_code = category.category_code if category else "GENERAL"

        # Lấy media Before & After
        media_stmt = select(IncidentMedia).where(IncidentMedia.incident_id == incident.incident_id)
        media_records = (await db.execute(media_stmt)).scalars().all()

        before_images = [m.file_url for m in media_records if m.phase == "BEFORE" or not m.phase]
        after_images = [m.file_url for m in media_records if m.phase == "AFTER"]

        # Nếu chưa có ảnh trong media, tạo ảnh mô phỏng thực tế nếu cần
        if not before_images:
            before_images = ["https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80"]
        if incident.status in ["RESOLVED", "CLOSED"] and not after_images:
            after_images = ["https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"]

        # Xây dựng các chặng tiến trình (Timeline Stepper)
        status_upper = incident.status.upper()
        is_step1_done = True
        is_step2_done = status_upper in ["IN_PROGRESS", "ASSIGNED", "PROCESSING", "RESOLVED", "CLOSED"]
        is_step3_done = status_upper in ["PROCESSING", "RESOLVED", "CLOSED"]
        is_step4_done = status_upper in ["RESOLVED", "CLOSED"]

        timeline = [
            TimelineStep(
                step_key="RECEIVED",
                title="1. Đã Tiếp Nhận Báo Cáo",
                is_completed=is_step1_done,
                is_current=status_upper == "PENDING",
                timestamp=incident.created_at,
                description="Hệ thống đã ghi nhận tọa độ GPS và hình ảnh phản ánh từ người dân.",
            ),
            TimelineStep(
                step_key="ASSIGNED",
                title="2. Khảo Sát & Phân Công",
                is_completed=is_step2_done,
                is_current=status_upper in ["IN_PROGRESS", "ASSIGNED"],
                timestamp=incident.created_at,
                description="Hồ sơ được chuyển giao cho Đội Vệ sinh Môi trường phụ trách địa bàn.",
            ),
            TimelineStep(
                step_key="IN_PROGRESS",
                title="3. Đang Triển Khai Xử Lý",
                is_completed=is_step3_done,
                is_current=status_upper == "PROCESSING",
                timestamp=incident.resolved_at or incident.created_at,
                description="Công nhân và phương tiện chuyên dụng đang thu gom, dọn dẹp tại hiện trường.",
            ),
            TimelineStep(
                step_key="RESOLVED",
                title="4. Hoàn Thành Nghiệm Thu",
                is_completed=is_step4_done,
                is_current=status_upper in ["RESOLVED", "CLOSED"],
                timestamp=incident.resolved_at,
                description="Hiện trường đã được thu dọn sạch sẽ, chụp ảnh đối chứng After và nghiệm thu.",
            ),
        ]

        # Kiểm tra SLA
        is_sla_met: Optional[bool] = None
        if incident.sla_deadline and incident.resolved_at:
            is_sla_met = incident.resolved_at <= incident.sla_deadline
        elif incident.sla_deadline:
            is_sla_met = datetime.now(timezone.utc) <= incident.sla_deadline

        # Thống kê kiểm chứng cộng đồng
        verif_clean_stmt = select(func.count()).where(
            IncidentVerification.incident_id == incident.incident_id,
            IncidentVerification.is_clean_confirmed == True,
        )
        clean_count = (await db.execute(verif_clean_stmt)).scalar() or 0

        verif_dirty_stmt = select(func.count()).where(
            IncidentVerification.incident_id == incident.incident_id,
            IncidentVerification.is_clean_confirmed == False,
        )
        dirty_count = (await db.execute(verif_dirty_stmt)).scalar() or 0

        official_feedback = (
            f"UBND & Công ty TNHH MTV Môi trường Đô thị đã nghiệm thu dọn dẹp điểm rác tại {incident.address_text}. "
            f"Cảm ơn người dân đã đồng hành giám sát vì môi trường xanh - sạch - đẹp."
            if is_step4_done
            else "Đang được tổ chức thu gom đúng quy chuẩn đô thị."
        )

        return PublicIncidentDetailResponse(
            incident_id=incident.incident_id,
            tracking_code=incident.tracking_code,
            title=incident.title,
            description=incident.description,
            category_name=category_name,
            category_code=category_code,
            severity=incident.severity,
            status=incident.status,
            address_text=incident.address_text,
            latitude=float(incident.latitude),
            longitude=float(incident.longitude),
            reported_at=incident.created_at,
            sla_deadline=incident.sla_deadline,
            resolved_at=incident.resolved_at,
            is_sla_met=is_sla_met,
            reporter_phone_masked=mask_phone_number(incident.reporter_phone_masked),
            before_images=before_images,
            after_images=after_images,
            timeline=timeline,
            official_feedback=official_feedback,
            verification_stats={"clean_count": clean_count, "dirty_count": dirty_count},
        )

    @staticmethod
    async def subscribe_incident(
        db: AsyncSession,
        req: PublicSubscribeRequest,
    ) -> IncidentSubscription:
        cleaned_code = req.tracking_code.strip().upper()
        stmt = select(Incident).where(func.upper(Incident.tracking_code) == cleaned_code)
        incident = (await db.execute(stmt)).scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mã sự cố cần đăng ký theo dõi")

        sub = IncidentSubscription(
            incident_id=incident.incident_id,
            contact_type=req.contact_type.upper(),
            contact_value=req.contact_value.strip(),
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return sub

    @staticmethod
    async def verify_incident(
        db: AsyncSession,
        req: PublicVerificationRequest,
        client_ip: Optional[str] = None,
    ) -> IncidentVerification:
        cleaned_code = req.tracking_code.strip().upper()
        stmt = select(Incident).where(func.upper(Incident.tracking_code) == cleaned_code)
        incident = (await db.execute(stmt)).scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mã sự cố cần kiểm chứng")

        verif = IncidentVerification(
            incident_id=incident.incident_id,
            is_clean_confirmed=req.is_clean_confirmed,
            comment=req.comment.strip() if req.comment else None,
            citizen_ip=client_ip,
            created_at=datetime.now(timezone.utc),
        )
        db.add(verif)
        await db.commit()
        await db.refresh(verif)
        return verif
