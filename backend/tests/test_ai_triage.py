import pytest
import uuid
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.incident import Incident, WasteCategory
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog
from app.models.rbac import User, Role
from app.services.triage_ai_service import (
    AITriageService,
    TriageEvaluationResult,
    calculate_proximity_risk,
    calculate_scale_factor,
    extract_urgency_nlp,
    compute_tps_score,
    determine_sla_and_priority,
)


@pytest.mark.asyncio
class TestAITriageServiceUnit:
    """Kiểm thử đơn vị các thành phần logic và thuật toán TPS của AI Triage Service"""

    def test_01_tps_formula_calculation(self):
        # TPS = min(100, BaseSeverity * 0.40 + ProximityRisk * 0.30 + ScaleFactor * 0.20 + UrgencyNLP * 0.10)
        # TH1: Tối đa
        tps_max = compute_tps_score(base_severity=100, proximity_risk=100, scale_factor=100, urgency_nlp=100)
        assert tps_max == 100.0

        # TH2: Vượt 100 điểm phải được chặn ở 100
        tps_over = compute_tps_score(base_severity=120, proximity_risk=100, scale_factor=100, urgency_nlp=100)
        assert tps_over == 100.0

        # TH3: Sự cố mẫu Lê Lợi (Base=60, Proximity=100, Scale=100, Urgency=80)
        # 60*0.4 (24) + 100*0.3 (30) + 100*0.2 (20) + 80*0.1 (8) = 82
        tps_sample = compute_tps_score(base_severity=60, proximity_risk=100, scale_factor=100, urgency_nlp=80)
        assert tps_sample == 82.0

        # TH4: Cành cây khô nhỏ xa khu dân cư (Base=25, Proximity=0, Scale=35, Urgency=0)
        # 25*0.4 (10) + 0*0.3 (0) + 35*0.2 (7) + 0*0.1 (0) = 17
        tps_low = compute_tps_score(base_severity=25, proximity_risk=0, scale_factor=35, urgency_nlp=0)
        assert tps_low == 17.0

    def test_02_proximity_risk_brackets(self):
        # d <= 50m -> 100 điểm; 50 < d <= 150m -> 75 điểm; 150 < d <= 300m -> 50 điểm; d > 300m -> 0 điểm
        assert calculate_proximity_risk(45.0) == 100.0
        assert calculate_proximity_risk(50.0) == 100.0
        assert calculate_proximity_risk(51.0) == 75.0
        assert calculate_proximity_risk(140.0) == 75.0
        assert calculate_proximity_risk(150.0) == 75.0
        assert calculate_proximity_risk(180.0) == 50.0
        assert calculate_proximity_risk(300.0) == 50.0
        assert calculate_proximity_risk(301.0) == 0.0
        assert calculate_proximity_risk(None) == 0.0

    def test_03_scale_factor_brackets(self):
        # > 20m2 -> 100; 5 - 20m2 -> 70; < 5m2 -> 35
        assert calculate_scale_factor(25.0) == 100.0
        assert calculate_scale_factor(20.1) == 100.0
        assert calculate_scale_factor(20.0) == 70.0
        assert calculate_scale_factor(15.0) == 70.0
        assert calculate_scale_factor(5.0) == 70.0
        assert calculate_scale_factor(4.9) == 35.0
        assert calculate_scale_factor(1.0) == 35.0
        assert calculate_scale_factor(None) == 35.0

    def test_04_urgency_nlp_extraction(self):
        # Phát hiện từ khóa khẩn cấp: cháy, nổ, ngập sâu, chết máy, bốc mùi nồng nặc, ruồi nhặng bùng phát dịch bệnh
        text_critical = "Bãi rác bốc khói có nguy cơ cháy nổ lớn và ngập sâu khi triều cường tràn về"
        score, keywords = extract_urgency_nlp(text_critical)
        assert score >= 80.0
        assert "cháy" in keywords or "nổ" in keywords or "ngập sâu" in keywords

        text_calm = "Rác lá cây khô rơi rải rác trên vỉa hè"
        score_calm, keywords_calm = extract_urgency_nlp(text_calm)
        assert score_calm == 0.0
        assert len(keywords_calm) == 0

    def test_05_sla_brackets_mapping(self):
        # Khẩn cấp (Critical - TPS >= 80): Gán nhãn Đỏ. SLA tiếp nhận: < 30 phút; SLA hoàn thành: < 4 giờ.
        p1, tag1, rec1, res1 = determine_sla_and_priority(85.0)
        assert p1 == "Khẩn cấp"
        assert tag1 == "CRITICAL"
        assert rec1 == 30
        assert res1 == 4

        # Cao (High - 60 <= TPS < 80): Gán nhãn Cam. SLA tiếp nhận: < 2 giờ; SLA hoàn thành: < 12 giờ.
        p2, tag2, rec2, res2 = determine_sla_and_priority(72.0)
        assert p2 == "Cao"
        assert tag2 == "HIGH"
        assert rec2 == 120
        assert res2 == 12

        # Trung bình (Medium - 40 <= TPS < 60): Gán nhãn Vàng. SLA tiếp nhận: < 4 giờ; SLA hoàn thành: < 24 giờ.
        p3, tag3, rec3, res3 = determine_sla_and_priority(55.0)
        assert p3 == "Trung bình"
        assert tag3 == "MEDIUM"
        assert rec3 == 240
        assert res3 == 24

        # Thấp (Low - TPS < 40): Gán nhãn Xanh lục. SLA tiếp nhận: < 8 giờ; SLA hoàn thành: < 48 giờ.
        p4, tag4, rec4, res4 = determine_sla_and_priority(25.0)
        assert p4 == "Thấp"
        assert tag4 == "LOW"
        assert rec4 == 480
        assert res4 == 48

    def test_06_edge_case_short_description(self):
        # Mô tả của công dân quá ngắn (< 10 ký tự)
        # Message: "Mô tả sự cố quá ngắn để AI tóm tắt"
        # Cột Tóm tắt AI hiển thị nguyên văn nội dung kèm ghi chú
        summary, is_short = AITriageService.generate_summary("Rác bẩn")
        assert is_short is True
        assert "Mô tả sự cố quá ngắn để AI tóm tắt" in summary

        # Mô tả hợp lệ >= 10 ký tự
        long_desc = "Bãi rác thải sinh hoạt ùn ứ dài khoảng 15m chắn lối đi ngõ 128 Lê Lợi bốc mùi nồng nặc tràn xuống cống."
        summary_ok, is_short_ok = AITriageService.generate_summary(long_desc)
        assert is_short_ok is False
        assert len(summary_ok) > 20
        assert len(summary_ok.split()) < 60  # Đảm bảo cô đọng < 50-60 từ


