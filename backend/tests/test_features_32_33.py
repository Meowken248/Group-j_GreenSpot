"""
Comprehensive Test Suite for Features 32 & 33:
- Chức năng 32: Bảng xếp hạng vinh danh Top Công dân Xanh (cá nhân, nhóm, quận)
- Chức năng 33: Bản đồ nhiệt môi trường và khí hậu đa chế độ: AQI, nhiệt độ, điểm số rủi ro
Target: 100% Logic and Coverage across Services & Models
"""

import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.leaderboard import CommunityGroup, DistrictEnvironmentalStat
from app.services.leaderboard_service import LeaderboardService
from app.services.heatmap_service import (
    HeatmapService,
    evaluate_aqi,
    evaluate_temp,
    evaluate_risk,
)

class TestFeatures3233(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await engine.dispose()
        self.db = AsyncSessionLocal()

        # 1. Setup Role and Test User
        role_stmt = select(Role).where(Role.role_code == "CITIZEN")
        citizen_role = (await self.db.execute(role_stmt)).scalar_one_or_none()
        if not citizen_role:
            citizen_role = Role(
                role_code="CITIZEN",
                role_name="Công dân",
                description="Công dân",
                is_system=True,
            )
            self.db.add(citizen_role)
            await self.db.commit()
            await self.db.refresh(citizen_role)

        self.test_user_id = uuid.uuid4()
        self.test_user = User(
            user_id=self.test_user_id,
            email=f"leaderboard_user_{self.test_user_id.hex[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Nguyễn Văn Xanh",
            role_id=citizen_role.role_id,
            status="ACTIVE",
            green_points=8888,
        )
        self.db.add(self.test_user)
        await self.db.commit()

    async def asyncTearDown(self):
        # Cleanup test user
        await self.db.execute(delete(User).where(User.user_id == self.test_user_id))
        await self.db.commit()
        await self.db.close()
        await engine.dispose()

    async def test_01_individual_leaderboard_anonymous(self):
        """Kiểm tra Bảng xếp hạng cá nhân khi chưa đăng nhập (khách vãng lai)"""
        res = await LeaderboardService.get_individual_leaderboard(self.db, current_user_id=None)
        self.assertIsNotNone(res)
        self.assertIsInstance(res.top_10, list)
        self.assertGreater(len(res.top_10), 0)
        self.assertLessEqual(len(res.top_10), 10)
        
        # Verify ordering and medal icons
        prev_points = float("inf")
        for idx, item in enumerate(res.top_10, start=1):
            self.assertEqual(item.rank, idx)
            self.assertLessEqual(item.green_points, prev_points)
            prev_points = item.green_points
            if idx == 1:
                self.assertEqual(item.badge_icon, "🥇")
            elif idx == 2:
                self.assertEqual(item.badge_icon, "🥈")
            elif idx == 3:
                self.assertEqual(item.badge_icon, "🥉")
            else:
                self.assertEqual(item.badge_icon, "🎖️")

        # When not logged in, my_rank must be None
        self.assertIsNone(res.my_rank)

    async def test_02_individual_leaderboard_logged_in_top10(self):
        """Kiểm tra Thứ hạng cá nhân (My Rank) khi người dùng đã đăng nhập và lọt Top 10"""
        # User has 8888 points -> very likely top 10
        res = await LeaderboardService.get_individual_leaderboard(self.db, current_user_id=self.test_user_id)
        self.assertIsNotNone(res.my_rank)
        self.assertTrue(res.my_rank.is_logged_in)
        self.assertEqual(res.my_rank.green_points, 8888)
        self.assertGreaterEqual(res.my_rank.rank, 1)
        self.assertGreaterEqual(res.my_rank.total_citizens, 1)

        if res.my_rank.is_top_10:
            self.assertIn("Chúc mừng bạn đang nằm trong Top 10 Công dân Xanh xuất sắc!", res.my_rank.message)

    async def test_03_group_leaderboard_cycles(self):
        """Kiểm tra Bảng xếp hạng nhóm theo các chu kỳ Tuần, Tháng, Tất cả"""
        # Cycle WEEK
        week_res = await LeaderboardService.get_group_leaderboard(self.db, cycle="WEEK")
        self.assertEqual(week_res.cycle, "WEEK")
        self.assertGreater(len(week_res.groups), 0)
        prev_pts = float("inf")
        for g in week_res.groups:
            self.assertLessEqual(g.points, prev_pts)
            prev_pts = g.points

        # Cycle MONTH
        month_res = await LeaderboardService.get_group_leaderboard(self.db, cycle="MONTH")
        self.assertEqual(month_res.cycle, "MONTH")
        self.assertGreater(len(month_res.groups), 0)

        # Cycle ALL
        all_res = await LeaderboardService.get_group_leaderboard(self.db, cycle="ALL")
        self.assertEqual(all_res.cycle, "ALL")
        self.assertGreater(len(all_res.groups), 0)
        
        # Verify user group highlight flag
        has_highlight = any(g.is_user_group for g in week_res.groups)
        self.assertTrue(has_highlight)

    async def test_04_district_leaderboard(self):
        """Kiểm tra Bảng xếp hạng 22 quận/huyện theo Chỉ số Xanh"""
        res = await LeaderboardService.get_district_leaderboard(self.db, cycle="WEEK")
        self.assertEqual(res.cycle, "WEEK")
        self.assertEqual(len(res.districts), 22)

        prev_idx = float("inf")
        user_district_found = False
        for idx, d in enumerate(res.districts, start=1):
            self.assertEqual(d.rank, idx)
            self.assertLessEqual(d.green_index, prev_idx)
            prev_idx = d.green_index
            self.assertGreaterEqual(d.cleanup_rate, 0.0)
            self.assertGreaterEqual(d.resolved_incidents, 0)
            if d.is_user_district:
                user_district_found = True
                self.assertEqual(d.district_code, "BINH_THANH")

        self.assertTrue(user_district_found)

    async def test_05_heatmap_evaluators(self):
        """Kiểm tra các hàm lượng hóa ngưỡng AQI, Nhiệt độ và Điểm rủi ro (Table 138-140)"""
        # AQI
        c1, lbl1, w1, _ = evaluate_aqi(35, "Quận 1")
        self.assertEqual(c1, "#22c55e")
        self.assertEqual(lbl1, "Tốt")
        self.assertFalse(w1)

        c2, lbl2, w2, msg2 = evaluate_aqi(210, "Bình Tân")
        self.assertEqual(c2, "#a855f7")
        self.assertEqual(lbl2, "Rất xấu")
        self.assertTrue(w2)
        self.assertIn("Cảnh báo: Không khí ở mức rất xấu tại Bình Tân", msg2)

        # Temperature
        tc1, tlbl1, tw1, _ = evaluate_temp(28.5, "Quận 3")
        self.assertEqual(tc1, "#22c55e")
        self.assertFalse(tw1)

        tc2, tlbl2, tw2, tmsg2 = evaluate_temp(39.5, "Bình Chánh")
        self.assertEqual(tc2, "#dc2626")
        self.assertTrue(tw2)
        self.assertIn("Cảnh báo nắng nóng gay gắt tại Bình Chánh", tmsg2)

        # Risk
        rc1, rlbl1, rw1, _ = evaluate_risk(40, "Phú Nhuận")
        self.assertEqual(rc1, "#eab308")
        self.assertFalse(rw1)

        rc2, rlbl2, rw2, rmsg2 = evaluate_risk(82, "Hóc Môn")
        self.assertEqual(rc2, "#dc2626")
        self.assertTrue(rw2)
        self.assertIn("Báo động: Nguy cơ ô nhiễm mức báo động tại Hóc Môn", rmsg2)

    async def test_06_heatmap_data_modes(self):
        """Kiểm tra truy vấn bản đồ nhiệt theo 3 chế độ: AQI, TEMPERATURE, RISK"""
        # AQI mode
        aqi_data = await HeatmapService.get_heatmap_data(self.db, mode="AQI")
        self.assertEqual(aqi_data.mode, "AQI")
        self.assertEqual(aqi_data.total_districts, 22)
        self.assertEqual(len(aqi_data.legends), 6)
        self.assertTrue(any(p.is_warning for p in aqi_data.points))

        # TEMPERATURE mode
        temp_data = await HeatmapService.get_heatmap_data(self.db, mode="TEMPERATURE")
        self.assertEqual(temp_data.mode, "TEMPERATURE")
        self.assertEqual(temp_data.total_districts, 22)
        self.assertEqual(len(temp_data.legends), 4)

        # RISK mode
        risk_data = await HeatmapService.get_heatmap_data(self.db, mode="RISK")
        self.assertEqual(risk_data.mode, "RISK")
        self.assertEqual(risk_data.total_districts, 22)
        self.assertEqual(len(risk_data.legends), 4)
        self.assertTrue(any(p.is_warning for p in risk_data.points))

    async def test_07_zone_detail_popup_data(self):
        """Kiểm tra truy vấn chi tiết 4 thông số môi trường của khu vực (Table 141)"""
        detail = await HeatmapService.get_zone_detail(self.db, "QUAN_1")
        self.assertEqual(detail.district_code, "QUAN_1")
        self.assertEqual(detail.district_name, "Quận 1")
        self.assertGreater(detail.aqi_value, 0)
        self.assertGreater(detail.temperature_c, 0.0)
        self.assertGreater(detail.risk_score, 0)
        self.assertGreater(detail.green_index, 0.0)

        # Invalid zone must raise 404
        with self.assertRaises(HTTPException) as ctx:
            await HeatmapService.get_zone_detail(self.db, "QUAN_KHONG_TON_TAI")
        self.assertEqual(ctx.exception.status_code, 404)

if __name__ == "__main__":
    unittest.main()
