import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.audit import AuditLog
from app.models.rbac import User, Role
from app.schemas.audit import (
    AuditLogItemResponse,
    AuditLogDetailResponse,
    AuditLogListResponse,
    AuditExportRequest,
    AuditExportResponse,
)

SENSITIVE_KEYS = {"password", "token", "access_token", "refresh_token", "otp", "secret", "salt", "pin"}

def mask_sensitive(data: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not data or not isinstance(data, dict):
        return data
    masked = {}
    for k, v in data.items():
        if any(sens in k.lower() for sens in SENSITIVE_KEYS):
            masked[k] = "******"
        elif isinstance(v, dict):
            masked[k] = mask_sensitive(v)
        else:
            masked[k] = v
    return masked

def parse_device_info(ua: Optional[str]) -> str:
    if not ua:
        return "Không xác định"
    ua_lower = ua.lower()
    os_name = "Desktop"
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        os_name = "macOS"
    elif "iphone" in ua_lower:
        os_name = "iOS (iPhone)"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "linux" in ua_lower:
        os_name = "Linux"

    browser = "Trình duyệt"
    if "chrome" in ua_lower and "edg" not in ua_lower:
        browser = "Chrome"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "edg" in ua_lower:
        browser = "Edge"

    return f"{os_name} • {browser}"

ACTION_MAP = {
    "LOGIN": "Đăng nhập",
    "UPDATE_ROLE": "Đổi quyền",
    "UPDATE_DATA": "Sửa dữ liệu",
    "REWARD_POINTS": "Cộng/trừ điểm",
    "EXPORT_AUDIT_LOG": "Xuất nhật ký",
    "CREATE_INCIDENT": "Tạo sự cố",
    "DISPATCH_TEAM": "Điều phối đội ngũ",
    "APPROVE_VERIFICATION": "Duyệt nghiệm thu",
    "DB_BACKUP": "Sao lưu CSDL",
}

class AuditService:
    @staticmethod
    def validate_date_range(start_date: Optional[datetime], end_date: Optional[datetime]) -> tuple[datetime, datetime]:
        now = datetime.now(timezone.utc)
        if start_date and start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date and end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        if not end_date:
            end_date = now
        if not start_date:
            start_date = end_date - timedelta(days=7)

        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ngày bắt đầu phải trước ngày kết thúc"
            )

        # Allow slight clock tolerance (5 minutes)
        if start_date > now + timedelta(minutes=5) or end_date > now + timedelta(minutes=5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể chọn ngày trong tương lai"
            )

        if (end_date - start_date).days > 365:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khoảng thời gian tối đa 365 ngày"
            )

        return start_date, end_date

    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        action: Optional[str] = None,
        actor_query: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 20
    ) -> AuditLogListResponse:
        v_start, v_end = AuditService.validate_date_range(start_date, end_date)

        # Build query
        q = select(AuditLog).options(selectinload(AuditLog.user).selectinload(User.role)).outerjoin(User, AuditLog.user_id == User.user_id).outerjoin(Role, User.role_id == Role.role_id)
        q = q.where(AuditLog.created_at >= v_start, AuditLog.created_at <= v_end)

        if action and action.upper() not in ["ALL", "TẤT CẢ"]:
            norm_action = action.upper().strip()
            # Map friendly names if passed
            action_reverse_map = {
                "ĐĂNG NHẬP": "LOGIN",
                "ĐỔI QUYỀN": "UPDATE_ROLE",
                "SỬA DỮ LIỆU": "UPDATE_DATA",
                "CỘNG/TRỪ ĐIỂM": "REWARD_POINTS",
                "XUẤT NHẬT KÝ": "EXPORT_AUDIT_LOG",
            }
            db_action = action_reverse_map.get(norm_action, norm_action)
            q = q.where(AuditLog.action == db_action)

        if actor_query and actor_query.strip():
            term = f"%{actor_query.strip()}%"
            q = q.where(
                or_(
                    User.full_name.ilike(term),
                    User.email.ilike(term)
                )
            )

        # Count total
        count_q = select(func.count()).select_from(q.subquery())
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0

        # Pagination
        offset = (max(1, page) - 1) * limit
        q = q.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
        res = await db.execute(q)
        logs = res.scalars().all()

        items: list[AuditLogItemResponse] = []
        for log in logs:
            actor_name = log.user.full_name if log.user else ("Tác vụ hệ thống" if not log.user_id else "Tài khoản đã bị xoá")
            actor_email = log.user.email if log.user else None
            actor_role = log.user.role.role_name if (log.user and log.user.role) else "SYSTEM"
            is_deleted = bool(log.user_id and not log.user)

            items.append(
                AuditLogItemResponse(
                    log_id=log.log_id,
                    created_at=log.created_at,
                    user_id=log.user_id,
                    actor_name=actor_name,
                    actor_email=actor_email,
                    actor_role=actor_role,
                    is_actor_deleted=is_deleted,
                    action=log.action,
                    action_display=ACTION_MAP.get(log.action, log.action),
                    table_name=log.table_name,
                    record_id=log.record_id,
                    ip_address=log.ip_address or "Không xác định",
                    user_agent=log.user_agent or "Không xác định",
                    device_info=parse_device_info(log.user_agent),
                    is_suspicious=log.is_suspicious
                )
            )

        has_more = (offset + len(items)) < total

        return AuditLogListResponse(
            total=total,
            page=page,
            limit=limit,
            has_more=has_more,
            items=items
        )

    @staticmethod
    async def get_audit_log_detail(db: AsyncSession, log_id: int) -> AuditLogDetailResponse:
        q = select(AuditLog).options(selectinload(AuditLog.user).selectinload(User.role)).outerjoin(User, AuditLog.user_id == User.user_id).outerjoin(Role, User.role_id == Role.role_id).where(AuditLog.log_id == log_id)
        res = await db.execute(q)
        log = res.scalar_one_or_none()
        if not log:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nhật ký không còn tồn tại")

        actor_name = log.user.full_name if log.user else ("Tác vụ hệ thống" if not log.user_id else "Tài khoản đã bị xoá")
        actor_email = log.user.email if log.user else None
        actor_role = log.user.role.role_name if (log.user and log.user.role) else "SYSTEM"
        is_deleted = bool(log.user_id and not log.user)

        old_masked = mask_sensitive(log.old_data)
        new_masked = mask_sensitive(log.new_data)

        # Diff calculation
        diff = {}
        has_changes = False
        all_keys = set((old_masked or {}).keys()) | set((new_masked or {}).keys())
        for k in all_keys:
            old_val = (old_masked or {}).get(k)
            new_val = (new_masked or {}).get(k)
            is_changed = old_val != new_val
            if is_changed:
                has_changes = True
            diff[k] = {
                "old": old_val,
                "new": new_val,
                "is_changed": is_changed
            }

        if not old_masked and not new_masked:
            has_changes = False

        return AuditLogDetailResponse(
            log_id=log.log_id,
            created_at=log.created_at,
            user_id=log.user_id,
            actor_name=actor_name,
            actor_email=actor_email,
            actor_role=actor_role,
            is_actor_deleted=is_deleted,
            action=log.action,
            action_display=ACTION_MAP.get(log.action, log.action),
            table_name=log.table_name,
            record_id=log.record_id,
            ip_address=log.ip_address or "Không xác định",
            user_agent=log.user_agent or "Không xác định",
            device_info=parse_device_info(log.user_agent),
            is_suspicious=log.is_suspicious,
            old_data=old_masked,
            new_data=new_masked,
            diff=diff if has_changes else None,
            request_uri=log.request_uri or "N/A",
            has_data_changes=has_changes
        )

    @staticmethod
    async def export_audit_logs(
        db: AsyncSession,
        payload: AuditExportRequest,
        admin_user_id: uuid.UUID
    ) -> AuditExportResponse:
        v_start, v_end = AuditService.validate_date_range(payload.start_date, payload.end_date)

        # Build query to count matching
        q = select(AuditLog).where(AuditLog.created_at >= v_start, AuditLog.created_at <= v_end)
        if payload.action and payload.action.upper() not in ["ALL", "TẤT CẢ"]:
            q = q.where(AuditLog.action == payload.action.upper())

        count_q = select(func.count()).select_from(q.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        if total == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không còn nhật ký để xuất. Vui lòng tải lại"
            )

        if total > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Có {total:,} dòng, vượt giới hạn 10.000. Hãy thu hẹp bộ lọc"
            )

        # Thao tác xuất được ghi lại vào Nhật ký kiểm toán
        export_log = AuditLog(
            user_id=admin_user_id,
            action="EXPORT_AUDIT_LOG",
            table_name="audit_logs",
            record_id=f"export-{payload.format.lower()}-{int(datetime.now().timestamp())}",
            old_data=None,
            new_data={
                "format": payload.format.upper(),
                "total_rows": total,
                "filter_action": payload.action or "ALL",
                "filter_actor": payload.actor_query or "ALL",
                "date_from": v_start.isoformat(),
                "date_to": v_end.isoformat(),
            },
            ip_address="127.0.0.1",
            user_agent="Admin Portal Export Service",
            request_uri="/api/v1/system/audit-logs/export",
            is_suspicious=False
        )
        db.add(export_log)
        await db.commit()

        summary_text = f"Bộ lọc: {payload.action or 'Tất cả'} | Khoảng thời gian: {v_start.strftime('%d/%m/%Y')} - {v_end.strftime('%d/%m/%Y')} | {total} bản ghi"

        return AuditExportResponse(
            download_url=f"/api/v1/system/audit-logs/download?format={payload.format.lower()}&count={total}",
            format=payload.format.upper(),
            total_records=total,
            summary_text=summary_text,
            generated_at=datetime.now(timezone.utc),
            message="Đã xuất nhật ký thành công"
        )
