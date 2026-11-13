import unittest
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from unittest.mock import AsyncMock, patch

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.database import get_db
from app.interface.triage.triage_interface import ITriageRepository
from app.interface.triage.spatial_facility_interface import ISpatialFacilityRepository
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


class MockTriageRepository(ITriageRepository):
    """Mock repository in-memory cho nghiệp vụ thẩm định sự cố AI Triage."""

    def __init__(self):
        self.reporter_id = uuid.uuid4()
        self.inc_id = uuid.uuid4()
        self.operator_id = self.reporter_id

        self.category = WasteCategory(
            category_id=1,
            category_code="DOMESTIC",
            name="Rác sinh hoạt",
        )

        self.incident = Incident(
            incident_id=self.inc_id,
            tracking_code="INC-2026-3901",
            title="Bãi rác tự phát ngõ 128 Lê Lợi",
            description="Bãi rác thải sinh hoạt ùn ứ dài khoảng 15m chắn lối đi ngõ 128 Lê Lợi bốc mùi nồng nặc tràn xuống cống có nguy cơ cháy nổ.",
            address_text="128 Lê Lợi, Phường Bến Nghé, Quận 1",
            location="SRID=4326;POINT(106.7032 10.7745)",
            latitude=10.7745,
            longitude=106.7032,
            estimated_volume_m3=12.0,
            status="PENDING",
            category_id=1,
            category=self.category,
            reporter_id=self.reporter_id,
            version=1,
            severity="Cao",
            ai_suggested_priority="Cao",
            ai_triage_score=82.0,
            ai_summary="Bãi rác sinh hoạt ngõ 128 Lê Lợi bốc mùi nồng nặc và có nguy cơ cháy nổ.",
            created_at=datetime.now(timezone.utc),
        )

        self.incidents = {self.inc_id: self.incident}
        self.categories = {1: self.category}
        self.audit_logs: List[IncidentAuditLog] = []

    async def get_triage_incidents_list(
        self, db: AsyncSession, limit: int = 20
    ) -> List[Incident]:
        return list(self.incidents.values())[:limit]

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        return self.incidents.get(incident_id)

    async def get_incident_detail_with_relations(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        return self.incidents.get(incident_id)

    async def get_waste_category_by_id(
        self, db: AsyncSession, category_id: int
    ) -> Optional[WasteCategory]:
        return self.categories.get(category_id)

    async def get_nearest_sensitive_facility(
        self, db: AsyncSession, incident_lat: float, incident_lng: float
    ) -> Tuple[Optional[str], Optional[float]]:
        return ("Trường Tiểu học Lê Lợi", 45.0)

    async def get_incident_audit_logs(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> List[IncidentAuditLog]:
        return [l for l in self.audit_logs if l.incident_id == incident_id]

    async def commit_changes(self, db: AsyncSession) -> None:
        pass

    async def save_audit_log(
        self, db: AsyncSession, audit_log: IncidentAuditLog
    ) -> None:
        self.audit_logs.append(audit_log)


class MockSpatialFacilityRepositoryForTriage(ISpatialFacilityRepository):
    """Mock repository in-memory cho STT 40 phục vụ test endpoint."""

    def __init__(self, incident: Incident):
        self.incident = incident
        self.audit_logs: List[IncidentAuditLog] = []
        self.facilities = [
            (1, "Trường Tiểu học Lê Lợi", "Trường học", "128 Lê Lợi, Q.1", "02838221234", "Mức dễ tổn thương cao", 10.7748, 106.7035),
            (2, "Bệnh viện Đa khoa Sài Gòn", "Bệnh viện", "125 Lê Lợi, Q.1", "02838291711", "Mức dễ tổn thương rất cao", 10.7720, 106.7000),
            (3, "Trạm Y tế Bến Nghé", "Trạm y tế", "45 Pasteur, Q.1", "02838229999", "Mức dễ tổn thương cao", 10.7780, 106.7060),
        ]

    async def get_incident_by_id(self, db: AsyncSession, incident_id: uuid.UUID) -> Optional[Incident]:
        if incident_id == self.incident.incident_id:
            return self.incident
        return None

    async def get_facilities_in_bounding_box(
        self, db: AsyncSession, facility_types: List[str], min_lat: float, max_lat: float, min_lng: float, max_lng: float
    ):
        return [f for f in self.facilities if f[2] in facility_types]

    async def get_facility_with_coords(self, db: AsyncSession, facility_id: int):
        for f in self.facilities:
            if f[0] == facility_id:
                fac = EssentialFacility(
                    facility_id=f[0],
                    facility_name=f[1],
                    facility_type=f[2],
                    address=f[3],
                    contact_phone=f[4],
                    vulnerability_level=f[5],
                    contact_person="Hiệu trưởng / Giám đốc",
                )
                return fac, f[6], f[7]
        return None

    async def get_facility_by_id(self, db: AsyncSession, facility_id: int):
        for f in self.facilities:
            if f[0] == facility_id:
                return EssentialFacility(
                    facility_id=f[0],
                    facility_name=f[1],
                    facility_type=f[2],
                    address=f[3],
                    contact_phone=f[4],
                    vulnerability_level=f[5],
                )
        return None

    async def save_audit_log(self, db: AsyncSession, audit_log: IncidentAuditLog) -> None:
        self.audit_logs.append(audit_log)


class TestAITriageServiceUnit(unittest.TestCase):
    """Kiểm thử đơn vị các thành phần logic và thuật toán TPS của AI Triage Service (Non-async)"""

    def test_01_tps_formula_calculation(self):
        tps_max = compute_tps_score(base_severity=100, proximity_risk=100, scale_factor=100, urgency_nlp=100)
        self.assertEqual(tps_max, 100.0)

        tps_over = compute_tps_score(base_severity=120, proximity_risk=100, scale_factor=100, urgency_nlp=100)
        self.assertEqual(tps_over, 100.0)

        tps_sample = compute_tps_score(base_severity=60, proximity_risk=100, scale_factor=100, urgency_nlp=80)
        self.assertEqual(tps_sample, 82.0)

        tps_low = compute_tps_score(base_severity=25, proximity_risk=0, scale_factor=35, urgency_nlp=0)
        self.assertEqual(tps_low, 17.0)

    def test_02_proximity_risk_brackets(self):
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
        self.mock_repo = MockTriageRepository()
        self.session = AsyncMock(spec=AsyncSession)

        # Patch triage_repository
        self.patcher1 = patch("app.services.triage.triage_ai_service.triage_repository", self.mock_repo)
        self.patcher2 = patch("app.api.v1.triage.incidents_triage.triage_repository", self.mock_repo)
        self.patcher3 = patch("app.services.triage.triage_ai_service.call_kira_ai", AsyncMock(return_value="Bản tóm tắt sự cố ngõ 128 Lê Lợi do AI tạo lại."))
        self.patcher1.start()
        self.patcher2.start()
        self.patcher3.start()

    async def asyncTearDown(self):
        self.patcher1.stop()
        self.patcher2.stop()
        self.patcher3.stop()

    async def test_07_get_incident_triage_detail_success(self):
        inc = self.mock_repo.incident
        self.assertIsNotNone(inc)

        eval_result: TriageEvaluationResult = await AITriageService.evaluate_incident(self.session, inc.incident_id)
        self.assertEqual(eval_result.incident_id, inc.incident_id)
        self.assertIn(eval_result.ai_suggested_priority, ["Khẩn cấp", "Cao", "Trung bình", "Thấp"])
        self.assertTrue(0 <= eval_result.ai_triage_score <= 100)
        self.assertIsNotNone(eval_result.sla_response_hours)
        self.assertIsNotNone(eval_result.sla_resolve_hours)
        self.assertGreater(len(eval_result.risk_factors), 0)

    async def test_08_regenerate_summary_success(self):
        inc = self.mock_repo.incident
        self.assertIsNotNone(inc)

        new_summary = await AITriageService.regenerate_summary(self.session, inc.incident_id)
        self.assertIsNotNone(new_summary)
        self.assertGreater(len(new_summary), 10)

    async def test_09_accept_ai_priority_success(self):
        inc = self.mock_repo.incident
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

        logs = await self.mock_repo.get_incident_audit_logs(self.session, inc.incident_id)
        self.assertGreaterEqual(len(logs), 1)
        latest_log = logs[-1]
        self.assertEqual(latest_log.action, "PRIORITY_ACCEPTED")
        self.assertEqual(latest_log.new_priority, inc.ai_suggested_priority)

    async def test_10_override_priority_human_in_the_loop_with_reason(self):
        inc = self.mock_repo.incident
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

        logs = await self.mock_repo.get_incident_audit_logs(self.session, inc.incident_id)
        latest_log = logs[-1]
        self.assertEqual(latest_log.action, "PRIORITY_OVERRIDDEN")
        self.assertEqual(latest_log.new_priority, "Khẩn cấp")
        self.assertEqual(latest_log.reason, valid_reason)

    async def test_11_optimistic_locking_conflict(self):
        inc = self.mock_repo.incident
        self.assertIsNotNone(inc)

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
        from app.main import app
        from app.api.v1.rbac import get_current_active_user
        from app.models.rbac import User, Role

        mock_repo = MockTriageRepository()
        mock_spatial_repo = MockSpatialFacilityRepositoryForTriage(mock_repo.incident)
        operator_uuid = uuid.UUID("33333333-3333-3333-3333-333333333333")

        async def override_get_db():
            yield AsyncMock(spec=AsyncSession)

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        try:
            with patch("app.api.v1.triage.incidents_triage.triage_repository", mock_repo), \
                 patch("app.services.triage.triage_ai_service.triage_repository", mock_repo), \
                 patch("app.api.v1.triage.spatial_facilities.spatial_facility_repository", mock_spatial_repo), \
                 patch("app.services.triage.spatial_facility_service.spatial_facility_repository", mock_spatial_repo), \
                 patch("app.services.triage.triage_ai_service.call_kira_ai", AsyncMock(return_value="Bản tóm tắt sự cố ngõ 128 Lê Lợi do AI tạo lại.")):
                sample_id = str(mock_repo.incident.incident_id)

                # 0. Không đăng nhập -> bị chặn 401
                r_unauth = client.get("/api/v1/incidents/triage/list")
                self.assertEqual(r_unauth.status_code, 401)
                r_accept_unauth = client.post(
                    f"/api/v1/incidents/triage/{sample_id}/accept",
                    json={"version": mock_repo.incident.version},
                )
                self.assertEqual(r_accept_unauth.status_code, 401)
                r_alert_unauth = client.post(
                    "/api/v1/spatial/facilities/alert",
                    json={"incident_id": sample_id, "facility_id": 1, "message_text": "Test"},
                )
                self.assertEqual(r_alert_unauth.status_code, 401)

                # 0b. CITIZEN -> bị chặn 403
                async def _citizen_user():
                    return User(
                        user_id=uuid.uuid4(),
                        email="citizen@greenspot.vn",
                        full_name="Citizen",
                        status="ACTIVE",
                        role=Role(role_code="CITIZEN", role_name="CITIZEN"),
                    )

                app.dependency_overrides[get_current_active_user] = _citizen_user
                r_cit = client.get("/api/v1/incidents/triage/list")
                self.assertEqual(r_cit.status_code, 403)

                # 0c. OFFICER / COORDINATOR hợp lệ -> được phép & ghi nhận đúng operator_id
                async def _officer_user():
                    return User(
                        user_id=operator_uuid,
                        email="officer@greenspot.vn",
                        full_name="Officer Triage",
                        status="ACTIVE",
                        role=Role(role_code="OFFICER", role_name="OFFICER"),
                    )

                app.dependency_overrides[get_current_active_user] = _officer_user

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

                # 3b. Test POST /api/v1/incidents/triage/{id}/accept ghi nhận đúng operator_id từ JWT
                r_acc = client.post(
                    f"/api/v1/incidents/triage/{sample_id}/accept",
                    json={"version": data["version"]},
                )
                self.assertEqual(r_acc.status_code, 200)
                self.assertEqual(mock_repo.audit_logs[-1].performed_by, operator_uuid)

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

                # 6. Test STT 40: alert & call-log ghi nhận đúng operator_id từ JWT
                r_call = client.post(
                    f"/api/v1/spatial/facilities/call-log?incident_id={sample_id}&facility_id=1"
                )
                self.assertEqual(r_call.status_code, 200)
                self.assertEqual(mock_spatial_repo.audit_logs[-1].performed_by, operator_uuid)
        finally:
            app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
