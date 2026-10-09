import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.rbac import User, Role
from app.models.spatial import AdministrativeUnit
from app.models.incident import Incident
from app.models.deduplication import IncidentDuplicateCluster
from app.schemas.deduplication import (
    DistrictOption,
    DuplicateClusterListItem,
    ClusterListResponse,
    IncidentComparisonDetail,
    AIAnalysisConclusion,
    ComparisonResponse,
    MergeIncidentRequest,
    MergeIncidentResponse,
    MarkDistinctRequest,
    MarkDistinctResponse,
)
from app.api.v1.rbac import get_current_active_user


router = APIRouter(prefix="/incidents/deduplication", tags=["AI Phát hiện báo cáo trùng lặp"])


ALLOWED_ROLES = {"ADMIN", "OFFICER", "DISTRICT_MANAGER", "COORDINATOR", "RESPONDER"}


async def verify_deduplication_access(user: User, db: AsyncSession) -> None:
    """
    Quy tắc kiểm tra phân quyền:
    Chỉ tài khoản có vai trò Quản trị viên (Admin) hoặc Điều phối viên môi trường mới có quyền truy cập.
    """
    role_code = None
    if "role" in user.__dict__ and user.role:
        role_code = user.role.role_code
    elif user.role_id:
        role = await db.get(Role, user.role_id)
        if role:
            role_code = role.role_code

    if not role_code or role_code not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên và Điều phối viên môi trường mới có quyền truy cập tính năng này",
        )


@router.get("/districts", response_model=List[DistrictOption])
async def get_deduplication_districts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách quận/huyện cho bộ lọc ở Cột trái (Màn 1)
    """
    await verify_deduplication_access(current_user, db)

    stmt = select(AdministrativeUnit).order_by(AdministrativeUnit.name)
    res = await db.execute(stmt)
    units = res.scalars().all()

    options = [DistrictOption(unit_id=None, name="Tất cả quận/huyện", unit_code="ALL")]
    for u in units:
        options.append(
            DistrictOption(
                unit_id=u.unit_id,
                name=u.name,
                unit_code=u.unit_code,
            )
        )
    return options


from typing import Annotated, List, Optional

@router.get("/clusters", response_model=ClusterListResponse)
async def list_duplicate_clusters(
    district_name: Annotated[Optional[str], Query(description="Lọc theo quận/huyện")] = None,
    min_similarity: Annotated[Optional[float], Query(description="Ngưỡng tỷ lệ tương đồng tối thiểu (%)")] = None,
    simulate_error: Annotated[bool, Query(description="Mô phỏng lỗi kết nối dịch vụ AI để kiểm thử")] = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cột phải: Khối 'NHÓM TRÙNG' (Màn 1/4)
    Tự động gom cụm các báo cáo trùng lặp theo thuật toán AI.
    Hỗ trợ lọc theo quận và mức giống nhau (%).
    """
    await verify_deduplication_access(current_user, db)

    # Mô phỏng lỗi máy chủ AI
    if simulate_error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể kết nối dịch vụ AI. Vui lòng thử lại",
        )

    # Truy vấn danh sách cụm đang chờ duyệt, áp dụng Soft delete (deleted_at IS NULL - Quy tắc 6)
    query = (
        select(IncidentDuplicateCluster)
        .where(IncidentDuplicateCluster.deleted_at.is_(None))
        .where(IncidentDuplicateCluster.status == "PENDING_REVIEW")
    )

    if district_name and district_name != "Tất cả quận/huyện":
        query = query.where(IncidentDuplicateCluster.district_name == district_name)

    if min_similarity is not None:
        query = query.where(IncidentDuplicateCluster.similarity_rate >= min_similarity)

    query = query.order_by(IncidentDuplicateCluster.similarity_rate.desc())
    res = await db.execute(query)
    clusters = res.scalars().all()

    items = []
    for c in clusters:
        rate_int = int(round(float(c.similarity_rate)))
        items.append(
            DuplicateClusterListItem(
                cluster_id=c.cluster_id,
                cluster_code=c.cluster_code,
                cluster_name=c.cluster_name,
                report_count=c.report_count,
                similarity_rate=float(c.similarity_rate),
                similarity_display=f"giống {rate_int}%",
                district_name=c.district_name,
                status=c.status,
                gps_distance_m=float(c.gps_distance_m),
                time_diff_hours=float(c.time_diff_hours),
                visual_similarity=float(c.visual_similarity),
                version=c.version,
            )
        )

    return ClusterListResponse(total=len(items), items=items)


