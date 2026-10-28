"""
GreenSpot API Router - Security Audit Log (Chức năng 27)
Hệ thống Nhật ký kiểm toán an ninh Audit Log và Giám sát truy vết biến động dữ liệu:
- Màn 1: Tra cứu nhật ký kiểm toán (bộ lọc hành động, người thực hiện, khoảng thời gian).
- Màn 2: Chi tiết một dòng nhật ký (thông tin người thực hiện, before/after diff highlight, IP/UserAgent, SHA-256 hash).
- Màn 3: Trạng thái không tìm thấy nhật ký (hướng dẫn đặt lại bộ lọc).
- Màn 4: Popup xuất & tải xuống nhật ký ra Excel / PDF / CSV (tối đa 10.000 dòng).
- Bảo vệ bất biến (Read-only Immutability - AUD_002): Chặn mọi thao tác xóa nhật ký.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit import AuditLog
from app.models.rbac import User
from app.api.v1.rbac import require_admin_user
from app.services.audit_service import AuditService
from app.schemas.audit import (
    AuditLogListResponse,
    AuditLogDetailResponse,
    AuditExportRequest,
    AuditExportResponse,
    AuditStatisticsResponse,
    AuditChainVerificationResponse,
)

router = APIRouter(prefix="/system/audit-logs", tags=["Nhật ký kiểm toán Audit Log (Chức năng 27)"])


@router.post("/verify-chain", response_model=AuditChainVerificationResponse)
async def verify_audit_log_chain(
    limit: int = Query(100, ge=10, le=1000, description="Số lượng bản ghi tối đa cần đối soát chuỗi băm"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 26 - Đột phá 10/10] Kiểm định toàn vẹn chuỗi băm bất biến Merkle-Chained Audit Trail:
    - Duyệt liên hoàn các bản ghi từ Genesis Block đến khối mới nhất
    - Đối soát Hash(N) = SHA256(Hash(N-1) + Payload(N))
    - Phát hiện tức thì nếu có bất kỳ can thiệp trái phép nào vào cơ sở dữ liệu.
    """
    return await AuditService.verify_audit_chain(db=db, limit=limit)


@router.get("/statistics", response_model=AuditStatisticsResponse)
async def get_audit_statistics(
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Dashboard Stat Cards] Lấy 4 chỉ số thống kê giám sát an ninh:
    - Tổng số thao tác tuần này
    - Số lượt đăng nhập thành công/thất bại
    - Số lần thay đổi phân quyền
    - Cảnh báo thao tác đáng ngờ (is_suspicious)
    """
    return await AuditService.get_audit_statistics(db=db)


@router.get("/download")
async def download_exported_audit_logs(
    format: str = Query("csv", description="csv | excel | pdf"),
    action: Optional[str] = Query(None),
    actor_query: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Màn 4] Tải xuống trực tiếp tệp báo cáo Nhật ký kiểm toán (CSV / Excel / HTML-PDF)
    """
    content, media_type, ext = await AuditService.generate_export_file_content(
        db=db,
        export_format=format,
        action=action,
        actor_query=actor_query,
        start_date=start_date,
        end_date=end_date,
    )
    filename = f"GreenSpot_AuditLogs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.get("", response_model=AuditLogListResponse)
async def query_audit_logs(
    action: Optional[str] = Query(None, description="Tất cả | Đăng nhập | Đổi quyền | Sửa dữ liệu | Cộng/trừ điểm"),
    actor_query: Optional[str] = Query(None, description="Tên hoặc email người thực hiện"),
    is_suspicious: Optional[bool] = Query(None, description="Lọc riêng các thao tác đáng ngờ"),
    start_date: Optional[datetime] = Query(None, description="Từ ngày (mặc định 7 ngày trước)"),
    end_date: Optional[datetime] = Query(None, description="Đến ngày (mặc định hiện tại)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Màn 1 & Màn 3] Tra cứu Nhật ký kiểm toán an ninh:
    - Chỉ người dùng có vai trò Admin mới truy cập được màn hình này.
    - Sắp xếp theo thời gian mới nhất lên trước.
    - Khi chưa chọn khoảng thời gian, hệ thống mặc định hiển thị 7 ngày gần nhất.
    """
    return await AuditService.get_audit_logs(
        db=db,
        action=action,
        actor_query=actor_query,
        is_suspicious=is_suspicious,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit
    )


@router.get("/{log_id}", response_model=AuditLogDetailResponse)
async def get_audit_log_detail(
    log_id: int,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Màn 2] Xem chi tiết một dòng nhật ký kiểm toán:
    - 3 khối: Thông tin thực hiện, Thay đổi Before/After diff, Truy vết thiết bị & IP + SHA-256 Integrity Hash.
    - Che giấu tự động thông tin nhạy cảm (mật khẩu, mã pin, token hiển thị '******').
    """
    return await AuditService.get_audit_log_detail(db=db, log_id=log_id)


@router.post("/export", response_model=AuditExportResponse)
async def export_audit_logs(
    payload: AuditExportRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Màn 4] Xuất nhật ký ra tệp Excel / PDF / CSV theo bộ lọc:
    - Giới hạn tối đa 10.000 dòng.
    - Thao tác xuất được ghi lại vào Nhật ký kiểm toán.
    """
    return await AuditService.export_audit_logs(
        db=db,
        payload=payload,
        admin_user_id=current_admin.user_id
    )


@router.delete("/{log_id}")
@router.delete("")
async def block_delete_audit_logs(
    log_id: Optional[int] = None,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Bảng 4.27.2 (AUD_002)] Chặn mọi hành vi xóa bản ghi nhật ký kiểm toán (Tamper-evident Read-only):
    - Ghi lại cảnh báo an ninh cấp cao khi có yêu cầu xóa nhật ký.
    - Trả về 403 Forbidden kèm mã lỗi AUD_002.
    """
    db.add(
        AuditLog(
            user_id=current_admin.user_id,
            action="DELETE_AUDIT_ATTEMPT",
            table_name="audit_logs",
            record_id=str(log_id) if log_id is not None else "ALL",
            old_data=None,
            new_data={"blocked_by": "AUD_002_IMMUTABLE_POLICY", "target_log_id": log_id},
            ip_address="127.0.0.1",
            user_agent="Security Policy Guard",
            request_uri=f"/api/v1/system/audit-logs/{log_id or ''}",
            is_suspicious=True,
        )
    )
    await db.commit()

    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error_code": "AUD_002",
            "message": "Bảng nhật ký kiểm toán an ninh là bất biến (Read-only), không được phép xóa.",
        },
    )
