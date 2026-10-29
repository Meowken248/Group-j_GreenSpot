"""
Chức năng 26: Nhật ký kiểm toán Audit Log (Bảng 11 trong báo cáo).
Re-export class AuditLog chuẩn đã được hợp nhất tại app.models.audit_log
"""
from app.models.audit_log import AuditLog

__all__ = ["AuditLog"]
