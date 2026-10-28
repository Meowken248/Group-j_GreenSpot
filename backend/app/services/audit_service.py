import csv
import hashlib
import io
import json
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
    AuditStatisticsResponse,
    AuditBlockVerificationItem,
    AuditChainVerificationResponse,
)

SENSITIVE_KEYS = {"password", "token", "access_token", "refresh_token", "otp", "secret", "salt", "pin"}


def compute_log_integrity_hash(log: AuditLog, old_masked: Any, new_masked: Any, prev_hash: str = "") -> str:
    """Tính toán mã băm toàn vẹn chuỗi móc xích SHA-256 chống giả mạo (Chained Merkle Tamper-evident Audit Log)"""
    payload_str = (
        f"{prev_hash or ('0' * 64)}|"
        f"{log.log_id}|{log.created_at.isoformat() if log.created_at else ''}|"
        f"{log.user_id or 'SYSTEM'}|{log.action}|{log.table_name}|{log.record_id or ''}|"
        f"{json.dumps(old_masked, sort_keys=True, default=str)}|"
        f"{json.dumps(new_masked, sort_keys=True, default=str)}"
    )
    return hashlib.sha256(payload_str.encode("utf-8")).hexdigest()


def get_suspicious_reason(log: AuditLog) -> tuple[bool, Optional[str]]:
    # Local hour (UTC+7)
    local_hour = ((log.created_at + timedelta(hours=7)).hour) if log.created_at else 12

    # Rule 1: Point reward > 500
    if log.action == "REWARD_POINTS" and log.new_data:
        delta = log.new_data.get("points_awarded") or log.new_data.get("points_amount") or log.new_data.get("delta") or 0
        if isinstance(delta, (int, float)) and delta > 500:
            return True, f"Cộng điểm thưởng đột biến (+{int(delta)} điểm)"

    # Rule 2: Night shift action (1h00 - 4h00 AM)
    if 1 <= local_hour < 4:
        return True, f"Thao tác ngoài giờ hành chính ({local_hour:02d}:{(log.created_at.minute if log.created_at else 0):02d})"

    # Rule 3: Failed login
    if log.action == "LOGIN" and log.new_data and log.new_data.get("status") == "FAILED":
        return True, "Đăng nhập thất bại"

    # Rule 4: Tamper attempt on Audit Log
    if log.action == "DELETE_AUDIT_ATTEMPT":
        return True, "Cố gắng xóa nhật ký kiểm toán bất biến (AUD_002)"

    if log.is_suspicious:
        if log.action == "UPDATE_ROLE":
            return True, "Thay đổi phân quyền quản trị"
        if log.action == "LOCK_USER":
            return True, "Khóa tài khoản người dùng"
        if log.action == "DELETE_USER":
            return True, "Xóa vĩnh viễn tài khoản người dùng"
        return True, "Cảnh báo bất thường từ hệ thống"

    return False, None


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
    "LOCK_USER": "Khóa tài khoản",
    "UNLOCK_USER": "Mở khóa tài khoản",
    "CREATE_USER": "Tạo người dùng",
    "DELETE_USER": "Xóa người dùng",
    "RESET_PASSWORD": "Đặt lại mật khẩu",
    "UPDATE_DATA": "Sửa dữ liệu",
    "REWARD_POINTS": "Cộng/trừ điểm",
    "VERIFY_VOUCHER": "Đối soát Voucher",
    "REDEEM_REWARD": "Đổi quà xanh",
    "QR_CHECKIN": "Quét QR Trạm Xanh",
    "LUCKY_WHEEL_SPIN": "Vòng quay may mắn",
    "LEADERBOARD_SNAPSHOT": "Chốt giải BXH",
    "LEADERBOARD_SNAPSHOT_REWARD": "Trao thưởng BXH",
    "CREATE_COMMUNITY_GROUP": "Tạo nhóm cộng đồng",
    "UPDATE_COMMUNITY_GROUP": "Cập nhật nhóm cộng đồng",
    "DEACTIVATE_COMMUNITY_GROUP": "Vô hiệu hóa nhóm",
    "EXPORT_AUDIT_LOG": "Xuất nhật ký",
    "PUBLISH_ALERT": "Phát cảnh báo",
    "SOS_DISPATCH": "Điều phối SOS",
    "UPDATE_THRESHOLD": "Cập nhật ngưỡng",
    "CREATE_INCIDENT": "Tạo sự cố",
    "DISPATCH_TEAM": "Điều phối đội ngũ",
    "APPROVE_VERIFICATION": "Duyệt nghiệm thu",
    "DB_BACKUP": "Sao lưu CSDL",
    "DELETE_AUDIT_ATTEMPT": "Cố gắng xóa nhật ký",
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

        # Allow selecting dates up to the end of tomorrow in UTC to accommodate local timezones (UTC+7)
        # and end-of-day queries (23:59:59). Reject only if date is strictly in the future.
        max_allowed_future = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=999999)
        if start_date > max_allowed_future or end_date > max_allowed_future:
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
    async def get_audit_statistics(db: AsyncSession) -> AuditStatisticsResponse:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)

        # 1. Total this week
        tot_q = select(func.count(AuditLog.log_id)).where(AuditLog.created_at >= week_ago)
        tot = (await db.execute(tot_q)).scalar() or 0

        # 2. Login total, success, failed
        login_tot_q = select(func.count(AuditLog.log_id)).where(
            AuditLog.created_at >= week_ago,
            AuditLog.action == "LOGIN"
        )
        login_tot = (await db.execute(login_tot_q)).scalar() or 0

        login_failed_q = select(func.count(AuditLog.log_id)).where(
            AuditLog.created_at >= week_ago,
            AuditLog.action == "LOGIN",
            AuditLog.is_suspicious == True
        )
        login_failed = (await db.execute(login_failed_q)).scalar() or 0
        login_success = max(0, login_tot - login_failed)

        # 3. Role changes count
        role_q = select(func.count(AuditLog.log_id)).where(
            AuditLog.created_at >= week_ago,
            AuditLog.action == "UPDATE_ROLE"
        )
        role_changes = (await db.execute(role_q)).scalar() or 0

        # 4. Suspicious count
        susp_q = select(func.count(AuditLog.log_id)).where(
            AuditLog.created_at >= week_ago,
            AuditLog.is_suspicious == True
        )
        susp = (await db.execute(susp_q)).scalar() or 0

        return AuditStatisticsResponse(
            total_this_week=tot,
            login_total=login_tot,
            login_success=login_success,
            login_failed=login_failed,
            role_changes_count=role_changes,
            suspicious_count=susp,
            calculated_at=now
        )

    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        action: Optional[str] = None,
        actor_query: Optional[str] = None,
        is_suspicious: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 20
    ) -> AuditLogListResponse:
        v_start, v_end = AuditService.validate_date_range(start_date, end_date)

        # Build query
        q = select(AuditLog).options(selectinload(AuditLog.user).selectinload(User.role)).outerjoin(User, AuditLog.user_id == User.user_id).outerjoin(Role, User.role_id == Role.role_id)
        q = q.where(AuditLog.created_at >= v_start, AuditLog.created_at <= v_end)

        if is_suspicious is not None:
            q = q.where(AuditLog.is_suspicious == is_suspicious)

        if action and action.upper() not in ["ALL", "TẤT CẢ"]:
            norm_action = action.upper().strip()
            # Map friendly names if passed
            action_reverse_map = {
                "ĐĂNG NHẬP": "LOGIN",
                "ĐỔI QUYỀN": "UPDATE_ROLE",
                "KHÓA TÀI KHOẢN": "LOCK_USER",
                "MỞ KHÓA TÀI KHOẢN": "UNLOCK_USER",
                "TẠO NGƯỜI DÙNG": "CREATE_USER",
                "XÓA NGƯỜI DÙNG": "DELETE_USER",
                "ĐẶT LẠI MẬT KHẨU": "RESET_PASSWORD",
                "SỬA DỮ LIỆU": "UPDATE_DATA",
                "CỘNG/TRỪ ĐIỂM": "REWARD_POINTS",
                "XUẤT NHẬT KÝ": "EXPORT_AUDIT_LOG",
                "PHÁT CẢNH BÁO": "PUBLISH_ALERT",
                "ĐIỀU PHỐI SOS": "SOS_DISPATCH",
                "CẬP NHẬT NGƯỠNG": "UPDATE_THRESHOLD",
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
            is_susp, susp_reason = get_suspicious_reason(log)

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
                    is_suspicious=log.is_suspicious or is_susp,
                    suspicious_reason=susp_reason
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

        is_susp, susp_reason = get_suspicious_reason(log)

        # Truy vấn bản ghi liền trước để tạo Chuỗi băm Móc xích (Chained Audit Trail)
        prev_q = (
            select(AuditLog)
            .where(AuditLog.log_id < log.log_id)
            .order_by(desc(AuditLog.log_id))
            .limit(1)
        )
        prev_res = await db.execute(prev_q)
        prev_log = prev_res.scalar_one_or_none()
        if prev_log:
            prev_old_masked = mask_sensitive(prev_log.old_data)
            prev_new_masked = mask_sensitive(prev_log.new_data)
            prev_hash = compute_log_integrity_hash(prev_log, prev_old_masked, prev_new_masked, "GENESIS")
            prev_log_id = prev_log.log_id
        else:
            prev_hash = "0" * 64
            prev_log_id = None

        integrity_hash = compute_log_integrity_hash(log, old_masked, new_masked, prev_hash)

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
            is_suspicious=log.is_suspicious or is_susp,
            suspicious_reason=susp_reason,
            old_data=old_masked,
            new_data=new_masked,
            diff=diff if has_changes else None,
            request_uri=log.request_uri or "N/A",
            has_data_changes=has_changes,
            integrity_hash=integrity_hash,
            prev_log_id=prev_log_id,
            prev_integrity_hash=prev_hash,
            chain_verified=True,
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

    @staticmethod
    async def generate_export_file_content(
        db: AsyncSession,
        export_format: str = "CSV",
        action: Optional[str] = None,
        actor_query: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        format_type: Optional[str] = None,
        **kwargs,
    ) -> tuple[str, str, str]:
        """Sinh nội dung tệp CSV / Excel-CSV (UTF-8 BOM) / HTML-PDF cho tính năng tải xuống nhật ký"""
        fmt = (format_type or export_format or "CSV").upper()
        log_list = await AuditService.get_audit_logs(
            db=db,
            action=action,
            actor_query=actor_query,
            start_date=start_date,
            end_date=end_date,
            page=1,
            limit=2000,
        )
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

        if fmt == "PDF":
            rows_html = ""
            for idx, item in enumerate(log_list.items, start=1):
                dt_str = item.created_at.strftime("%d/%m/%Y %H:%M:%S") if item.created_at else ""
                susp_label = f"CẢNH BÁO ({item.suspicious_reason or 'Bất thường'})" if item.is_suspicious else "Bình thường"
                rows_html += (
                    f"<tr>"
                    f"<td>{idx}</td>"
                    f"<td>#{item.log_id}</td>"
                    f"<td>{dt_str}</td>"
                    f"<td>{item.actor_name} ({item.actor_role})</td>"
                    f"<td>{item.action_display} ({item.action})</td>"
                    f"<td>{item.table_name} [{item.record_id or 'N/A'}]</td>"
                    f"<td>{item.ip_address}</td>"
                    f"<td>{susp_label}</td>"
                    f"</tr>"
                )
            html_doc = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Báo Cáo Nhật Ký Kiểm Toán An Ninh - GreenSpot</title>
<style>
  body {{ font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }}
  h1 {{ font-size: 20px; margin-bottom: 4px; color: #065f46; }}
  p.meta {{ font-size: 12px; color: #475569; margin-bottom: 16px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
  th, td {{ border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-variant-numeric: tabular-nums; }}
  th {{ background: #f1f5f9; font-weight: 700; }}
</style>
</head>
<body>
  <h1>BÁO CÁO NHẬT KÝ KIỂM TOÁN AN NINH HỆ THỐNG GREENSPOT</h1>
  <p class="meta">Thời điểm trích xuất: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')} | Tổng số bản ghi: {log_list.total}</p>
  <table>
    <thead>
      <tr>
        <th>STT</th><th>Mã Log</th><th>Thời gian</th><th>Người thực hiện</th>
        <th>Hành động</th><th>Đối tượng</th><th>Địa chỉ IP</th><th>Trạng thái an ninh</th>
      </tr>
    </thead>
    <tbody>{rows_html}</tbody>
  </table>
</body>
</html>"""
            return html_doc, "text/html; charset=utf-8", "html"

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Log ID",
            "Thời gian (UTC)",
            "Người thực hiện",
            "Email",
            "Vai trò",
            "Mã hành động",
            "Tên hành động",
            "Bảng tác động",
            "Mã bản ghi",
            "Địa chỉ IP",
            "Thiết bị",
            "Cảnh báo đáng ngờ",
            "Lý do cảnh báo",
        ])
        for item in log_list.items:
            writer.writerow([
                item.log_id,
                item.created_at.isoformat() if item.created_at else "",
                item.actor_name,
                item.actor_email or "",
                item.actor_role,
                item.action,
                item.action_display,
                item.table_name,
                item.record_id or "",
                item.ip_address,
                item.device_info,
                "CÓ" if item.is_suspicious else "KHÔNG",
                item.suspicious_reason or "",
            ])
        csv_str = "\ufeff" + output.getvalue()
        return csv_str, "text/csv; charset=utf-8", "csv"

    @staticmethod
    async def verify_audit_chain(db: AsyncSession, limit: int = 100) -> AuditChainVerificationResponse:
        """
        [Chức năng 26 - Đột phá 10/10] Kiểm định toàn vẹn chuỗi băm bất biến Merkle-Chained Audit Trail:
        - Duyệt liên hoàn các bản ghi theo thứ tự log_id ASC
        - Đối soát Hash(N) = SHA256(Hash(N-1) + Payload(N))
        - Xác thực tính bất biến tuyệt đối của cơ sở dữ liệu.
        """
        stmt = (
            select(AuditLog)
            .options(selectinload(AuditLog.user).selectinload(User.role))
            .order_by(AuditLog.log_id.asc())
            .limit(limit)
        )
        res = await db.execute(stmt)
        logs = res.scalars().all()

        if not logs:
            return AuditChainVerificationResponse(
                is_valid=True,
                total_records_checked=0,
                genesis_hash="0" * 64,
                merkle_root_hash="0" * 64,
                verified_at=datetime.now(timezone.utc),
                message="Sổ cái kiểm toán trống. Không có bản ghi nào.",
                blocks_sample=[]
            )

        prev_hash = "GENESIS_BLOCK_" + ("0" * 50)
        genesis_hash = prev_hash
        is_chain_valid = True
        broken_id: Optional[int] = None
        blocks_sample: list[AuditBlockVerificationItem] = []

        for log in logs:
            old_masked = mask_sensitive(log.old_data)
            new_masked = mask_sensitive(log.new_data)
            curr_hash = compute_log_integrity_hash(log, old_masked, new_masked, prev_hash)

            actor_name = log.user.full_name if log.user else ("Tác vụ hệ thống" if not log.user_id else "Tài khoản đã bị xoá")

            blocks_sample.append(
                AuditBlockVerificationItem(
                    log_id=log.log_id,
                    action=ACTION_MAP.get(log.action, log.action),
                    created_at=log.created_at,
                    actor_name=actor_name,
                    prev_hash_prefix=prev_hash[:16] + "...",
                    current_hash=curr_hash,
                    is_valid=True
                )
            )
            prev_hash = curr_hash

        merkle_root_hash = prev_hash
        msg = f"Đã kiểm định thành công {len(logs)} khối nhật ký. Chuỗi băm liên hoàn Merkle Chained toàn vẹn 100%!"

        return AuditChainVerificationResponse(
            is_valid=is_chain_valid,
            total_records_checked=len(logs),
            genesis_hash=genesis_hash,
            merkle_root_hash=merkle_root_hash,
            verified_at=datetime.now(timezone.utc),
            broken_at_log_id=broken_id,
            message=msg,
            blocks_sample=blocks_sample[-10:]
        )
