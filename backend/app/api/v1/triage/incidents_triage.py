"""
API Router: AI Tự động tóm tắt nội dung sự cố & Đề xuất mức ưu tiên xử lý (STT 39)
 Chi tiết sự cố + Tóm tắt AI
 Bảng giải trình căn cứ ra quyết định của thuật toán AI (Explainable AI - XAI)
 Popup Tùy chỉnh và điều chỉnh mức độ ưu tiên xử lý sự cố (Human-in-the-loop)
"""

import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.localization import get_current_language
from app.services.translation.translation_service import translation_service
from app.database import get_db
from app.models.incident import Incident, WasteCategory, IncidentMedia
from app.models.spatial import AdministrativeUnit
from app.models.audit_log import IncidentAuditLog
from app.models.rbac import User, Role
from app.schemas.triage import (
    TriageEvaluationResponse,
    RegenerateSummaryResponse,
    AcceptPriorityRequest,
    OverridePriorityRequest,
    TriageActionResponse,
)
from app.crud.triage.triage_repository import triage_repository
from app.services.triage_ai_service import AITriageService
from app.api.v1.rbac import require_roles_or_permission

router = APIRouter(prefix="/incidents/triage", tags=["AI Incident Triage & Priority (STT 39)"])

ALLOWED_TRIAGE_ROLES = {"ADMIN", "OFFICER", "DISTRICT_MANAGER", "COORDINATOR", "RESPONDER"}

require_triage_view = require_roles_or_permission(
    allowed_roles=ALLOWED_TRIAGE_ROLES,
    module="INCIDENTS",
    action="VIEW",
    deny_message="Chỉ Quản trị viên, Cán bộ điều phối và Đội phản ứng mới có quyền xem phân loại AI Triage.",
)
require_triage_action = require_roles_or_permission(
    allowed_roles=ALLOWED_TRIAGE_ROLES,
    module="INCIDENTS",
    action="UPDATE",
    deny_message="Chỉ Quản trị viên, Cán bộ điều phối và Đội phản ứng mới có quyền thao tác phân loại AI Triage.",
)


@router.get("/list")
async def get_triage_incidents_list(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    _current_user: User = Depends(require_triage_view),
):
    """Lấy danh sách các sự cố cần thẩm định AI Triage qua TriageRepository"""
    incidents = await triage_repository.get_triage_incidents_list(db, limit)

    output = []
    for inc in incidents:
        media_urls = [m.file_url for m in inc.media if m.file_url]
        output.append({
            "incident_id": inc.incident_id,
            "tracking_code": inc.tracking_code,
            "title": inc.title,
            "description": inc.description,
            "address_text": inc.address_text,
            "latitude": float(inc.latitude),
            "longitude": float(inc.longitude),
            "severity": inc.severity,
            "ai_suggested_priority": inc.ai_suggested_priority or "Cao",
            "ai_triage_score": float(inc.ai_triage_score or inc.risk_score or 50.0),
            "ai_summary": inc.ai_summary,
            "media_urls": media_urls,
            "created_at": inc.created_at,
            "version": inc.version,
        })
    if get_current_language(request) == "en":
        return await translation_service.translate_data(
            output,
            target_lang="en",
            source_lang="vi",
            target_keys=["severity", "status", "ai_suggested_priority", "priority_color"],
        )
    return output