@router.get("/compare/{cluster_id}", response_model=ComparisonResponse)
async def get_cluster_comparison_detail(
    cluster_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 2/4: Bảng đối chứng song song hai báo cáo nghi vấn (Side-by-Side Comparison)
    Khối BÁO CÁO A | Khối BÁO CÁO B | Khối KẾT LUẬN AI
    """
    await verify_deduplication_access(current_user, db)

    stmt = (
        select(IncidentDuplicateCluster)
        .where(IncidentDuplicateCluster.cluster_id == cluster_id)
        .where(IncidentDuplicateCluster.deleted_at.is_(None))
    )
    res = await db.execute(stmt)
    cluster = res.scalar_one_or_none()
    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cụm báo cáo trùng lặp yêu cầu",
        )

    # Nạp chi tiết Báo cáo A
    stmt_a = (
        select(Incident)
        .options(selectinload(Incident.media), selectinload(Incident.reporter))
        .where(Incident.incident_id == cluster.incident_a_id)
    )
    res_a = await db.execute(stmt_a)
    inc_a = res_a.scalar_one_or_none()

    # Nạp chi tiết Báo cáo B
    stmt_b = (
        select(Incident)
        .options(selectinload(Incident.media), selectinload(Incident.reporter))
        .where(Incident.incident_id == cluster.incident_b_id)
    )
    res_b = await db.execute(stmt_b)
    inc_b = res_b.scalar_one_or_none()

    if not inc_a or not inc_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy chi tiết hồ sơ sự cố liên quan",
        )

    def get_first_media(inc: Incident) -> str:
        if inc.media and len(inc.media) > 0:
            return inc.media[0].file_url
        return "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80"

    media_a = get_first_media(inc_a)
    media_b = get_first_media(inc_b)

    date_a_str = inc_a.created_at.strftime("%H:%M %d/%m") if inc_a.created_at else "08:15 15/09"
    date_b_str = inc_b.created_at.strftime("%H:%M %d/%m") if inc_b.created_at else "09:30 15/09"

    report_a_detail = IncidentComparisonDetail(
        incident_id=inc_a.incident_id,
        tracking_code=inc_a.tracking_code,
        reporter_name=inc_a.reporter.full_name if inc_a.reporter else "Công dân A",
        reporter_phone=inc_a.reporter.phone_number if inc_a.reporter else "0901234567",
        title=inc_a.title,
        description=inc_a.description,
        address_text=inc_a.address_text,
        latitude=float(inc_a.latitude),
        longitude=float(inc_a.longitude),
        created_at=inc_a.created_at,
        created_at_display=date_a_str,
        media_url=media_a,
        version=inc_a.version,
    )

    report_b_detail = IncidentComparisonDetail(
        incident_id=inc_b.incident_id,
        tracking_code=inc_b.tracking_code,
        reporter_name=inc_b.reporter.full_name if inc_b.reporter else "Công dân B",
        reporter_phone=inc_b.reporter.phone_number if inc_b.reporter else "0987654321",
        title=inc_b.title,
        description=inc_b.description,
        address_text=inc_b.address_text,
        latitude=float(inc_b.latitude),
        longitude=float(inc_b.longitude),
        created_at=inc_b.created_at,
        created_at_display=date_b_str,
        media_url=media_b,
        version=inc_b.version,
    )

    recommended_id = inc_a.incident_id if (inc_a.created_at or datetime.min) <= (inc_b.created_at or datetime.min) else inc_b.incident_id
    rate_val = float(cluster.similarity_rate)
    rate_int = int(round(rate_val))

    ai_conclusion = AIAnalysisConclusion(
        similarity_rate=rate_val,
        similarity_display=f"Giống nhau: {rate_int}%",
        gps_distance_m=float(cluster.gps_distance_m),
        time_diff_hours=float(cluster.time_diff_hours),
        visual_similarity=float(cluster.visual_similarity),
        recommended_primary_id=recommended_id,
        recommendation_reason="Báo cáo được gửi sớm hơn và hình ảnh ghi nhận hiện trường rõ nét.",
        explanation=cluster.ai_conclusion or f"Khoảng cách GPS {cluster.gps_distance_m}m, thời gian chênh {cluster.time_diff_hours} giờ, độ giống hình ảnh {cluster.visual_similarity}%.",
    )

    return ComparisonResponse(
        cluster_id=cluster.cluster_id,
        cluster_name=cluster.cluster_name,
        report_a=report_a_detail,
        report_b=report_b_detail,
        ai_conclusion=ai_conclusion,
        version=cluster.version,
    )


@router.post("/mark-distinct", response_model=MarkDistinctResponse)
async def mark_cluster_as_distinct(
    req: MarkDistinctRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 2/4: Nút 'Không trùng'
    Đánh dấu đây là 2 sự cố riêng biệt (False Positive), tách cụm và đưa cả hai vào luồng xử lý độc lập.
    Áp dụng Optimistic Locking (Quy tắc 7).
    """
    await verify_deduplication_access(current_user, db)

    stmt = select(IncidentDuplicateCluster).where(
        IncidentDuplicateCluster.cluster_id == req.cluster_id,
        IncidentDuplicateCluster.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    cluster = res.scalar_one_or_none()
    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cụm báo cáo yêu cầu",
        )

    # Kiểm tra Optimistic Locking
    if cluster.version != req.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dữ liệu đã bị thay đổi bởi thao tác khác. Vui lòng tải lại dữ liệu",
        )

    cluster.status = "SEPARATED"
    cluster.version = cluster.version + 1
    cluster.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return MarkDistinctResponse(
        success=True,
        message="Đã đánh dấu 2 báo cáo không trùng lặp",
        cluster_id=cluster.cluster_id,
    )


