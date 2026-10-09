import unittest
import uuid
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine
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


class TestAITriageServiceUnit(unittest.TestCase):
    """Kiểm thử đơn vị các thành phần logic và thuật toán TPS của AI Triage Service (Non-async)"""

    def test_01_tps_formula_calculation(self):
        # TPS = min(100, BaseSeverity * 0.40 + ProximityRisk * 0.30 + ScaleFactor * 0.20 + UrgencyNLP * 0.10)
        # TH1: Tối đa
        tps_max = compute_tps_score(base_severity=100, proximity_risk=100, scale_factor=100, urgency_nlp=100)
        self.assertEqual(tps_max, 100.0)

        # TH2: Vượt 100 điểm phải được chặn ở 100
        tps_over = compute_tps_score(base_severity=120, proximity_risk=100, scale_factor=100, urgency_nlp=100)
        self.assertEqual(tps_over, 100.0)

        # TH3: Sự cố mẫu Lê Lợi (Base=60, Proximity=100, Scale=100, Urgency=80)
        # 60*0.4 (24) + 100*0.3 (30) + 100*0.2 (20) + 80*0.1 (8) = 82
        tps_sample = compute_tps_score(base_severity=60, proximity_risk=100, scale_factor=100, urgency_nlp=80)
        self.assertEqual(tps_sample, 82.0)

        # TH4: Cành cây khô nhỏ xa khu dân cư (Base=25, Proximity=0, Scale=35, Urgency=0)
        # 25*0.4 (10) + 0*0.3 (0) + 35*0.2 (7) + 0*0.1 (0) = 17
        tps_low = compute_tps_score(base_severity=25, proximity_risk=0, scale_factor=35, urgency_nlp=0)
        self.assertEqual(tps_low, 17.0)

    def test_02_proximity_risk_brackets(self):
        # d <= 50m -> 100 điểm; 50 < d <= 150m -> 75 điểm; 150 < d <= 300m -> 50 điểm; d > 300m -> 0 điểm
        self.assertEqual(calculate_proximity_risk(45.0), 100.0)
        self.assertEqual(calculate_proximity_risk(50.0), 100.0)
        self.assertEqual(calculate_proximity_risk(51.0), 75.0)
        self.assertEqual(calculate_proximity_risk(140.0), 75.0)
        self.assertEqual(calculate_proximity_risk(150.0), 75.0)
        self.assertEqual(calculate_proximity_risk(180.0), 50.0)
        self.assertEqual(calculate_proximity_risk(300.0), 50.0)
        self.assertEqual(calculate_proximity_risk(301.0), 0.0)
        self.assertEqual(calculate_proximity_risk(None), 0.0)

    def test_03_scale_factor_brackets(self):
        # > 20m2 -> 100; 5 - 20m2 -> 70; < 5m2 -> 35
        self.assertEqual(calculate_scale_factor(25.0), 100.0)
        self.assertEqual(calculate_scale_factor(20.1), 100.0)
        self.assertEqual(calculate_scale_factor(20.0), 70.0)
        self.assertEqual(calculate_scale_factor(15.0), 70.0)
        self.assertEqual(calculate_scale_factor(5.0), 70.0)
        self.assertEqual(calculate_scale_factor(4.9), 35.0)
        self.assertEqual(calculate_scale_factor(1.0), 35.0)
        self.assertEqual(calculate_scale_factor(None), 35.0)

    def test_04_urgency_nlp_extraction(self):
        text_critical = "Bãi rác bốc khói có nguy cơ cháy nổ lớn và ngập sâu khi triều cường tràn về"
        score, keywords = extract_urgency_nlp(text_critical)
        self.assertGreaterEqual(score, 80.0)
        self.assertTrue("cháy" in keywords or "nổ" in keywords or "ngập sâu" in keywords)

        text_calm = "Rác lá cây khô rơi rải rác trên vỉa hè"
        score_calm, keywords_calm = extract_urgency_nlp(text_calm)
        self.assertEqual(score_calm, 0.0)
        self.assertEqual(len(keywords_calm), 0)

    def test_05_sla_brackets_mapping(self):
        p1, tag1, rec1, res1 = determine_sla_and_priority(85.0)
        self.assertEqual(p1, "Khẩn cấp")
        self.assertEqual(tag1, "CRITICAL")
        self.assertEqual(rec1, 30)
        self.assertEqual(res1, 4)

        p2, tag2, rec2, res2 = determine_sla_and_priority(72.0)
        self.assertEqual(p2, "Cao")
        self.assertEqual(tag2, "HIGH")
        self.assertEqual(rec2, 120)
        self.assertEqual(res2, 12)

        p3, tag3, rec3, res3 = determine_sla_and_priority(55.0)
        self.assertEqual(p3, "Trung bình")
        self.assertEqual(tag3, "MEDIUM")
        self.assertEqual(rec3, 240)
        self.assertEqual(res3, 24)

        p4, tag4, rec4, res4 = determine_sla_and_priority(25.0)
        self.assertEqual(p4, "Thấp")
        self.assertEqual(tag4, "LOW")
        self.assertEqual(rec4, 480)
        self.assertEqual(res4, 48)

    def test_06_edge_case_short_description(self):
        summary, is_short = AITriageService.generate_summary("Rác bẩn")
        self.assertTrue(is_short)
        self.assertIn("Mô tả sự cố quá ngắn để AI tóm tắt", summary)

        long_desc = "Bãi rác thải sinh hoạt ùn ứ dài khoảng 15m chắn lối đi ngõ 128 Lê Lợi bốc mùi nồng nặc tràn xuống cống."
        summary_ok, is_short_ok = AITriageService.generate_summary(long_desc)
        self.assertFalse(is_short_ok)
        self.assertGreater(len(summary_ok), 20)
        self.assertLess(len(summary_ok.split()), 60)


