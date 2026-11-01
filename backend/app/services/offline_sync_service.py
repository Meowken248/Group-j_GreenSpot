import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, IncidentMedia, WasteCategory
from app.models.offline_sync import OfflineSubmission, OfflineMediaUpload
from app.models.rbac import User
from app.models.profile import UserActivity
from app.schemas.offline_sync import (
    OfflineSubmissionRequest,
    OfflineSubmissionResponse,
    OfflineSubmissionStatusResponse,
)
from app.services.incident_service import (
    is_within_hcmc_bounds,
    find_matching_administrative_unit,
    generate_next_tracking_code,
)


async def submit_offline_incident(
    db: AsyncSession,
    data: OfflineSubmissionRequest,
    current_user_id: uuid.UUID,
) -> OfflineSubmissionResponse:
    """
    Tiếp nhận và xử lý phản ánh ngoại tuyến từ hàng đợi gửi (STT 19 - Chế độ Offline-First).
    Đảm bảo tính nguyên tử (Atomic) và chống gửi lặp (Idempotent):
    1. Kiểm tra client_submission_id trong bảng offline_submissions.
    2. Nếu đã tồn tại: trả về kết quả đã xử lý trước đó, không tạo sự cố trùng, không cộng điểm lặp.
    3. Nếu chưa: tạo sự cố mới, lưu bằng chứng media & watermark thời gian chụp, tích điểm Công dân Xanh,
       ghi nhận biên nhận offline_submissions và commit toàn bộ trong 1 transaction duy nhất.
    """
    # 1. Kiểm tra Idempotency: Đã xử lý client_submission_id này chưa?
    existing_sub_stmt = select(OfflineSubmission).where(
        OfflineSubmission.client_submission_id == data.client_submission_id
    )
    existing_sub_res = await db.execute(existing_sub_stmt)
    existing_sub = existing_sub_res.scalar_one_or_none()

    if existing_sub:
        # Nếu đã có bản ghi: kiểm tra quyền sở hữu của user
        if existing_sub.user_id != current_user_id:
            raise PermissionError("Bạn không có quyền truy cập biên nhận phản ánh của tài khoản khác.")

        # Lấy thông tin incident đã tạo
        incident_stmt = select(Incident).where(Incident.incident_id == existing_sub.incident_id)
        incident_res = await db.execute(incident_stmt)
        incident = incident_res.scalar_one_or_none()
        tracking_code = incident.tracking_code if incident else "N/A"

        return OfflineSubmissionResponse(
            submission_id=str(existing_sub.submission_id),
            client_submission_id=existing_sub.client_submission_id,
            incident_id=str(existing_sub.incident_id or ""),
            tracking_code=tracking_code,
            status=existing_sub.status,
            is_duplicate_replay=True,
            points_awarded=0,  # Không cộng lặp điểm
            created_at=existing_sub.created_at,
            message="Yêu cầu đã được hệ thống ghi nhận trước đó (Idempotent Replay).",
        )

    # 2. Kiểm tra toạ độ GPS hợp lệ
    if not is_within_hcmc_bounds(data.latitude, data.longitude):
        raise ValueError("Vị trí nằm ngoài phạm vi tiếp nhận của hệ thống (22 quận/huyện TP.HCM).")

    # 3. Lấy thông tin danh mục sự cố
    cat_stmt = select(WasteCategory).where(WasteCategory.category_id == data.category_id)
    cat_res = await db.execute(cat_stmt)
    category = cat_res.scalar_one_or_none()
    if not category:
        raise ValueError("Loại sự cố rác thải không hợp lệ.")
    if not category.is_active:
        raise ValueError("Danh mục sự cố này hiện đã ngưng tiếp nhận.")

    # 4. Tính toán thời hạn SLA
    now_utc = datetime.now(timezone.utc)
    sla_hours = category.sla_hours or 24
    sla_deadline = now_utc + timedelta(hours=sla_hours)

    # 5. Sinh mã theo dõi duy nhất an toàn đồng thời
    tracking_code = await generate_next_tracking_code(db)

    # 6. Định tuyến đơn vị hành chính qua PostGIS
    unit_id, unit_name = await find_matching_administrative_unit(db, data.latitude, data.longitude)

    # 7. Tạo bản ghi sự cố Incident
    incident_id = uuid.uuid4()
    new_incident = Incident(
        incident_id=incident_id,
        tracking_code=tracking_code,
        reporter_id=current_user_id if not data.is_anonymous else None,
        category_id=category.category_id,
        unit_id=unit_id,
        title=data.title.strip(),
        description=data.description.strip(),
        address_text=data.address_text.strip(),
        latitude=data.latitude,
        longitude=data.longitude,
        location=f"SRID=4326;POINT({data.longitude} {data.latitude})",
        severity=data.severity,
        status="PENDING",
        is_anonymous=data.is_anonymous,
        reporter_phone_masked=(
            f"***{data.reporter_phone[-4:]}" if data.reporter_phone and len(data.reporter_phone) >= 4 else None
        ),
        sla_deadline=sla_deadline,
    )
    db.add(new_incident)
    await db.flush()

    # 8. Lưu media đính kèm và biên nhận offline_media_uploads
    submission_id = uuid.uuid4()
    for m in data.media:
        media_id = uuid.uuid4()
        media_item = IncidentMedia(
            media_id=media_id,
            incident_id=new_incident.incident_id,
            media_type=m.media_type,
            file_url=m.file_url,
            thumbnail_url=m.thumbnail_url or m.file_url,
            file_size_bytes=m.file_size_bytes,
            mime_type=m.mime_type,
            uploader_id=current_user_id,
            phase="BEFORE",
        )
        db.add(media_item)

        # Lưu biên nhận media upload ngoại tuyến
        upload_receipt = OfflineMediaUpload(
            upload_id=uuid.uuid4(),
            submission_id=submission_id,
            client_file_id=m.client_file_id,
            media_type=m.media_type,
            media_id=media_id,
            captured_at=m.captured_at,
            file_url=m.file_url,
            file_hash=m.file_hash,
            file_size_bytes=m.file_size_bytes,
            status="COMPLETED",
        )
        db.add(upload_receipt)

    # 9. Tích lũy điểm thưởng Công dân Xanh (+50 GP theo tiêu chí phản ánh có hình ảnh/âm thanh đầy đủ)
    points_awarded = 50
    user_stmt = select(User).where(User.user_id == current_user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if user:
        user.total_green_points = (user.total_green_points or 0) + points_awarded
        activity = UserActivity(
            activity_id=uuid.uuid4(),
            user_id=user.user_id,
            activity_type="REPORT_INCIDENT",
            title=f"Phản ánh ngoại tuyến: {new_incident.title}",
            description=f"Đồng bộ thành công phản ánh mã {tracking_code} tại {new_incident.address_text}",
            points=points_awarded,
        )
        db.add(activity)

    # 10. Ghi nhận bản ghi biên nhận offline_submissions
    submission_receipt = OfflineSubmission(
        submission_id=submission_id,
        client_submission_id=data.client_submission_id,
        user_id=current_user_id,
        incident_id=new_incident.incident_id,
        idempotency_key=data.idempotency_key,
        status="PROCESSED",
        client_timestamp=data.client_timestamp,
        server_received_at=now_utc,
        synced_at=now_utc,
        response_payload={
            "incident_id": str(new_incident.incident_id),
            "tracking_code": tracking_code,
            "title": new_incident.title,
            "points_awarded": points_awarded,
        },
        version=1,
    )
    db.add(submission_receipt)

    # 11. Commit toàn bộ giao dịch nguyên tử
    await db.commit()
    await db.refresh(new_incident)

    return OfflineSubmissionResponse(
        submission_id=str(submission_receipt.submission_id),
        client_submission_id=submission_receipt.client_submission_id,
        incident_id=str(new_incident.incident_id),
        tracking_code=new_incident.tracking_code,
        status="PROCESSED",
        is_duplicate_replay=False,
        points_awarded=points_awarded,
        created_at=new_incident.created_at or now_utc,
        message=f"Đồng bộ phản ánh thành công. Mã sự cố của bạn là {tracking_code}",
    )


async def get_submission_status(
    db: AsyncSession,
    client_submission_id: str,
    current_user_id: uuid.UUID,
) -> Optional[OfflineSubmissionStatusResponse]:
    """Tra cứu trạng thái biên nhận phản ánh ngoại tuyến theo client_submission_id."""
    stmt = select(OfflineSubmission).where(
        OfflineSubmission.client_submission_id == client_submission_id
    )
    res = await db.execute(stmt)
    sub = res.scalar_one_or_none()
    if not sub:
        return None

    if sub.user_id != current_user_id:
        raise PermissionError("Bạn không có quyền xem biên nhận của tài khoản khác.")

    incident_code = None
    if sub.incident_id:
        inc_stmt = select(Incident.tracking_code).where(Incident.incident_id == sub.incident_id)
        inc_res = await db.execute(inc_stmt)
        incident_code = inc_res.scalar_one_or_none()

    return OfflineSubmissionStatusResponse(
        submission_id=str(sub.submission_id),
        client_submission_id=sub.client_submission_id,
        incident_id=str(sub.incident_id) if sub.incident_id else None,
        tracking_code=incident_code,
        status=sub.status,
        server_received_at=sub.server_received_at,
        synced_at=sub.synced_at,
        error_message=sub.error_message,
    )