@router.get("/{incident_id}", response_model=TriageEvaluationResponse)
async def get_incident_triage_detail(
    incident_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_triage_view),
):
    """
    Màn 1/3 &  Lấy thông tin chi tiết sự cố, tóm tắt AI và bảng giải trình XAI
    """
    inc = await triage_repository.get_incident_detail_with_relations(db, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")

    # Đánh giá bằng AI Triage Service
    eval_result = await AITriageService.evaluate_incident(db, incident_id)

    media_urls = [m.file_url for m in inc.media if m.file_url]
    reporter_name = inc.reporter.full_name if inc.reporter else "Công dân ẩn danh"

    res = TriageEvaluationResponse(
        incident_id=inc.incident_id,
        tracking_code=inc.tracking_code,
        title=inc.title,
        description=inc.description,
        address_text=inc.address_text,
        latitude=float(inc.latitude),
        longitude=float(inc.longitude),
        media_urls=media_urls,
        reporter_name=reporter_name,
        created_at=inc.created_at,
        ai_summary=eval_result.ai_summary,
        is_too_short=eval_result.is_too_short,
        summary_message=eval_result.summary_message,
        ai_triage_score=eval_result.ai_triage_score,
        ai_suggested_priority=eval_result.ai_suggested_priority,
        priority_color=eval_result.priority_color,
        sla_response_hours=eval_result.sla_response_hours,
        sla_resolve_hours=eval_result.sla_resolve_hours,
        base_severity_score=eval_result.base_severity_score,
        proximity_risk_score=eval_result.proximity_risk_score,
        scale_factor_score=eval_result.scale_factor_score,
        urgency_nlp_score=eval_result.urgency_nlp_score,
        risk_factors=eval_result.risk_factors,
        nearby_sensitive_facility=eval_result.nearby_sensitive_facility,
        current_priority=inc.severity,
        status=inc.status,
        version=inc.version,
    )
    if get_current_language(request) == "en":
        dumped = res.model_dump()
        return await translation_service.translate_data(
            dumped,
            target_lang="en",
            source_lang="vi",
            target_keys=["current_priority", "status", "ai_suggested_priority", "priority_color", "risk_factors"],
        )
    return res


@router.post("/{incident_id}/regenerate", response_model=RegenerateSummaryResponse)
async def regenerate_ai_summary(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_triage_action),
):
    """
    Nút "Tạo lại tóm tắt": Yêu cầu mô hình AI phân tích và kết xuất bản tóm tắt khác
    """
    new_summary = await AITriageService.regenerate_summary(db, incident_id)
    return RegenerateSummaryResponse(
        incident_id=incident_id,
        ai_summary=new_summary,
        generated_at=datetime.utcnow(),
    )


@router.post("/{incident_id}/accept", response_model=TriageActionResponse)
async def accept_ai_priority(
    incident_id: uuid.UUID,
    payload: AcceptPriorityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_triage_action),
):
    """
    Màn 2/3 Nút "Chấp nhận": Đồng thuận với gợi ý của AI, áp dụng mức ưu tiên vào phiếu việc
    """
    updated_inc = await AITriageService.accept_ai_priority(
        db=db,
        incident_id=incident_id,
        operator_id=current_user.user_id,
        expected_version=payload.version,
    )

    return TriageActionResponse(
        success=True,
        message=f"Đã thiết lập mức độ ưu tiên: {updated_inc.severity}",
        incident_id=updated_inc.incident_id,
        updated_priority=updated_inc.severity,
        sla_deadline=updated_inc.sla_deadline,
        new_version=updated_inc.version,
    )


@router.post("/{incident_id}/override", response_model=TriageActionResponse)
async def override_ai_priority(
    incident_id: uuid.UUID,
    payload: OverridePriorityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_triage_action),
):
    """
    Màn 3/3 Popup Xác nhận đổi mức ưu tiên (Human-in-the-loop).
    Bắt buộc nhập lý do vào ô Ghi chú. Kiểm tra Optimistic locking (HTTP 409).
    """
    try:
        updated_inc = await AITriageService.override_priority(
            db=db,
            incident_id=incident_id,
            new_priority=payload.new_priority,
            reason=payload.reason,
            operator_id=current_user.user_id,
            expected_version=payload.version,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    return TriageActionResponse(
        success=True,
        message="Đã cập nhật mức ưu tiên mới thành công",
        incident_id=updated_inc.incident_id,
        updated_priority=updated_inc.severity,
        sla_deadline=updated_inc.sla_deadline,
        new_version=updated_inc.version,
    )


@router.get("/{incident_id}/audit-logs")
async def get_incident_audit_logs(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_triage_view),
):
    """Lấy toàn bộ nhật ký kiểm toán Human-in-the-loop của sự cố qua TriageRepository"""
    logs = await triage_repository.get_incident_audit_logs(db, incident_id)

    return [
        {
            "log_id": l.log_id,
            "action": l.action,
            "old_priority": l.old_priority,
            "new_priority": l.new_priority,
            "risk_score": l.risk_score,
            "reason": l.reason,
            "performed_by_name": l.operator.full_name if l.operator else "AI Engine",
            "created_at": l.created_at,
        }
        for l in logs
    ]
