"""
Unit and Integration Tests for:
- Feature 22: Quản trị CRUD Danh mục Rác thải Đô thị & Cấu hình Quy chuẩn SLA Xử lý
- Feature 18: Tiếp nhận phản ánh đa phương tiện (Watermark, GPS, SLA) & Quản trị sự cố
"""

import io
import unittest
import uuid
from datetime import datetime, timezone
from PIL import Image
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.incident import Incident, WasteCategory
from app.models.audit_log import AuditLog
from app.schemas.waste_category import WasteCategoryCreateRequest, WasteCategoryUpdateRequest
from app.services.waste_category_service import (
    list_categories,
    get_category_by_id,
    create_category,
    update_category,
    delete_category,
    check_code_unique,
    check_name_unique,
)
from app.services.watermark_service import apply_image_watermark
from app.services.incident_service import (
    get_active_waste_categories,
    check_duplicate_incidents,
    get_incident_detail,
    list_incidents_for_management,
)


class TestFeature22And18(unittest.IsolatedAsyncioTestCase):
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

    # =========================================================================
    # CHỨC NĂNG 22: CRUD DANH MỤC & CẤU HÌNH SLA
    # =========================================================================

    async def test_feature_22_list_categories(self):
        """Màn 1: Liệt kê danh mục rác thải đô thị, lọc trạng thái, đếm sự cố chưa xử lý"""
        res = await list_categories(self.session, page=1, limit=10, status_filter="ALL")
        self.assertGreaterEqual(res.total, 5)
        self.assertGreaterEqual(len(res.items), 5)
        first = res.items[0]
        self.assertIsNotNone(first.category_code)
        self.assertIsNotNone(first.sla_hours)
        self.assertIsNotNone(first.sla_warning_hours)
        self.assertLess(first.sla_warning_hours, first.sla_hours)

    async def test_feature_22_validation_check_code(self):
        """Màn 2: Kiểm tra tính duy nhất và định dạng mã danh mục"""
        # Mã đã có
        dup = await check_code_unique(self.session, "DOMESTIC_WASTE")
        self.assertFalse(dup.is_valid)
        self.assertEqual(dup.message, "Mã danh mục đã tồn tại")

        # Mã mới hợp lệ
        valid = await check_code_unique(self.session, "NEW_VALID_CODE_99")
        self.assertTrue(valid.is_valid)

        # Mã sai định dạng (chứa chữ thường)
        invalid = await check_code_unique(self.session, "invalid_code")
        self.assertFalse(invalid.is_valid)

    async def test_feature_22_validation_check_name(self):
        """Màn 2: Kiểm tra tính duy nhất của tên loại rác"""
        dup = await check_name_unique(self.session, "Rác thải sinh hoạt ứ đọng")
        self.assertFalse(dup.is_valid)
        self.assertEqual(dup.message, "Tên loại rác đã tồn tại")

        valid = await check_name_unique(self.session, "Loại rác mới chưa từng có")
        self.assertTrue(valid.is_valid)

    async def test_feature_22_create_update_delete_lifecycle(self):
        """Màn 2, 3, 4: Vòng đời Tạo mới -> Sửa -> Xoá danh mục và ghi Audit Log"""
        unique_code = f"TEST_{uuid.uuid4().hex[:8].upper()}"
        unique_name = f"Rác kiểm thử tự động {uuid.uuid4().hex[:6]}"

        # 1. Tạo mới (Màn 2)
        create_req = WasteCategoryCreateRequest(
            category_code=unique_code,
            name=unique_name,
            description="Mô tả kiểm thử",
            sla_hours=48,
            sla_warning_hours=6,
            default_severity="HIGH",
        )
        created = await create_category(
            self.session,
            user=self.admin,
            req=create_req,
        )
        self.assertEqual(created.category_code, unique_code)
        self.assertEqual(created.sla_hours, 48)
        self.assertEqual(created.sla_warning_hours, 6)
        self.assertTrue(created.is_active)

        # 2. Cập nhật (Màn 3)
        updated_name = f"{unique_name} (Đã cập nhật)"
        update_req = WasteCategoryUpdateRequest(
            name=updated_name,
            description="Mô tả cập nhật",
            sla_hours=36,
            sla_warning_hours=4,
            default_severity="MEDIUM",
            is_active=True,
        )
        updated = await update_category(
            self.session,
            user=self.admin,
            category_id=created.category_id,
            req=update_req,
        )
        self.assertEqual(updated.name, updated_name)
        self.assertEqual(updated.sla_hours, 36)

        # 3. Xoá mềm (Màn 4)
        del_res = await delete_category(
            self.session,
            user=self.admin,
            category_id=created.category_id,
        )
        self.assertTrue(del_res["success"])

        # Kiểm tra danh mục đã bị xoá mềm (get_category_by_id ném 404)
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            await get_category_by_id(self.session, created.category_id)

        # Kiểm tra Audit Log đã ghi nhận
        audit_res = await self.session.execute(
            select(AuditLog).where(AuditLog.record_id == str(created.category_id))
        )
        logs = audit_res.scalars().all()
        self.assertGreaterEqual(len(logs), 2)  # Ít nhất có log CREATE, UPDATE, DELETE

    # =========================================================================
    # CHỨC NĂNG 18: TIẾP NHẬN BÁO CÁO ĐA PHƯƠNG TIỆN & QUẢN TRỊ SỰ CỐ
    # =========================================================================

    def test_feature_18_image_watermarking(self):
        """Màn 2: Đóng dấu Watermark thời gian VN UTC+7 và toạ độ GPS lên ảnh"""
        img = Image.new("RGB", (640, 480), color="green")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        raw_bytes = buf.getvalue()

        file_url, thumb_url, actual_size, watermark_text = apply_image_watermark(
            input_bytes=raw_bytes,
            latitude=10.7725,
            longitude=106.7065,
        )
        self.assertTrue(file_url.startswith("/uploads/incidents/"))
        self.assertTrue(thumb_url.startswith("/uploads/incidents/thumb_"))
        self.assertIn("THỜI GIAN:", watermark_text)
        self.assertIn("GPS: 10.772500, 106.706500", watermark_text)
        self.assertGreater(actual_size, 0)

    async def test_feature_18_active_waste_categories(self):
        """Màn 1: Tiếp nhận phản ánh - Lấy danh mục hoạt động kèm SLA để tính hạn"""
        categories = await get_active_waste_categories(self.session)
        self.assertGreaterEqual(len(categories), 5)
        for cat in categories:
            self.assertTrue(cat.is_active)
            self.assertGreater(cat.sla_hours, 0)

    async def test_feature_18_duplicate_incident_detection(self):
        """Màn 5: Kiểm tra phát hiện trùng lặp trong bán kính 100m bằng PostGIS"""
        # Toạ độ gần Bến Bạch Đằng (trùng với ECO-HCM-001: 10.7725, 106.7065)
        res = await check_duplicate_incidents(
            self.session,
            lat=10.7725,
            lng=106.7065,
            radius_meters=100.0,
            category_id=3,
        )
        self.assertTrue(res.has_duplicate)
        self.assertGreaterEqual(len(res.duplicates), 1)
        self.assertEqual(res.duplicates[0].tracking_code, "ECO-HCM-001")

    async def test_feature_18_list_incidents_management(self):
        """Màn Quản trị Sự cố: Lấy danh sách sự cố, thống kê KPI phân loại theo trạng thái"""
        res = await list_incidents_for_management(
            self.session,
            page=1,
            limit=20,
        )
        self.assertGreaterEqual(res.total, 8)
        self.assertGreaterEqual(res.stats.total, 8)
        self.assertGreaterEqual(res.stats.unverified, 1)
