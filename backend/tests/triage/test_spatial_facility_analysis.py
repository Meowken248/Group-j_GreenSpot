import unittest
import uuid
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine
from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog
from app.services.spatial_facility_service import (
    SpatialFacilityService,
    FacilityBufferQueryFilter,
    FacilityAlertRequest,
)


class TestSpatialFacilityAnalysisTDD(unittest.IsolatedAsyncioTestCase):
    """Kiểm thử TDD cho STT 40: Phân tích không gian tìm kiếm các cơ sở thiết yếu quanh sự cố"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

    async def asyncTearDown(self):
        await self.session.close()
        await engine.dispose()

    async def test_01_query_facilities_within_buffer_1km_default(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        query_filter = FacilityBufferQueryFilter(
            incident_id=inc.incident_id,
            radius_meters=1000.0,
            facility_types=["Trường học", "Bệnh viện", "Trạm y tế"],
        )
        results = await SpatialFacilityService.get_facilities_in_buffer(self.session, query_filter)
        self.assertGreaterEqual(len(results), 4)

        distances = [r.distance_meters for r in results]
        self.assertEqual(distances, sorted(distances))

        closest = results[0]
        self.assertIn("Lê Lợi", closest.facility_name)
        self.assertLess(closest.distance_meters, 100.0)
        self.assertTrue(closest.is_danger_proximity)
        self.assertTrue(closest.is_immediate_risk)

    async def test_02_query_facilities_with_radius_500m(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        query_filter = FacilityBufferQueryFilter(
            incident_id=inc.incident_id,
            radius_meters=500.0,
            facility_types=["Trường học", "Bệnh viện", "Trạm y tế"],
        )
        results = await SpatialFacilityService.get_facilities_in_buffer(self.session, query_filter)
        for r in results:
            self.assertLessEqual(r.distance_meters, 500.0)

    async def test_03_filter_by_facility_type(self):
        stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res = await self.session.execute(stmt)
        inc = res.scalars().first()
        self.assertIsNotNone(inc)

        query_filter = FacilityBufferQueryFilter(
            incident_id=inc.incident_id,
            radius_meters=1000.0,
            facility_types=["Trường học"],
        )
        results = await SpatialFacilityService.get_facilities_in_buffer(self.session, query_filter)
        self.assertGreaterEqual(len(results), 2)
        for r in results:
            self.assertEqual(r.facility_type, "Trường học")

        counts = await SpatialFacilityService.count_facilities_by_type_in_buffer(
            db=self.session,
            incident_id=inc.incident_id,
            radius_meters=1000.0,
        )
        self.assertGreaterEqual(counts.get("Trường học", 0), 2)
        self.assertGreaterEqual(counts.get("Bệnh viện", 0), 1)
        self.assertGreaterEqual(counts.get("Trạm y tế", 0), 1)

    def test_04_validation_empty_facility_types(self):
        with self.assertRaises(ValueError):
            FacilityBufferQueryFilter(
                incident_id=uuid.uuid4(),
                radius_meters=1000.0,
                facility_types=[],
            )

    async def test_05_get_facility_detail_profile(self):
        stmt = select(EssentialFacility).where(EssentialFacility.facility_name.like("%Lê Lợi%"))
        res = await self.session.execute(stmt)
        fac = res.scalars().first()
        self.assertIsNotNone(fac)

        detail = await SpatialFacilityService.get_facility_detail(self.session, fac.facility_id)
        self.assertEqual(detail.facility_id, fac.facility_id)
        self.assertIsNotNone(detail.contact_phone)
        self.assertIsNotNone(detail.contact_person)
        self.assertIn("Mức dễ tổn thương", detail.vulnerability_level)

    async def test_06_send_emergency_alert_and_audit_log(self):
        stmt_inc = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
        res_inc = await self.session.execute(stmt_inc)
        inc = res_inc.scalars().first()

        stmt_fac = select(EssentialFacility).where(EssentialFacility.facility_name.like("%Lê Lợi%"))
        res_fac = await self.session.execute(stmt_fac)
        fac = res_fac.scalars().first()

        req = FacilityAlertRequest(
            incident_id=inc.incident_id,
            facility_id=fac.facility_id,
            message_text="Cảnh báo: Bãi rác ngõ 128 Lê Lợi bốc mùi nồng nặc gần trường học, đề nghị đóng cửa sổ phòng học.",
            operator_id=inc.reporter_id,
        )
        response = await SpatialFacilityService.send_emergency_alert(self.session, req)
        self.assertTrue(response.success)
        self.assertEqual(response.message, "Đã gửi thông báo cảnh báo môi trường đến cơ sở")

        audit_stmt = select(IncidentAuditLog).where(
            IncidentAuditLog.incident_id == inc.incident_id,
            IncidentAuditLog.action == "FACILITY_ALERT_SENT",
        )
        audit_res = await self.session.execute(audit_stmt)
        audit_log = audit_res.scalars().all()[-1]
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.metadata_json.get("facility_id"), fac.facility_id)
