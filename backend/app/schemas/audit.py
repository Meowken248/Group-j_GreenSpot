import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

class AuditLogItemResponse(BaseModel):
    log_id: int
    created_at: datetime
    user_id: Optional[uuid.UUID] = None
    actor_name: str
    actor_email: Optional[str] = None
    actor_role: str
    is_actor_deleted: bool = False
    action: str
    action_display: str
    table_name: str
    record_id: Optional[str] = None
    ip_address: str
    user_agent: str
    device_info: str
    is_suspicious: bool
    suspicious_reason: Optional[str] = None

class AuditStatisticsResponse(BaseModel):
    total_this_week: int
    login_total: int
    login_success: int
    login_failed: int
    role_changes_count: int
    suspicious_count: int
    calculated_at: datetime

class AuditLogDetailResponse(AuditLogItemResponse):
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    diff: Optional[Dict[str, Any]] = None
    request_uri: Optional[str] = None
    has_data_changes: bool = True
    integrity_hash: Optional[str] = None
    prev_log_id: Optional[int] = None
    prev_integrity_hash: Optional[str] = None
    chain_verified: bool = True

class AuditLogListResponse(BaseModel):
    total: int
    page: int
    limit: int
    has_more: bool
    items: List[AuditLogItemResponse]

class AuditExportRequest(BaseModel):
    format: str = Field(default="EXCEL", description="EXCEL | PDF | CSV")
    action: Optional[str] = None
    actor_query: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AuditExportResponse(BaseModel):
    download_url: str
    format: str
    total_records: int
    summary_text: str
    generated_at: datetime
    message: str = "Đã xuất nhật ký thành công"

class AuditBlockVerificationItem(BaseModel):
    log_id: int
    action: str
    created_at: datetime
    actor_name: str
    prev_hash_prefix: str
    current_hash: str
    is_valid: bool = True

class AuditChainVerificationResponse(BaseModel):
    is_valid: bool
    total_records_checked: int
    genesis_hash: str
    merkle_root_hash: str
    verified_at: datetime
    broken_at_log_id: Optional[int] = None
    message: str
    blocks_sample: List[AuditBlockVerificationItem] = []
