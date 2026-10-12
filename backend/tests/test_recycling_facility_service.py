import unittest
import asyncio
from datetime import datetime
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.spatial import RecyclingFacility
from app.models.audit_log import AuditLog
from app.schemas.recycling_facility import (
    RecyclingFacilityCreateRequest,
    RecyclingFacilityUpdateRequest,
)
from app.services.recycling_facility_service import (
    is_within_hcmc_bounds,
    generate_qr_code,
    list_facilities,
    get_facility_by_id,
    create_facility,
    update_facility,
    delete_facility,
    check_name_unique,
    check_proximity,
)


class TestRecyclingFacilityValidation(unittest.TestCase):
    def test_is_within_hcmc_bounds(self):
        self.assertTrue(is_within_hcmc_bounds(10.7769, 106.7009))
        self.assertTrue(is_within_hcmc_bounds(10.8494, 106.7584))
        self.assertFalse(is_within_hcmc_bounds(21.0285, 105.8542))
        self.assertFalse(is_within_hcmc_bounds(16.0544, 108.2022))

    def test_generate_qr_code(self):
        code = "REC-Q1-01"
        qr = generate_qr_code(code)
        self.assertTrue(qr.startswith(f"GREENSPOT-{code}-"))
        self.assertGreater(len(qr), len(code) + 12)

    def test_validation_operating_hours(self):
        req = RecyclingFacilityCreateRequest(
            name="Trạm Test Tái Chế",
            address="123 Nguyễn Huệ",
            unit_id=3,
            latitude=10.7769,
            longitude=106.7009,
            accepted_waste_types=["PIN_CU", "NHUA"],
            open_time="08:00",
            close_time="17:00",
        )
        self.assertEqual(req.open_time, "08:00")
        self.assertEqual(req.close_time, "17:00")

        with self.assertRaises(ValueError):
            RecyclingFacilityCreateRequest(
                name="Trạm Test Lỗi Giờ",
                address="123 Nguyễn Huệ",
                unit_id=3,
                latitude=10.7769,
                longitude=106.7009,
                accepted_waste_types=["PIN_CU"],
                open_time="17:00",
                close_time="08:00",
            )

    def test_validation_empty_waste_types(self):
        with self.assertRaises(ValueError):
            RecyclingFacilityCreateRequest(
                name="Trạm Test Không Loại Rác",
                address="123 Nguyễn Huệ",
                unit_id=3,
                latitude=10.7769,
                longitude=106.7009,
                accepted_waste_types=[],
                open_time="08:00",
                close_time="17:00",
            )


class TestRecyclingFacilityIntegration(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

        adm_res = await self.session.execute(
            select(User).where(User.email == "admin@ecoreport.gov.vn")
        )
        self.admin = adm_res.scalars().first()
        self.assertIsNotNone(self.admin, "Cần có tài khoản admin@ecoreport.gov.vn trong CSDL")

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    async def test_list_facilities(self):
        res = await list_facilities(self.session, page=1, limit=10, status_filter="ALL")
        self.assertGreaterEqual(res.total, 6)
        self.assertGreaterEqual(len(res.items), 6)
        self.assertGreaterEqual(res.active_count, 1)

    async def test_create_and_update_and_delete_facility_lifecycle(self):
        # 1. Tạo trạm mới tại vị trí hợp lệ
        create_req = RecyclingFacilityCreateRequest(
            name="Trạm Tái Chế Thử Nghiệm Tự Động",
            address="999 Đỗ Xuân Hợp, Phước Long B, TP. Thủ Đức",
            unit_id=2,  # TP. Thủ Đức
            latitude=10.8250,
            longitude=106.7750,
            accepted_waste_types=["PIN_CU", "THIET_BI_DIEN_TU"],
            open_time="07:00",
            close_time="18:00",
            contact_phone="028.9999.8888",
            managing_org="Công ty TNHH Môi Trường Xanh",
        )
        created = await create_facility(self.session, self.admin, create_req)
        self.assertIsNotNone(created.facility_id)
        self.assertTrue(created.facility_code.startswith("REC-"))
        self.assertTrue(created.qr_code.startswith("GREENSPOT-REC-"))
        self.assertEqual(created.name, "Trạm Tái Chế Thử Nghiệm Tự Động")

        # 2. Sửa thông tin trạm - đảm bảo mã trạm và mã QR không đổi
        update_req = RecyclingFacilityUpdateRequest(
            name="Trạm Tái Chế Thử Nghiệm Tự Động (Đã Cập Nhật)",
            address="999 Đỗ Xuân Hợp, Phước Long B, TP. Thủ Đức",
            unit_id=2,
            latitude=10.8251,
            longitude=106.7751,
            accepted_waste_types=["PIN_CU", "THIET_BI_DIEN_TU", "NHUA"],
            open_time="07:30",
            close_time="18:30",
            is_active=True,
            contact_phone="028.9999.8888",
            managing_org="Công ty TNHH Môi Trường Xanh",
        )
        updated = await update_facility(self.session, self.admin, created.facility_id, update_req)
        self.assertEqual(updated.facility_code, created.facility_code)
        self.assertEqual(updated.qr_code, created.qr_code)
        self.assertEqual(updated.name, "Trạm Tái Chế Thử Nghiệm Tự Động (Đã Cập Nhật)")

        # 3. Xoá mềm trạm
        del_res = await delete_facility(self.session, self.admin, created.facility_id)
        self.assertTrue(del_res["success"])

        # 4. Xác nhận trạm không còn xuất hiện trong danh sách quản lý
        with self.assertRaises(Exception):
            await get_facility_by_id(self.session, created.facility_id)


if __name__ == "__main__":
    unittest.main()