class TestIncidentTriageAPI(unittest.IsolatedAsyncioTestCase):
    """Kiểm thử tích hợp API Triage, XAI, Chấp nhận và Can thiệp Human-in-the-loop"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

    async def asyncTearDown(self):
        await self.session.close()
        await engine.dispose()

    async def test_07_get_incident_triage_detail_success(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        eval_result: TriageEvaluationResult = await AITriageService.evaluate_incident(self.session, inc.incident_id)
        self.assertEqual(eval_result.incident_id, inc.incident_id)
        self.assertIn(eval_result.ai_suggested_priority, ["Khẩn cấp", "Cao", "Trung bình", "Thấp"])
        self.assertTrue(0 <= eval_result.ai_triage_score <= 100)
        self.assertIsNotNone(eval_result.sla_response_hours)
        self.assertIsNotNone(eval_result.sla_resolve_hours)
        self.assertGreater(len(eval_result.risk_factors), 0)

    async def test_08_regenerate_summary_success(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        new_summary = await AITriageService.regenerate_summary(self.session, inc.incident_id)
        self.assertIsNotNone(new_summary)
        self.assertGreater(len(new_summary), 10)

    async def test_09_accept_ai_priority_success(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        current_ver = inc.version
        updated_inc = await AITriageService.accept_ai_priority(
            db=self.session,
            incident_id=inc.incident_id,
            operator_id=inc.reporter_id,
            expected_version=current_ver,
        )
        self.assertEqual(updated_inc.version, current_ver + 1)
        self.assertEqual(updated_inc.severity, inc.ai_suggested_priority)

        log_stmt = select(IncidentAuditLog).where(
            IncidentAuditLog.incident_id == inc.incident_id,
            IncidentAuditLog.action == "PRIORITY_ACCEPTED",
        )
        log_res = await self.session.execute(log_stmt)
        log = log_res.scalars().first()
        self.assertIsNotNone(log)
        self.assertEqual(log.new_priority, inc.ai_suggested_priority)

    async def test_10_override_priority_human_in_the_loop_with_reason(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        with self.assertRaises(ValueError):
            await AITriageService.override_priority(
                db=self.session,
                incident_id=inc.incident_id,
                new_priority="Khẩn cấp",
                reason="   ",
                operator_id=inc.reporter_id,
                expected_version=inc.version,
            )

        valid_reason = "Bãi rác chắn cổng trường học, cần điều xe dọn gấp trước giờ học sinh tan trường"
        current_ver = inc.version
        updated_inc = await AITriageService.override_priority(
            db=self.session,
            incident_id=inc.incident_id,
            new_priority="Khẩn cấp",
            reason=valid_reason,
            operator_id=inc.reporter_id,
            expected_version=current_ver,
        )
        self.assertEqual(updated_inc.version, current_ver + 1)
        self.assertEqual(updated_inc.severity, "Khẩn cấp")
        self.assertEqual(updated_inc.priority_modified_reason, valid_reason)

        log_stmt = select(IncidentAuditLog).where(
            IncidentAuditLog.incident_id == inc.incident_id,
            IncidentAuditLog.action == "PRIORITY_OVERRIDDEN",
        )
        log_res = await self.session.execute(log_stmt)
        latest_log = log_res.scalars().all()[-1]
        self.assertEqual(latest_log.new_priority, "Khẩn cấp")
        self.assertEqual(latest_log.reason, valid_reason)

    async def test_11_optimistic_locking_conflict(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as cm:
            await AITriageService.override_priority(
                db=self.session,
                incident_id=inc.incident_id,
                new_priority="Trung bình",
                reason="Điều chỉnh thử nghiệm sai version",
                operator_id=inc.reporter_id,
                expected_version=inc.version + 999,
            )
        self.assertEqual(cm.exception.status_code, 409)


class TestTriageHttpEndpoints(unittest.TestCase):
    """Kiểm thử HTTP REST API Endpoints bằng sync TestClient"""

    def test_12_http_api_endpoints_coverage(self):
        from fastapi.testclient import TestClient
        from app.main import app

        with TestClient(app) as client:
            # 1. Test GET /api/v1/incidents/triage/list
            r_list = client.get("/api/v1/incidents/triage/list")
            self.assertEqual(r_list.status_code, 200)
            items = r_list.json()
            self.assertIsInstance(items, list)
            self.assertGreater(len(items), 0)

            sample_id = items[0]["incident_id"]

            # 2. Test GET /api/v1/incidents/triage/{id}
            r_detail = client.get(f"/api/v1/incidents/triage/{sample_id}")
            self.assertEqual(r_detail.status_code, 200)
            data = r_detail.json()
            self.assertIn("ai_triage_score", data)
            self.assertIn("risk_factors", data)
            self.assertIn("ai_suggested_priority", data)

            # 3. Test POST /api/v1/incidents/triage/{id}/regenerate
            r_regen = client.post(f"/api/v1/incidents/triage/{sample_id}/regenerate")
            self.assertEqual(r_regen.status_code, 200)
            self.assertIn("ai_summary", r_regen.json())

            # 4. Test GET /api/v1/incidents/triage/{id}/audit-logs
            r_logs = client.get(f"/api/v1/incidents/triage/{sample_id}/audit-logs")
            self.assertEqual(r_logs.status_code, 200)
            self.assertIsInstance(r_logs.json(), list)

            # 5. Test STT 40: POST /api/v1/spatial/facilities/buffer
            r_buf = client.post(
                "/api/v1/spatial/facilities/buffer",
                json={
                    "incident_id": sample_id,
                    "radius_meters": 1000.0,
                    "facility_types": ["Trường học", "Bệnh viện", "Trạm y tế"],
                }
            )
            self.assertEqual(r_buf.status_code, 200)
            buf_data = r_buf.json()
            self.assertIn("facilities", buf_data)
            self.assertGreaterEqual(buf_data["total_found"], 1)
