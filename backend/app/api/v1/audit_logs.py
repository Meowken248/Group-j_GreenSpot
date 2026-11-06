"""
GreenSpot API Router - Security Audit Log (Chức năng 26)
Nhật ký kiểm toán an ninh:
- Màn 1: Tra cứu nhật ký kiểm toán (bộ lọc hành động, người thực hiện, khoảng thời gian).
- Màn 2: Chi tiết một dòng nhật ký (thông tin người thực hiện, before/after diff highlight, IP/UserAgent).
- Màn 3: Trạng thái không tìm thấy nhật ký (hướng dẫn đặt lại bộ lọc).
- Màn 4: Popup xuất nhật ký ra Excel / PDF / CSV (tối đa 10.000 dòng).
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import require_admin_user
from app.services.audit_service import AuditService
from app.schemas.audit import (
    AuditLogListResponse,
    AuditLogDetailResponse,
    AuditExportRequest,
    AuditExportResponse,
)

router = APIRouter(prefix="/system/audit-logs", tags=["Nhật ký kiểm toán Audit Log (Chức năng 26)"])

@router.get("", response_model=AuditLogListResponse)
async def query_audit_logs(
    action: Optional[str] = Query(None, description="Tất cả | Đăng nhập | Đổi quyền | Sửa dữ liệu | Cộng/trừ điểm"),
    actor_query: Optional[str] = Query(None, description="Tên hoặc email người thực hiện"),
    start_date: Optional[datetime] = Query(None, description="Từ ngày (mặc định 7 ngày trước)"),
    end_date: Optional[datetime] = Query(None, description="Đến ngày (mặc định hiện tại)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 26 - Màn 1 & Màn 3] Tra cứu Nhật ký kiểm toán an ninh:
    - Chỉ người dùng có vai trò Admin mới truy cập được màn hình này.
    - Sắp xếp theo thời gian mới nhất lên trước.
    - Khi chưa chọn khoảng thời gian, hệ thống mặc định hiển thị 7 ngày gần nhất.
    """
    return await AuditService.get_audit_logs(
        db=db,
        action=action,
        actor_query=actor_query,
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
    [Chức năng 26 - Màn 2] Xem chi tiết một dòng nhật ký kiểm toán:
    - 3 khối: Thông tin thực hiện, Thay đổi Before/After diff, Truy vết thiết bị & IP.
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
    [Chức năng 26 - Màn 4] Xuất nhật ký ra tệp Excel / PDF / CSV theo bộ lọc:
    - Giới hạn tối đa 10.000 dòng.
    - Thao tác xuất được ghi lại vào Nhật ký kiểm toán.
    """
    return await AuditService.export_audit_logs(
        db=db,
        payload=payload,
        admin_user_id=current_admin.user_id
    )
