"""
Unit Test Suite for Penalty Regulations Domain (Chức năng 11: Tra cứu quy định xử phạt) - TDD Coverage
Kiểm thử toàn diện 3 màn hình theo đặc tả nghiệp vụ:
1. Màn 1: Tìm kiếm từ khóa, 4 danh mục nhanh (Xả rác, Đốt rác, Nước thải, Tiếng ồn)
2. Màn 2: Danh sách kết quả, lọc theo lĩnh vực, lọc đối tượng (Cá nhân vs Tổ chức nhân đôi tiền phạt)
3. Màn 3: Chi tiết điều luật (Hành vi, Mức phạt min/max/avg, Căn cứ pháp lý, Cảnh báo sửa đổi)
4. Tuân thủ Quy tắc: Soft delete (deleted_at), Optimistic locking (version), Pagination 10 items/page
"""

import unittest
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.penalty import PenaltyRegulation
from app.services.penalty_service import PenaltyRegulationService
from app.schemas.penalty import PenaltySearchParams


class TestPenaltyRegulationsDomainTDD(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị theo chuẩn TDD cho Tra cứu quy định xử phạt (Feature STT 11)"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()
        self.service = PenaltyRegulationService()

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    # =========================================================================
    # I. KIỂM THỬ MÀN 1: TÌM KIẾM TỪ KHÓA & DANH MỤC TRUY CẬP NHANH
    # =========================================================================

    async def test_search_by_keyword_vut_tan_thuoc(self):
        """Màn 1 -> 2: Tìm kiếm từ khóa 'vứt tàn thuốc' trả về đúng hành vi hút thuốc vứt tàn"""
        params = PenaltySearchParams(query="tàn thuốc", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        titles = [item.title for item in result.items]
        self.assertTrue(any("thuốc lá" in t.lower() or "tàn" in t.lower() for t in titles))

    async def test_search_by_keyword_do_rac_via_he(self):
        """Màn 1 -> 2: Tìm kiếm từ khóa 'đổ rác vỉa hè' trả về hành vi vứt rác trên vỉa hè, lòng đường"""
        params = PenaltySearchParams(query="vỉa hè", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        found = any("vỉa hè" in item.title.lower() for item in result.items)
        self.assertTrue(found)

    async def test_search_by_keyword_karaoke_loa_keo(self):
        """Màn 1 -> 2: Tìm kiếm từ khóa 'karaoke loa kéo' trả về hành vi vi phạm tiếng ồn"""
        params = PenaltySearchParams(query="karaoke loa kéo", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        self.assertEqual(result.items[0].domain, "Tiếng ồn")

    async def test_search_by_keyword_xa_nuoc_thai(self):
        """Màn 1 -> 2: Tìm kiếm từ khóa 'xả nước thải' trả về các điều khoản nước thải"""
        params = PenaltySearchParams(query="xả nước thải", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        for item in result.items:
            self.assertEqual(item.domain, "Nước thải")

    async def test_quick_category_xa_rac(self):
        """Màn 1: Nhấp thẻ nhanh 'Xả rác' -> tự động lọc các hành vi thuộc nhóm Xả rác"""
        params = PenaltySearchParams(quick_category="Xả rác", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        for item in result.items:
            self.assertEqual(item.quick_category, "Xả rác")

    async def test_quick_category_dot_rac(self):
        """Màn 1: Nhấp thẻ nhanh 'Đốt rác' -> tự động lọc các hành vi đốt rác sinh hoạt, công nghiệp"""
        params = PenaltySearchParams(quick_category="Đốt rác", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        for item in result.items:
            self.assertEqual(item.quick_category, "Đốt rác")

    async def test_quick_category_nuoc_thai(self):
        """Màn 1: Nhấp thẻ nhanh 'Nước thải' -> lọc các hành vi xả nước thải mưa, sông suối"""
        params = PenaltySearchParams(quick_category="Nước thải", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        for item in result.items:
            self.assertEqual(item.quick_category, "Nước thải")

    async def test_quick_category_tieng_on(self):
        """Màn 1: Nhấp thẻ nhanh 'Tiếng ồn' -> lọc các hành vi vượt quy chuẩn dBA"""
        params = PenaltySearchParams(quick_category="Tiếng ồn", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        for item in result.items:
            self.assertEqual(item.quick_category, "Tiếng ồn")

    async def test_get_quick_category_summaries(self):
        """Màn 1: API nạp 4 danh mục phổ biến kèm số lượng và mô tả"""
        categories = await self.service.get_quick_category_stats(self.session)
        cat_names = [c["category_name"] for c in categories]

        self.assertIn("Xả rác", cat_names)
        self.assertIn("Đốt rác", cat_names)
        self.assertIn("Nước thải", cat_names)
        self.assertIn("Tiếng ồn", cat_names)

    # =========================================================================
    # II. KIỂM THỬ MÀN 2: BỘ LỌC ĐỐI TƯỢNG (CÁ NHÂN vs TỔ CHỨC x2) & LĨNH VỰC
    # =========================================================================

    async def test_filter_by_domain_rac_cong_nghiep(self):
        """Màn 2: Lọc lĩnh vực 'Rác công nghiệp/nguy hại'"""
        params = PenaltySearchParams(domain="Rác công nghiệp/nguy hại", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        for item in result.items:
            self.assertEqual(item.domain, "Rác công nghiệp/nguy hại")

    async def test_target_individual_fine_levels(self):
        """Màn 2: Đối tượng áp dụng 'INDIVIDUAL' -> hiển thị đúng khung tiền phạt cá nhân"""
        params = PenaltySearchParams(query="vỉa hè", target="INDIVIDUAL")
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        item = result.items[0]
        # Vứt rác vỉa hè cá nhân: 1.000.000 - 2.000.000
        self.assertEqual(item.displayed_min_fine, 1000000)
        self.assertEqual(item.displayed_max_fine, 2000000)

    async def test_target_organization_doubles_fine_levels(self):
        """Màn 2: Đối tượng áp dụng 'ORGANIZATION' -> khung tiền phạt tự động nhân đôi (2x)"""
        params = PenaltySearchParams(query="vỉa hè", target="ORGANIZATION")
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        item = result.items[0]
        # Vứt rác vỉa hè tổ chức: 2.000.000 - 4.000.000 (gấp đôi cá nhân)
        self.assertEqual(item.displayed_min_fine, 2000000)
        self.assertEqual(item.displayed_max_fine, 4000000)

    async def test_pagination_max_10_items_per_page(self):
        """Màn 2: Phân trang chuẩn tối đa 10 kết quả mỗi trang"""
        params = PenaltySearchParams(page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertLessEqual(len(result.items), 10)
        self.assertEqual(result.page, 1)
        self.assertEqual(result.limit, 10)

    # =========================================================================
    # III. KIỂM THỬ MÀN 3: CHI TIẾT ĐIỀU LUẬT (HÀNH VI, MỨC PHẠT, CĂN CỨ)
    # =========================================================================

    async def test_get_detail_full_3_columns(self):
        """Màn 3: Xem chi tiết điều luật trả về đầy đủ 3 khối thông tin"""
        # Lấy 1 bản ghi mẫu
        all_items = await self.service.search_regulations(self.session, PenaltySearchParams(limit=1))
        self.assertGreater(len(all_items.items), 0)
        reg_id = all_items.items[0].id

        detail = await self.service.get_regulation_detail(self.session, reg_id, target="INDIVIDUAL")
        self.assertIsNotNone(detail)

        # Cột 1: Hành vi vi phạm
        self.assertTrue(len(detail.description) > 0)

        # Cột 2: Khung tiền phạt & biện pháp bổ sung
        self.assertGreater(detail.min_fine, 0)
        self.assertGreater(detail.max_fine, detail.min_fine)
        self.assertGreater(detail.avg_fine, 0)
        self.assertIsNotNone(detail.supplementary_measures)

        # Cột 3: Căn cứ pháp lý
        self.assertTrue("Nghị định 45/2022/NĐ-CP" in detail.legal_basis)
        self.assertIsNotNone(detail.effective_date)

    async def test_get_detail_organization_doubled(self):
        """Màn 3: Xem chi tiết với target ORGANIZATION -> các mức phạt min, max, avg gấp đôi"""
        all_items = await self.service.search_regulations(self.session, PenaltySearchParams(limit=1))
        reg_id = all_items.items[0].id

        detail_ind = await self.service.get_regulation_detail(self.session, reg_id, target="INDIVIDUAL")
        detail_org = await self.service.get_regulation_detail(self.session, reg_id, target="ORGANIZATION")

        self.assertEqual(detail_org.min_fine, detail_ind.min_fine * 2)
        self.assertEqual(detail_org.max_fine, detail_ind.max_fine * 2)
        self.assertEqual(detail_org.avg_fine, detail_ind.avg_fine * 2)

    async def test_get_detail_not_found(self):
        """Màn 3: Truy vấn ID không tồn tại -> trả về None"""
        random_id = uuid.uuid4()
        detail = await self.service.get_regulation_detail(self.session, random_id)
        self.assertIsNone(detail)

    # =========================================================================
    # IV. KIỂM THỬ TUÂN THỦ PROJECT_RULES (SOFT DELETE & SEARCH)
    # =========================================================================

    async def test_soft_deleted_record_not_searchable(self):
        """Tuân thủ PROJECT_RULES: Bản ghi đã xóa mềm (deleted_at != None) không được xuất hiện"""
        # Tạo bản ghi test bị xóa mềm
        test_deleted = PenaltyRegulation(
            title="Hành vi đã bị hủy bỏ hiệu lực",
            domain="Rác thải sinh hoạt",
            min_fine_individual=500000,
            max_fine_individual=1000000,
            avg_fine_individual=750000,
            min_fine_organization=1000000,
            max_fine_organization=2000000,
            avg_fine_organization=1500000,
            description="Điều khoản cũ",
            legal_basis="Nghị định hết hiệu lực",
            deleted_at=datetime.now(timezone.utc),
            version=1,
        )
        self.session.add(test_deleted)
        await self.session.commit()

        # Tìm kiếm không bao giờ ra bản ghi này
        params = PenaltySearchParams(query="hủy bỏ hiệu lực")
        result = await self.service.search_regulations(self.session, params)
        ids = [item.id for item in result.items]
        self.assertNotIn(test_deleted.id, ids)

        # Cleanup
        await self.session.delete(test_deleted)
        await self.session.commit()


if __name__ == "__main__":
    unittest.main()