@pytest.mark.asyncio
class TestIncidentTriageAPI:
    """Kiểm thử TDD tích hợp toàn diện API Triage, XAI, Chấp nhận và Can thiệp Human-in-the-loop"""

    async def test_07_get_incident_triage_detail_success(self):
        async with AsyncSessionLocal() as db:
            # Lấy sự cố mẫu đã seed
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            # Gọi evaluation từ service
            eval_result: TriageEvaluationResult = await AITriageService.evaluate_incident(db, inc.incident_id)
            assert eval_result.incident_id == inc.incident_id
            assert eval_result.ai_suggested_priority in ["Khẩn cấp", "Cao", "Trung bình", "Thấp"]
            assert eval_result.ai_triage_score >= 0 and eval_result.ai_triage_score <= 100
            assert eval_result.sla_response_hours is not None
            assert eval_result.sla_resolve_hours is not None
            assert len(eval_result.risk_factors) > 0

    async def test_08_regenerate_summary_success(self):
        async with AsyncSessionLocal() as db:
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            new_summary = await AITriageService.regenerate_summary(db, inc.incident_id)
            assert new_summary is not None
            assert len(new_summary) > 10

    async def test_09_accept_ai_priority_success(self):
        async with AsyncSessionLocal() as db:
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            current_ver = inc.version
            updated_inc = await AITriageService.accept_ai_priority(
                db=db,
                incident_id=inc.incident_id,
                operator_id=inc.reporter_id,
                expected_version=current_ver,
            )
            assert updated_inc.version == current_ver + 1
            assert updated_inc.severity == inc.ai_suggested_priority

            # Kiểm tra Audit Log đã được ghi nhận
            log_stmt = select(IncidentAuditLog).where(
                IncidentAuditLog.incident_id == inc.incident_id,
                IncidentAuditLog.action == "PRIORITY_ACCEPTED",
            )
            log_res = await db.execute(log_stmt)
            log = log_res.scalars().first()
            assert log is not None
            assert log.new_priority == inc.ai_suggested_priority

    async def test_10_override_priority_human_in_the_loop_with_reason(self):
        async with AsyncSessionLocal() as db:
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            # Bắt buộc phải có lý do (nếu rỗng sẽ quăng ValueError)
            with pytest.raises(ValueError, match="Vui lòng nhập lý do thay đổi mức ưu tiên"):
                await AITriageService.override_priority(
                    db=db,
                    incident_id=inc.incident_id,
                    new_priority="Khẩn cấp",
                    reason="   ",  # Trống
                    operator_id=inc.reporter_id,
                    expected_version=inc.version,
                )

            # Cập nhật hợp lệ với lý do <= 200 ký tự
            valid_reason = "Bãi rác chắn cổng trường học, cần điều xe dọn gấp trước giờ học sinh tan trường"
            current_ver = inc.version
            updated_inc = await AITriageService.override_priority(
                db=db,
                incident_id=inc.incident_id,
                new_priority="Khẩn cấp",
                reason=valid_reason,
                operator_id=inc.reporter_id,
                expected_version=current_ver,
            )
            assert updated_inc.version == current_ver + 1
            assert updated_inc.severity == "Khẩn cấp"
            assert updated_inc.priority_modified_reason == valid_reason

            # Kiểm tra Audit Log
            log_stmt = select(IncidentAuditLog).where(
                IncidentAuditLog.incident_id == inc.incident_id,
                IncidentAuditLog.action == "PRIORITY_OVERRIDDEN",
            )
            log_res = await db.execute(log_stmt)
            latest_log = log_res.scalars().all()[-1]
            assert latest_log.new_priority == "Khẩn cấp"
            assert latest_log.reason == valid_reason

    async def test_11_optimistic_locking_conflict(self):
        async with AsyncSessionLocal() as db:
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            # Gửi sai version -> Bị chặn với lỗi Optimistic Lock Conflict
            from fastapi import HTTPException
            with pytest.raises(HTTPException) as excinfo:
                await AITriageService.override_priority(
                    db=db,
                    incident_id=inc.incident_id,
                    new_priority="Trung bình",
                    reason="Điều chỉnh thử nghiệm sai version",
                    operator_id=inc.reporter_id,
                    expected_version=inc.version + 999,  # Sai version
                )
            assert excinfo.value.status_code == 409