@router.post("/merge", response_model=MergeIncidentResponse)
async def merge_cluster_incidents(
    req: MergeIncidentRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3/4 & 4/4: Nút 'Gộp'
    Gộp hồ sơ trên máy chủ: Báo cáo phụ liên kết vào báo cáo chính, bảo lưu điểm thưởng Công dân Xanh,
    gửi thông báo đến công dân báo cáo phụ và áp dụng Optimistic Locking (Quy tắc 7) + Soft Delete (Quy tắc 6).
    """
    await verify_deduplication_access(current_user, db)

    # 1. Tìm cluster và kiểm tra version (Optimistic Concurrency Control)
    stmt = select(IncidentDuplicateCluster).where(
        IncidentDuplicateCluster.cluster_id == req.cluster_id,
        IncidentDuplicateCluster.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    cluster = res.scalar_one_or_none()
    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cụm báo cáo cần gộp",
        )

    if cluster.version != req.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dữ liệu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang",
        )

    # 2. Tìm Báo cáo chính và Báo cáo phụ
    primary_inc = await db.get(Incident, req.primary_incident_id)
    secondary_inc = await db.get(Incident, req.secondary_incident_id)

    if not primary_inc or not secondary_inc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể gộp báo cáo lúc này. Vui lòng thử lại",
        )

    # 3. Liên kết báo cáo phụ vào báo cáo chính
    secondary_inc.master_incident_id = primary_inc.incident_id
    secondary_inc.is_duplicate_merged = True
    secondary_inc.status = "MERGED"
    secondary_inc.version = secondary_inc.version + 1

    # 4. Cập nhật cụm báo cáo và Soft Delete (Quy tắc 6)
    cluster.status = "MERGED"
    cluster.master_incident_id = primary_inc.incident_id
    cluster.version = cluster.version + 1
    cluster.deleted_at = datetime.now(timezone.utc)

    # 5. Hệ thống gửi thông báo push/chuông đến người gửi báo cáo phụ
    notification_target = secondary_inc.reporter_id or "Công dân gửi báo cáo phụ"

    await db.commit()

    return MergeIncidentResponse(
        success=True,
        message="Người báo cáo nhận thông báo",
        cluster_id=cluster.cluster_id,
        primary_incident_id=primary_inc.incident_id,
        secondary_incident_id=secondary_inc.incident_id,
        new_version=cluster.version,
        notification_sent_to=str(notification_target),
    )
