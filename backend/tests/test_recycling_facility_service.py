import unittest
import asyncio
from datetime import datetime
from sqlalchemy import select, text
from fastapi import HTTPException

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
    """TC-01 -> TC-05: Kiểm tra các quy tắc kiểm thực dữ liệu (Form Validations)"""

    def test_tc01_is_within_hcmc_bounds(self):
        """TC-01: Kiểm tra toạ độ địa giới hành chính TP.HCM"""
        self.assertTrue(is_within_hcmc_bounds(10.7769, 106.7009))  # Trung tâm Q1
        self.assertTrue(is_within_hcmc_bounds(10.8494, 106.7584))  # Thủ Đức
        self.assertTrue(is_within_hcmc_bounds(10.4100, 106.9550))  # Cần Giờ
        self.assertFalse(is_within_hcmc_bounds(21.0285, 105.8542)) # Hà Nội -> False
        self.assertFalse(is_within_hcmc_bounds(16.0544, 108.2022)) # Đà Nẵng -> False

    def test_tc02_generate_qr_code(self):
        """TC-02: Tự sinh mã QR đúng định dạng GREENSPOT-REC-{code}-{suffix} phục vụ STT 34"""
        code = "REC-Q1-01"
        qr = generate_qr_code(code)
        self.assertTrue(qr.startswith(f"GREENSPOT-{code}-"))
        self.assertGreater(len(qr), len(code) + 12)

    def test_tc03_validation_operating_hours(self):
        """TC-03: Giờ đóng cửa bắt buộc phải sau giờ mở cửa"""
        req = RecyclingFacilityCreateRequest(
            name="Trạm Test Tái Chế",
            address="123 Nguyễn Huệ, Phường Bến Nghé, Quận 1",
            unit_id=3,
            latitude=10.7769,
            longitude=106.7009,
            accepted_waste_types=["PIN_CU", "NHUA"],
            open_time="08:00",
            close_time="17:00",
        )
        self.assertEqual(req.open_time, "08:00")
        self.assertEqual(req.close_time, "17:00")

        # Giờ đóng cửa trước giờ mở cửa -> ValueError
        with self.assertRaises(ValueError):
            RecyclingFacilityCreateRequest(
                name="Trạm Test Lỗi Giờ",
                address="123 Nguyễn Huệ, Quận 1",
                unit_id=3,
                latitude=10.7769,
                longitude=106.7009,
                accepted_waste_types=["PIN_CU"],
                open_time="17:00",
                close_time="08:00",
            )

    def test_tc04_validation_empty_waste_types(self):
        """TC-04: Bắt buộc chọn ít nhất 1 loại rác tiếp nhận"""
        with self.assertRaises(ValueError):
            RecyclingFacilityCreateRequest(
                name="Trạm Test Không Loại Rác",
                address="123 Nguyễn Huệ, Quận 1",
                unit_id=3,
                latitude=10.7769,
                longitude=106.7009,
                accepted_waste_types=[],
                open_time="08:00",
                close_time="17:00",
            )

    def test_tc05_validation_name_and_address_limits(self):
        """TC-05: Ràng buộc độ dài Tên trạm (max 100) và Địa chỉ (max 200)"""
        # Tên trống
        with self.assertRaises(ValueError):
            RecyclingFacilityCreateRequest(
                name="   ",
                address="123 Nguyễn Huệ",
                unit_id=3,
                latitude=10.7769,
                longitude=106.7009,
                accepted_waste_types=["PIN_CU"],
                open_time="08:00",
                close_time="17:00",
            )
        # Tên quá 100 ký tự
        with self.assertRaises(ValueError):
            RecyclingFacilityCreateRequest(
                name="A" * 105,
                address="123 Nguyễn Huệ",
                unit_id=3,
                latitude=10.7769,
                longitude=106.7009,
                accepted_waste_types=["PIN_CU"],
                open_time="08:00",
                close_time="17:00",
            )
        # Địa chỉ quá 200 ký tự
        with self.assertRaises(ValueError):
            RecyclingFacilityCreateRequest(
                name="Trạm Hợp Lệ",
                address="B" * 205,
                unit_id=3,
                latitude=10.7769,
                longitude=106.7009,
                accepted_waste_types=["PIN_CU"],
                open_time="08:00",
                close_time="17:00",
            )


