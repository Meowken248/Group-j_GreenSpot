import unittest
import uuid
from typing import Dict, List, Optional, Tuple
from unittest.mock import AsyncMock, patch

from sqlalchemy.ext.asyncio import AsyncSession
from app.interface.triage.spatial_facility_interface import ISpatialFacilityRepository
from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog
from app.services.spatial_facility_service import (
    SpatialFacilityService,
    FacilityBufferQueryFilter,
    FacilityAlertRequest,
)


class MockSpatialFacilityRepository(ISpatialFacilityRepository):
    """
    Mock Repository in-memory tuân thủ ISpatialFacilityRepository (DIP),
    không phụ thuộc vào hạ tầng PostgreSQL/PostGIS.
    """

    def __init__(self):
        self.inc_id = uuid.uuid4()
        self.reporter_id = uuid.uuid4()

        self.incident = Incident(
            incident_id=self.inc_id,
            tracking_code="INC-2026-3901",
            title="Bãi rác tự phát ngõ 128 Lê Lợi",
            description="Bãi rác thải sinh hoạt ùn ứ dài khoảng 15m chắn lối đi ngõ 128 Lê Lợi bốc mùi nồng nặc.",
            address_text="128 Lê Lợi, Phường Bến Nghé, Quận 1",
            latitude=10.7745,
            longitude=106.7032,
            reporter_id=self.reporter_id,
        )

        # 5 cơ sở mẫu quanh ngõ 128 Lê Lợi
        self.raw_facilities = [
            (1, "Trường Tiểu học Lê Lợi", "Trường học", "128 Lê Lợi, Q.1", "02838221234", "Mức dễ tổn thương cao", 10.7748, 106.7035),
            (2, "Trường THPT Bến Nghé", "Trường học", "150 Lê Lợi, Q.1", "02838225678", "Mức dễ tổn thương trung bình", 10.7765, 106.7045),
            (3, "Bệnh viện Đa khoa Sài Gòn", "Bệnh viện", "125 Lê Lợi, Q.1", "02838291711", "Mức dễ tổn thương rất cao", 10.7725, 106.7015),
            (4, "Trạm Y tế Phường Bến Nghé", "Trạm y tế", "45 Pasteur, Q.1", "02838229999", "Mức dễ tổn thương cao", 10.7780, 106.7060),
            (5, "Trường Mầm non Tuổi Thơ", "Trường học", "100 Pasteur, Q.1", "02838228888", "Mức dễ tổn thương rất cao", 10.7800, 106.7080),
        ]

        self.audit_logs: List[IncidentAuditLog] = []

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        if incident_id == self.inc_id:
            return self.incident
        return None

    async def get_facilities_in_bounding_box(
        self,
        db: AsyncSession,
        facility_types: List[str],
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
    ) -> List[Tuple[int, str, str, str, Optional[str], Optional[str], float, float]]:
        res = []
        for f in self.raw_facilities:
            f_id, name, f_type, addr, phone, vuln, lat, lng = f
            if f_type in facility_types:
                if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
                    res.append(f)
        return res

    async def get_facility_with_coords(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[Tuple[EssentialFacility, float, float]]:
        for f in self.raw_facilities:
            if f[0] == facility_id:
                fac = EssentialFacility(
                    facility_id=f[0],
                    facility_name=f[1],
                    facility_type=f[2],
                    address=f[3],
                    contact_phone=f[4],
                    vulnerability_level=f[5],
                    contact_person="Nguyễn Văn A (Đại diện cơ sở)",
                )
                return fac, f[6], f[7]
        return None

    async def get_facility_by_id(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[EssentialFacility]:
        for f in self.raw_facilities:
            if f[0] == facility_id:
                return EssentialFacility(
                    facility_id=f[0],
                    facility_name=f[1],
                    facility_type=f[2],
                    address=f[3],
                    contact_phone=f[4],
                    vulnerability_level=f[5],
                    contact_person="Nguyễn Văn A (Đại diện cơ sở)",
                )
        return None

    async def count_facilities_by_type_in_bounding_box(
        self,
        db: AsyncSession,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
    ) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for f in self.raw_facilities:
            lat, lng = f[6], f[7]
            if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
                ftype = f[2]
                counts[ftype] = counts.get(ftype, 0) + 1
        return counts

    async def save_audit_log(
        self, db: AsyncSession, audit_log: IncidentAuditLog
    ) -> None:
        self.audit_logs.append(audit_log)


class TestSpatialFacilityAnalysisTDD(unittest.IsolatedAsyncioTestCase):
    """Kiểm thử TDD cho STT 40: Phân tích không gian tìm kiếm các cơ sở thiết yếu quanh sự cố"""

    async def asyncSetUp(self):
        self.mock_repo = MockSpatialFacilityRepository()
        self.session = AsyncMock(spec=AsyncSession)

        # Patch spatial_facility_repository
        self.patcher1 = patch("app.services.triage.spatial_facility_service.spatial_facility_repository", self.mock_repo)
        self.patcher2 = patch("app.api.v1.triage.spatial_facilities.spatial_facility_repository", self.mock_repo)
        self.patcher1.start()
        self.patcher2.start()

    async def asyncTearDown(self):
        self.patcher1.stop()
        self.patcher2.stop()

    async def test_01_query_facilities_within_buffer_1km_default(self):
        inc = self.mock_repo.incident
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
        inc = self.mock_repo.incident
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
        inc = self.mock_repo.incident
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
        fac = await self.mock_repo.get_facility_by_id(self.session, 1)
        self.assertIsNotNone(fac)

        detail = await SpatialFacilityService.get_facility_detail(self.session, fac.facility_id)
        self.assertEqual(detail.facility_id, fac.facility_id)
        self.assertIsNotNone(detail.contact_phone)
        self.assertIsNotNone(detail.contact_person)
        self.assertIn("Mức dễ tổn thương", detail.vulnerability_level)

    async def test_06_send_emergency_alert_and_audit_log(self):
        inc = self.mock_repo.incident
        fac = await self.mock_repo.get_facility_by_id(self.session, 1)

        req = FacilityAlertRequest(
            incident_id=inc.incident_id,
            facility_id=fac.facility_id,
            message_text="Cảnh báo: Bãi rác ngõ 128 Lê Lợi bốc mùi nồng nặc gần trường học, đề nghị đóng cửa sổ phòng học.",
            operator_id=inc.reporter_id,
        )
        response = await SpatialFacilityService.send_emergency_alert(self.session, req)
        self.assertTrue(response.success)
        self.assertEqual(response.message, "Đã gửi thông báo cảnh báo môi trường đến cơ sở")

        self.assertGreaterEqual(len(self.mock_repo.audit_logs), 1)
        audit_log = self.mock_repo.audit_logs[-1]
        self.assertEqual(audit_log.action, "FACILITY_ALERT_SENT")
        self.assertEqual(audit_log.metadata_json.get("facility_id"), fac.facility_id)


if __name__ == "__main__":
    unittest.main()
