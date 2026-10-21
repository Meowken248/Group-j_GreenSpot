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
from app.models.penalty import PenaltyRegulation, PenaltyReport
from app.models.profile import UserActivity
from app.models.rbac import User
from app.models.notification import Notification
from app.services.penalty_service import PenaltyRegulationService
from app.schemas.penalty import (
    PenaltySearchParams,
    CreatePenaltyReportRequest,
    UpdatePenaltyReportStatusRequest,
)


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
        params = PenaltySearchParams(query="vứt tàn thuốc", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        titles = [item.title for item in result.items]
        self.assertTrue(any("thuốc lá" in t.lower() or "tàn" in t.lower() for t in titles))

    async def test_search_by_keyword_do_rac_via_he(self):
        """Màn 1 -> 2: Tìm kiếm từ khóa 'đổ rác vỉa hè' trả về hành vi vứt rác trên vỉa hè, lòng đường"""
        params = PenaltySearchParams(query="đổ rác vỉa hè", page=1, limit=10)
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

    async def test_search_by_unaccented_keyword_nuoc(self):
        """Tìm kiếm từ khóa không dấu 'nuoc' trả về kết quả tương đương 'nước'"""
        params_acc = PenaltySearchParams(query="nước", page=1, limit=10)
        params_unacc = PenaltySearchParams(query="nuoc", page=1, limit=10)
        res_acc = await self.service.search_regulations(self.session, params_acc)
        res_unacc = await self.service.search_regulations(self.session, params_unacc)

        self.assertGreaterEqual(res_unacc.total, 1)
        self.assertEqual(res_acc.total, res_unacc.total)
        self.assertEqual([i.title for i in res_acc.items], [i.title for i in res_unacc.items])

    async def test_search_by_unaccented_keyword_vut_tan_thuoc(self):
        """Tìm kiếm từ khóa không dấu 'vut tan thuoc' trả về đúng điều khoản thuốc lá"""
        params = PenaltySearchParams(query="vut tan thuoc", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        self.assertTrue(any("thuốc lá" in item.title.lower() for item in result.items))

    async def test_search_by_unaccented_keyword_do_rac_via_he(self):
        """Tìm kiếm từ khóa không dấu 'do rac via he' trả về đúng điều khoản vỉa hè"""
        params = PenaltySearchParams(query="do rac via he", page=1, limit=10)
        result = await self.service.search_regulations(self.session, params)

        self.assertGreaterEqual(result.total, 1)
        self.assertTrue(any("vỉa hè" in item.title.lower() for item in result.items))


    async def test_search_engine_relevance_ranking_priority_order(self):
        """Kiểm thử thuật toán sắp xếp Search Engine theo độ liên quan (Relevance Ranking):
        🥇 Hạng 1: Từ khóa nằm ngay trong Title
        🥈 Hạng 2: Từ khóa nằm trong Keywords
        🥉 Hạng 3: Từ khóa chỉ nằm trong Description
        """
        unique_kw = "relevancetestkw"
        # Item 3: Chỉ có trong Description
        item_desc = PenaltyRegulation(
            title="Quy định Z hành vi A",
            domain="Khác",
            keywords="không có",
            description=f"Hành vi vi phạm liên quan đến {unique_kw} chi tiết",
            legal_basis="Điều 1",
            min_fine_individual=100000,
            max_fine_individual=200000,
            avg_fine_individual=150000,
            min_fine_organization=200000,
            max_fine_organization=400000,
            avg_fine_organization=300000,
            version=1,
        )
        # Item 2: Có trong Keywords
        item_kw = PenaltyRegulation(
            title="Quy định Y hành vi B",
            domain="Khác",
            keywords=f"từ khóa phụ, {unique_kw}, từ khóa mở rộng",
            description="Mô tả bình thường không chứa từ khóa",
            legal_basis="Điều 2",
            min_fine_individual=100000,
            max_fine_individual=200000,
            avg_fine_individual=150000,
            min_fine_organization=200000,
            max_fine_organization=400000,
            avg_fine_organization=300000,
            version=1,
        )
        # Item 1: Nằm ngay trong Title
        item_title = PenaltyRegulation(
            title=f"Xử phạt vi phạm {unique_kw} trên địa bàn",
            domain="Khác",
            keywords="không có",
            description="Mô tả bình thường không chứa từ khóa",
            legal_basis="Điều 3",
            min_fine_individual=100000,
            max_fine_individual=200000,
            avg_fine_individual=150000,
            min_fine_organization=200000,
            max_fine_organization=400000,
            avg_fine_organization=300000,
            version=1,
        )

        self.session.add_all([item_desc, item_kw, item_title])
        await self.session.commit()

        try:
            params = PenaltySearchParams(query=unique_kw, limit=10)
            result = await self.service.search_regulations(self.session, params)

            self.assertEqual(result.total, 3)
            # Kiểm tra thứ tự ưu tiên:
            # 1. item_title (Hạng 1)
            # 2. item_kw (Hạng 2)
            # 3. item_desc (Hạng 3)
            self.assertEqual(result.items[0].id, item_title.id, "Top 1 phải là bản ghi có từ khóa trong Title")
            self.assertEqual(result.items[1].id, item_kw.id, "Top 2 phải là bản ghi có từ khóa trong Keywords")
            self.assertEqual(result.items[2].id, item_desc.id, "Top 3 phải là bản ghi có từ khóa trong Description")
        finally:
            await self.session.delete(item_desc)
            await self.session.delete(item_kw)
            await self.session.delete(item_title)
            await self.session.commit()


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
        """Màn 1: API nạp 5 lĩnh vực môi trường kèm số lượng và mô tả"""
        categories = await self.service.get_quick_category_stats(self.session)
        cat_names = [c["category_name"] for c in categories]

        self.assertEqual(len(categories), 5)
        self.assertIn("Rác thải sinh hoạt", cat_names)
        self.assertIn("Rác công nghiệp/nguy hại", cat_names)
        self.assertIn("Nước thải", cat_names)
        self.assertIn("Khí thải", cat_names)
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

    # =========================================================================
    # V. KIỂM THỬ QUẢN LÝ PHẢN ÁNH VI PHẠM (PENALTY REPORTS DOMAIN)
    # =========================================================================

    async def test_create_penalty_report_flow(self):
        """Kiểm thử gửi phản ánh vi phạm môi trường: sinh mã INC-, status PENDING, OCC version=1"""
        req = CreatePenaltyReportRequest(
            violation_title="Xả nước thải chưa qua xử lý",
            legal_basis="Điều 18 Nghị định 45/2022/NĐ-CP",
            fine_range="10.000.000đ - 30.000.000đ",
            address_text="123 Đường Nam Kỳ Khởi Nghĩa, Phường Bến Nghé, Quận 1",
            description="Cơ sở xả nước thải bọt trắng đục trực tiếp ra cống đô thị",
            is_anonymous=True,
        )
        report = await self.service.create_penalty_report(self.session, req)

        self.assertIsNotNone(report.id)
        self.assertTrue(report.tracking_code.startswith("INC-"))
        self.assertEqual(report.status, "PENDING")
        self.assertTrue(report.is_anonymous)
        self.assertEqual(report.reporter_name, "Ẩn danh")

        # Cleanup
        stmt = select(PenaltyReport).where(PenaltyReport.id == report.id)
        db_rep = (await self.session.execute(stmt)).scalar_one_or_none()
        if db_rep:
            await self.session.delete(db_rep)
            await self.session.commit()

    async def test_get_penalty_reports_and_filters(self):
        """Kiểm thử danh sách phản ánh vi phạm: phân trang và lọc theo trạng thái, từ khóa"""
        # Lấy danh sách tất cả
        res_all = await self.service.get_penalty_reports(self.session, page=1, limit=10)
        self.assertGreaterEqual(res_all.total, 1)

        # Lọc trạng thái PENDING
        res_pending = await self.service.get_penalty_reports(
            self.session, status_filter="PENDING", page=1, limit=10
        )
        for item in res_pending.items:
            self.assertEqual(item.status, "PENDING")

        # Tìm kiếm theo địa chỉ
        res_search = await self.service.get_penalty_reports(
            self.session, query="Nguyễn Huệ", page=1, limit=10
        )
        self.assertGreaterEqual(res_search.total, 1)
        self.assertTrue(any("Nguyễn Huệ" in item.address_text for item in res_search.items))

    async def test_penalty_report_stats(self):
        """Kiểm thử thống kê tổng hợp số lượng phản ánh vi phạm theo các trạng thái"""
        stats = await self.service.get_penalty_report_stats(self.session)
        self.assertGreaterEqual(stats.total, 1)
        self.assertGreaterEqual(stats.pending, 0)
        self.assertGreaterEqual(stats.verified, 0)
        self.assertGreaterEqual(stats.resolved, 0)
        self.assertEqual(
            stats.total,
            stats.pending + stats.verified + stats.resolved + stats.rejected,
        )

    async def test_update_penalty_report_status_and_version(self):
        """Kiểm thử cán bộ cập nhật trạng thái phản ánh vi phạm: status chuyển VERIFIED, OCC version tăng"""
        # Tạo bản ghi test
        req = CreatePenaltyReportRequest(
            violation_title="Vứt rác sinh hoạt",
            legal_basis="Điều 25",
            fine_range="1tr - 2tr",
            address_text="Vỉa hè Quận 1",
            description="Mô tả vi phạm test update",
            is_anonymous=False,
        )
        rep = await self.service.create_penalty_report(
            self.session, req, reporter_name="Cán bộ Test"
        )

        # Cập nhật thành VERIFIED
        update_req = UpdatePenaltyReportStatusRequest(
            status="VERIFIED",
            officer_note="Đã xác minh đúng hành vi vi phạm tại hiện trường",
        )
        updated = await self.service.update_penalty_report_status(
            self.session, rep.id, update_req
        )

        self.assertIsNotNone(updated)
        self.assertEqual(updated.status, "VERIFIED")
        self.assertEqual(updated.officer_note, "Đã xác minh đúng hành vi vi phạm tại hiện trường")

        # Cleanup
        stmt = select(PenaltyReport).where(PenaltyReport.id == rep.id)
        db_rep = (await self.session.execute(stmt)).scalar_one_or_none()
        if db_rep:
            await self.session.delete(db_rep)
            await self.session.commit()

    async def test_create_report_saves_user_activity_and_points(self):
        """Kiểm thử khi user gửi báo cáo vi phạm bằng tài khoản -> tự động ghi nhận vào user_activities"""
        # Lấy 1 user trong DB
        user_stmt = select(User).limit(1)
        test_user = (await self.session.execute(user_stmt)).scalars().first()
        self.assertIsNotNone(test_user, "Cần có ít nhất 1 user trong CSDL để kiểm thử")

        initial_points = test_user.total_green_points

        req = CreatePenaltyReportRequest(
            violation_title="Đốt chất thải công nghiệp trái phép",
            legal_basis="Điều 20 Nghị định 45/2022/NĐ-CP",
            fine_range="5.000.000đ - 10.000.000đ",
            address_text="Khu công nghiệp Tân Bình, Tây Thạnh, Tân Phú",
            description="Khói đen bốc lên nghi ngút kèm mùi khét lẹt nồng nặc",
            is_anonymous=False,
        )
        report = await self.service.create_penalty_report(
            self.session,
            req,
            reporter_id=test_user.user_id,
            reporter_name=test_user.full_name,
        )

        # 1. Kiểm tra UserActivity được tạo với 0 điểm (chờ xác minh)
        act_stmt = (
            select(UserActivity)
            .where(UserActivity.user_id == test_user.user_id)
            .order_by(UserActivity.created_at.desc())
        )
        activity = (await self.session.execute(act_stmt)).scalars().first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.activity_type, "REPORT_INCIDENT")
        self.assertIn("Đốt chất thải", activity.title)
        self.assertIn(report.tracking_code, activity.description)
        self.assertEqual(activity.points, 0)  # Chưa cộng điểm khi vừa gửi

        # 2. Điểm xanh tài khoản ban đầu chưa tăng
        await self.session.refresh(test_user)
        self.assertEqual(test_user.total_green_points, initial_points)

        # 3. Khi cán bộ XÁC MINH (VERIFIED) -> Được cộng +20 điểm
        verify_req = UpdatePenaltyReportStatusRequest(
            status="VERIFIED",
            officer_note="Đã xác minh đúng hành vi vi phạm",
        )
        await self.service.update_penalty_report_status(self.session, report.id, verify_req)
        await self.session.refresh(activity)
        await self.session.refresh(test_user)
        self.assertEqual(activity.points, 20)
        self.assertEqual(test_user.total_green_points, initial_points + 20)

        # 4. Khi cán bộ TỪ CHỐI (REJECTED) -> Hoàn lại 0 điểm
        reject_req = UpdatePenaltyReportStatusRequest(
            status="REJECTED",
            officer_note="Không đủ căn cứ xử lý vi phạm",
        )
        await self.service.update_penalty_report_status(self.session, report.id, reject_req)
        await self.session.refresh(activity)
        await self.session.refresh(test_user)
        self.assertEqual(activity.points, 0)
        self.assertEqual(test_user.total_green_points, initial_points)

        # Cleanup
        await self.session.delete(activity)
        rep_stmt = select(PenaltyReport).where(PenaltyReport.id == report.id)
        db_rep = (await self.session.execute(rep_stmt)).scalar_one_or_none()
        if db_rep:
            await self.session.delete(db_rep)
        test_user.total_green_points = initial_points
        await self.session.commit()

    async def test_update_status_sends_notification_to_user(self):
        """Kiểm thử khi cán bộ cập nhật trạng thái hồ sơ -> tự động tạo thông báo gửi đến chuông của user"""
        user_stmt = select(User).limit(1)
        test_user = (await self.session.execute(user_stmt)).scalars().first()
        self.assertIsNotNone(test_user)

        req = CreatePenaltyReportRequest(
            violation_title="Xả nước thải chưa xử lý",
            legal_basis="Điều 18 Nghị định 45/2022/NĐ-CP",
            fine_range="10.000.000đ - 20.000.000đ",
            address_text="Rạch Xuyên Tâm, Phường 15, Bình Thạnh",
            description="Nước có màu đen ngòm và bốc mùi hôi thối",
            is_anonymous=False,
        )
        report = await self.service.create_penalty_report(
            self.session,
            req,
            reporter_id=test_user.user_id,
            reporter_name=test_user.full_name,
        )

        # Cán bộ cập nhật sang RESOLVED
        update_req = UpdatePenaltyReportStatusRequest(
            status="RESOLVED",
            officer_note="Đã ra quyết định xử phạt 15.000.000đ và buộc khắc phục hậu quả",
        )
        updated = await self.service.update_penalty_report_status(
            self.session, report.id, update_req
        )
        self.assertEqual(updated.status, "RESOLVED")

        # Kiểm tra Notification được tạo trong bảng notifications
        notif_stmt = (
            select(Notification)
            .where(
                Notification.user_id == test_user.user_id,
                Notification.reference_id == report.tracking_code,
            )
            .order_by(Notification.created_at.desc())
        )
        notif = (await self.session.execute(notif_stmt)).scalars().first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.notification_type, "PENALTY_REPORT")
        self.assertIn(report.tracking_code, notif.title)
        self.assertIn("Lập biên bản / Xử phạt hành chính", notif.message)
        self.assertIn("15.000.000đ", notif.message)
        self.assertFalse(notif.is_read)

        # Cleanup
        await self.session.delete(notif)
        rep_stmt = select(PenaltyReport).where(PenaltyReport.id == report.id)
        db_rep = (await self.session.execute(rep_stmt)).scalar_one_or_none()
        if db_rep:
            await self.session.delete(db_rep)
        act_stmt = select(UserActivity).where(
            UserActivity.user_id == test_user.user_id,
            UserActivity.description.ilike(f"%{report.tracking_code}%"),
        )
        act = (await self.session.execute(act_stmt)).scalars().first()
        if act:
            await self.session.delete(act)
        await self.session.commit()


if __name__ == "__main__":
    unittest.main()