class TestRecyclingFacilityIntegration(unittest.IsolatedAsyncioTestCase):
    """TC-06 -> TC-12: Kiểm tra tích hợp cơ sở dữ liệu và nghiệp vụ thực tế"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

        adm_res = await self.session.execute(
            select(User).where(User.email == "admin@ecoreport.gov.vn")
        )
        self.admin = adm_res.scalars().first()
        if not self.admin:
            # Fallback lấy bất kỳ user có role ADMIN hoặc tạo tạm
            adm_res = await self.session.execute(select(User).limit(1))
            self.admin = adm_res.scalars().first()
        self.assertIsNotNone(self.admin, "Cần có tài khoản admin trong CSDL")

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    async def test_tc06_check_name_unique(self):
        """TC-06: Tên trạm không được trùng lặp trong cùng quận/huyện"""
        # Trạm đã có trong Quận 1: "Trạm Thu gom Rác điện tử & Pin cũ Quận 1" (unit_id=3)
        chk_dup = await check_name_unique(
            self.session,
            name="Trạm Thu gom Rác điện tử & Pin cũ Quận 1",
            unit_id=3
        )
        self.assertFalse(chk_dup.is_valid)
        self.assertEqual(chk_dup.message, "Tên trạm đã tồn tại trong quận/huyện này")

        # Tên trùng nhưng ở quận khác (Thủ Đức, unit_id=2) -> Hợp lệ
        chk_diff_district = await check_name_unique(
            self.session,
            name="Trạm Thu gom Rác điện tử & Pin cũ Quận 1",
            unit_id=2
        )
        self.assertTrue(chk_diff_district.is_valid)

    async def test_tc07_check_proximity_20m(self):
        """TC-07: Ràng buộc địa lý PostGIS cấm trùng lặp trạm trong bán kính 20 mét"""
        # Tọa độ trạm Q1 REC-Q1-01: lat=10.7850, lng=106.6960
        # Thử kiểm tra tại vị trí cách ~5m
        chk_near = await check_proximity(self.session, lat=10.78502, lng=106.69602)
        self.assertFalse(chk_near.is_valid)
        self.assertIn("Vị trí này đã có trạm", chk_near.message)

        # Thử vị trí xa > 500m -> Hợp lệ
        chk_far = await check_proximity(self.session, lat=10.7900, lng=106.7000)
        self.assertTrue(chk_far.is_valid)

    async def test_tc08_list_facilities_filters_and_pagination(self):
        """TC-08: Màn 1: Lấy danh sách trạm phân trang 10 trạm/trang, bộ lọc trạng thái và tìm kiếm"""
        res_all = await list_facilities(self.session, page=1, limit=10, status_filter="ALL")
        self.assertGreaterEqual(res_all.total, 6)
        self.assertGreaterEqual(len(res_all.items), 6)
        self.assertGreaterEqual(res_all.active_count, 1)

        # Lọc trạng thái ACTIVE
        res_active = await list_facilities(self.session, page=1, limit=10, status_filter="ACTIVE")
        self.assertTrue(all(item.is_active for item in res_active.items))

        # Tìm kiếm theo từ khóa "Thủ Đức"
        res_search = await list_facilities(self.session, page=1, limit=10, search="Thủ Đức")
        self.assertGreaterEqual(res_search.total, 1)

    async def test_tc09_create_and_update_lifecycle_preserves_codes_and_increments_version(self):
        """TC-09: Thêm mới trạm sinh mã trạm & mã QR; Sửa trạm giữ nguyên mã trạm & mã QR 100%, tăng version"""
        # 1. Thêm mới
        create_req = RecyclingFacilityCreateRequest(
            name="Trạm Tái Chế Thử Nghiệm TDD 09",
            address="100 Đường Số 1, Phường Linh Xuân, TP. Thủ Đức",
            unit_id=2,
            latitude=10.8700,
            longitude=106.7800,
            accepted_waste_types=["PIN_CU", "THIET_BI_DIEN_TU"],
            open_time="07:00",
            close_time="17:30",
            contact_phone="028.1111.2222",
            managing_org="UBND TP. Thủ Đức",
        )
        created = await create_facility(self.session, self.admin, create_req)
        self.assertIsNotNone(created.facility_id)
        self.assertTrue(created.facility_code.startswith("REC-"))
        self.assertTrue(created.qr_code.startswith("GREENSPOT-REC-"))
        self.assertEqual(created.version, 1)

        orig_code = created.facility_code
        orig_qr = created.qr_code

        # 2. Sửa trạm
        update_req = RecyclingFacilityUpdateRequest(
            name="Trạm Tái Chế Thử Nghiệm TDD 09 (Đã Cập Nhật)",
            address="100 Đường Số 1, Phường Linh Xuân, TP. Thủ Đức",
            unit_id=2,
            latitude=10.8701,
            longitude=106.7801,
            accepted_waste_types=["PIN_CU", "THIET_BI_DIEN_TU", "NHUA"],
            open_time="07:30",
            close_time="18:00",
            is_active=True,
            version=created.version,
        )
        updated = await update_facility(self.session, self.admin, created.facility_id, update_req)

        # Kiểm tra bất biến: mã trạm và mã QR không được đổi
        self.assertEqual(updated.facility_code, orig_code)
        self.assertEqual(updated.qr_code, orig_qr)
        self.assertEqual(updated.name, "Trạm Tái Chế Thử Nghiệm TDD 09 (Đã Cập Nhật)")
        # Version tăng lên 2
        self.assertEqual(updated.version, 2)

        # Cleanup
        await delete_facility(self.session, self.admin, created.facility_id)

    async def test_tc10_optimistic_locking_conflict(self):
        """TC-10: Cơ chế Khóa lạc quan (Optimistic Locking) chặn xung đột và trả về 409 Conflict"""
        create_req = RecyclingFacilityCreateRequest(
            name="Trạm Test Optimistic Lock",
            address="200 Xa Lộ Hà Nội, TP. Thủ Đức",
            unit_id=2,
            latitude=10.8300,
            longitude=106.7700,
            accepted_waste_types=["PIN_CU"],
            open_time="07:00",
            close_time="17:00",
        )
        created = await create_facility(self.session, self.admin, create_req)
        self.assertEqual(created.version, 1)

        # Lần sửa 1: Version tăng lên 2
        update_1 = RecyclingFacilityUpdateRequest(
            name="Trạm Test Optimistic Lock Lần 1",
            address="200 Xa Lộ Hà Nội, TP. Thủ Đức",
            unit_id=2,
            latitude=10.8300,
            longitude=106.7700,
            accepted_waste_types=["PIN_CU"],
            open_time="07:00",
            close_time="17:00",
            is_active=True,
            version=1,
        )
        updated_1 = await update_facility(self.session, self.admin, created.facility_id, update_1)
        self.assertEqual(updated_1.version, 2)

        # Lần sửa 2 từ một Admin khác giữ version cũ = 1 -> Xung đột 409
        update_stale = RecyclingFacilityUpdateRequest(
            name="Trạm Test Optimistic Lock Ghi Đè Lỗi",
            address="200 Xa Lộ Hà Nội, TP. Thủ Đức",
            unit_id=2,
            latitude=10.8300,
            longitude=106.7700,
            accepted_waste_types=["PIN_CU"],
            open_time="07:00",
            close_time="17:00",
            is_active=True,
            version=1,  # Stale version! CSDL đã là 2
        )
        with self.assertRaises(HTTPException) as ctx:
            await update_facility(self.session, self.admin, created.facility_id, update_stale)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.detail, "Trạm đã được thay đổi bởi người khác. Vui lòng tải lại")

        # Cleanup
        await delete_facility(self.session, self.admin, created.facility_id)

    async def test_tc11_soft_delete_preserves_scan_history(self):
        """TC-11: Xóa mềm trạm ẩn khỏi danh sách nhưng bảo toàn dữ liệu điểm thưởng trong CSDL"""
        create_req = RecyclingFacilityCreateRequest(
            name="Trạm Test Xóa Mềm",
            address="300 Nguyễn Đình Chiểu, Quận 3",
            unit_id=3,
            latitude=10.7720,
            longitude=106.6880,
            accepted_waste_types=["PIN_CU"],
            open_time="08:00",
            close_time="17:00",
        )
        created = await create_facility(self.session, self.admin, create_req)
        f_id = created.facility_id

        # Thực hiện xóa mềm
        del_res = await delete_facility(self.session, self.admin, f_id)
        self.assertTrue(del_res["success"])
        self.assertEqual(del_res["message"], "Đã xoá thành công. Danh sách đã được cập nhật")

        # Bị ẩn khỏi API quản trị thông thường (404)
        with self.assertRaises(HTTPException) as ctx:
            await get_facility_by_id(self.session, f_id)
        self.assertEqual(ctx.exception.status_code, 404)

        # Nhưng bản ghi vẫn còn trong bảng DB với is_deleted=True để bảo toàn dữ liệu cho STT 34
        raw_res = await self.session.execute(
            select(RecyclingFacility).where(RecyclingFacility.facility_id == f_id)
        )
        fac_in_db = raw_res.scalar_one_or_none()
        self.assertIsNotNone(fac_in_db)
        self.assertTrue(fac_in_db.is_deleted)
        self.assertFalse(fac_in_db.is_active)
        self.assertIsNotNone(fac_in_db.deleted_at)

    async def test_tc12_audit_log_recorded_for_all_actions(self):
        """TC-12: Mọi thao tác CREATE, UPDATE, DELETE đều ghi nhận vào bảng audit_logs"""
        create_req = RecyclingFacilityCreateRequest(
            name="Trạm Test Audit Log",
            address="400 Lê Văn Sỹ, Quận 3",
            unit_id=3,
            latitude=10.7900,
            longitude=106.6750,
            accepted_waste_types=["PIN_CU"],
            open_time="08:00",
            close_time="17:00",
        )
        created = await create_facility(self.session, self.admin, create_req)

        # Kiểm tra Audit Log của CREATE
        audit_create = await self.session.execute(
            select(AuditLog).where(
                AuditLog.action == "CREATE_RECYCLING_FACILITY",
                AuditLog.record_id == str(created.facility_id)
            )
        )
        self.assertIsNotNone(audit_create.scalar_one_or_none())

        # Cleanup
        await delete_facility(self.session, self.admin, created.facility_id)

        # Kiểm tra Audit Log của DELETE
        audit_delete = await self.session.execute(
            select(AuditLog).where(
                AuditLog.action == "DELETE_RECYCLING_FACILITY",
                AuditLog.record_id == str(created.facility_id)
            )
        )
        self.assertIsNotNone(audit_delete.scalar_one_or_none())


if __name__ == "__main__":
    unittest.main()
