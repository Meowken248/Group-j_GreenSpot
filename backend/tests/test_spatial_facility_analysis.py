import pytest
import uuid
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog
from app.services.spatial_facility_service import (
    SpatialFacilityService,
    FacilityBufferQueryFilter,
    FacilityAlertRequest,
)


@pytest.mark.asyncio
class TestSpatialFacilityAnalysisTDD:
    """Kiểm thử TDD cho STT 40: Phân tích không gian tìm kiếm các cơ sở thiết yếu quanh sự cố"""

    async def test_01_query_facilities_within_buffer_1km_default(self):
        async with AsyncSessionLocal() as db:
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            # Bán kính 1km (1000m) mặc định, lọc cả 3 loại cơ sở
            query_filter = FacilityBufferQueryFilter(
                incident_id=inc.incident_id,
                radius_meters=1000.0,
                facility_types=["Trường học", "Bệnh viện", "Trạm y tế"],
            )
            results = await SpatialFacilityService.get_facilities_in_buffer(db, query_filter)
            assert len(results) >= 4  # Lê Lợi (45m), BV Q1 (140m), Chu Văn An (180m), Bến Nghé (270m), Cầu Kho (650m)

            # Đảm bảo sắp xếp từ gần nhất đến xa nhất
            distances = [r.distance_meters for r in results]
            assert distances == sorted(distances)

            # Cơ sở gần nhất là Trường Tiểu học Lê Lợi (~45m)
            closest = results[0]
            assert "Lê Lợi" in closest.facility_name
            assert closest.distance_meters < 100.0
            assert closest.is_danger_proximity is True
            assert closest.is_immediate_risk is True

    async def test_02_query_facilities_with_radius_500m(self):
        async with AsyncSessionLocal() as db:
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            # Bán kính 500m
            query_filter = FacilityBufferQueryFilter(
                incident_id=inc.incident_id,
                radius_meters=500.0,
                facility_types=["Trường học", "Bệnh viện", "Trạm y tế"],
            )
            results = await SpatialFacilityService.get_facilities_in_buffer(db, query_filter)
            for r in results:
                assert r.distance_meters <= 500.0

    async def test_03_filter_by_facility_type(self):
        async with AsyncSessionLocal() as db:
            stmt = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res = await db.execute(stmt)
            inc = res.scalars().first()
            assert inc is not None

            # Chỉ lọc Trường học
            query_filter = FacilityBufferQueryFilter(
                incident_id=inc.incident_id,
                radius_meters=1000.0,
                facility_types=["Trường học"],
            )
            results = await SpatialFacilityService.get_facilities_in_buffer(db, query_filter)
            assert len(results) >= 2
            for r in results:
                assert r.facility_type == "Trường học"

            # Đếm số lượng theo danh mục cho thanh Quick Filter
            counts = await SpatialFacilityService.count_facilities_by_type_in_buffer(
                db=db,
                incident_id=inc.incident_id,
                radius_meters=1000.0,
            )
            assert counts.get("Trường học", 0) >= 2
            assert counts.get("Bệnh viện", 0) >= 1
            assert counts.get("Trạm y tế", 0) >= 1

    def test_04_validation_empty_facility_types(self):
        # Chưa chọn loại cơ sở nào mà bấm tìm -> Báo lỗi "Vui lòng chọn ít nhất một loại cơ sở thiết yếu"
        with pytest.raises(ValueError, match="Vui lòng chọn ít nhất một loại cơ sở thiết yếu"):
            FacilityBufferQueryFilter(
                incident_id=uuid.uuid4(),
                radius_meters=1000.0,
                facility_types=[],
            )

    async def test_05_get_facility_detail_profile(self):
        async with AsyncSessionLocal() as db:
            stmt = select(EssentialFacility).where(EssentialFacility.facility_name.like("%Lê Lợi%"))
            res = await db.execute(stmt)
            fac = res.scalars().first()
            assert fac is not None

            detail = await SpatialFacilityService.get_facility_detail(db, fac.facility_id)
            assert detail.facility_id == fac.facility_id
            assert detail.contact_phone is not None
            assert detail.contact_person is not None
            assert "Mức dễ tổn thương" in detail.vulnerability_level

    async def test_06_send_emergency_alert_and_audit_log(self):
        async with AsyncSessionLocal() as db:
            stmt_inc = select(Incident).where(Incident.tracking_code == "INC-2026-3901")
            res_inc = await db.execute(stmt_inc)
            inc = res_inc.scalars().first()

            stmt_fac = select(EssentialFacility).where(EssentialFacility.facility_name.like("%Lê Lợi%"))
            res_fac = await db.execute(stmt_fac)
            fac = res_fac.scalars().first()

            req = FacilityAlertRequest(
                incident_id=inc.incident_id,
                facility_id=fac.facility_id,
                message_text="Cảnh báo: Bãi rác ngõ 128 Lê Lợi bốc mùi nồng nặc gần trường học, đề nghị đóng cửa sổ phòng học.",
                operator_id=inc.reporter_id,
            )
            response = await SpatialFacilityService.send_emergency_alert(db, req)
            assert response.success is True
            assert response.message == "Đã gửi thông báo cảnh báo môi trường đến cơ sở"

            # Kiểm tra bản ghi audit log
            audit_stmt = select(IncidentAuditLog).where(
                IncidentAuditLog.incident_id == inc.incident_id,
                IncidentAuditLog.action == "FACILITY_ALERT_SENT",
            )
            audit_res = await db.execute(audit_stmt)
            audit_log = audit_res.scalars().all()[-1]
            assert audit_log is not None
            assert audit_log.metadata_json.get("facility_id") == fac.facility_id
