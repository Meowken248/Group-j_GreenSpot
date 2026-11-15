"""
Comprehensive Test Suite for Features 34 & 35:
- Chức năng 34: Quét mã QR nhận điểm (Physical QR Scanner & Anti-fraud)
- Chức năng 35: Vòng quay may mắn hằng ngày (Daily Eco Lucky Wheel)
Target: 100% Logic and Coverage across Services & Models
"""

import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.reward import RewardTransaction
from app.models.qr_lucky import EcoQRCode, UserQRScan, LuckyWheelSpin
from app.services.qr_scan_service import QRScanService, calculate_haversine_distance
from app.services.lucky_wheel_service import LuckyWheelService

class TestFeatures3435(unittest.IsolatedAsyncioTestCase):
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
            email=f"tester_34_35_{self.test_user_id.hex[:8]}@example.com",
            password_hash="fake_hash",
            full_name="Lê Văn Sinh Thái",
            role_id=citizen_role.role_id,
            status="ACTIVE",
            green_points=100,
        )
        self.db.add(self.test_user)

        # 2. Setup Test QR Code
        self.test_qr_code_str = f"TEST-QR-{self.test_user_id.hex[:6].upper()}"
        self.test_qr = EcoQRCode(
            qr_id=uuid.uuid4(),
            code=self.test_qr_code_str,
            title="Trạm Thử Nghiệm Tái Chế",
            location_name="Công viên 23/9, Quận 1",
            point_reward=20,
            qr_type="RECYCLING_STATION",
            lat=10.7700,
            lng=106.6900,
            max_distance_meters=50.0,
            is_active=True,
        )
        self.db.add(self.test_qr)
        await self.db.commit()
        await self.db.refresh(self.test_user)

    async def asyncTearDown(self):
        try:
            await self.db.rollback()
            await self.db.execute(delete(UserQRScan).where(UserQRScan.user_id == self.test_user_id))
            await self.db.execute(delete(LuckyWheelSpin).where(LuckyWheelSpin.user_id == self.test_user_id))
            await self.db.execute(delete(RewardTransaction).where(RewardTransaction.user_id == self.test_user_id))
            await self.db.execute(delete(EcoQRCode).where(EcoQRCode.qr_id == self.test_qr.qr_id))
            await self.db.execute(delete(User).where(User.user_id == self.test_user_id))
            await self.db.commit()
            await self.db.close()
        except Exception:
            pass
        await engine.dispose()

    async def test_01_haversine_distance(self):
        """Kiểm tra độ chính xác của hàm tính khoảng cách GPS Haversine"""
        d0 = calculate_haversine_distance(10.7700, 106.6900, 10.7700, 106.6900)
        self.assertAlmostEqual(d0, 0.0, places=2)

        d1 = calculate_haversine_distance(10.7700, 106.6900, 10.7701, 106.6900)
        self.assertGreater(d1, 10.0)
        self.assertLess(d1, 15.0)

    async def test_02_qr_scan_success(self):
        """[Chức năng 34 - Table 143] Quét mã QR thành công trong phạm vi cho phép và nhận điểm"""
        res = await QRScanService.process_qr_scan(
            db=self.db,
            user=self.test_user,
            code=self.test_qr_code_str,
            user_lat=10.7701,
            user_lng=106.6900,
        )
        self.assertTrue(res.success)
        self.assertEqual(res.point_reward, 20)
        self.assertEqual(res.new_total_points, 120)
        self.assertIn("Bạn nhận được +20 điểm xanh từ Trạm Thử Nghiệm Tái Chế", res.message)
        self.assertIsNotNone(res.distance_meters)
        self.assertLessEqual(res.distance_meters, 50.0)

    async def test_03_qr_scan_duplicate_same_day(self):
        """[Chức năng 34 - Table 144] Chống quét trùng: 1 mã chỉ dùng 1 lần mỗi ngày"""
        await QRScanService.process_qr_scan(
            db=self.db,
            user=self.test_user,
            code=self.test_qr_code_str,
            user_lat=10.7700,
            user_lng=106.6900,
        )

        with self.assertRaises(HTTPException) as ctx:
            await QRScanService.process_qr_scan(
                db=self.db,
                user=self.test_user,
                code=self.test_qr_code_str,
                user_lat=10.7700,
                user_lng=106.6900,
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Mã này đã được bạn sử dụng hôm nay. Vui lòng quay lại vào ngày mai", ctx.exception.detail)

    async def test_04_qr_scan_out_of_range(self):
        """[Chức năng 34 - Table 144] Quét mã khi GPS quá xa trạm thu gom (> 50m) bị từ chối"""
        with self.assertRaises(HTTPException) as ctx:
            await QRScanService.process_qr_scan(
                db=self.db,
                user=self.test_user,
                code=self.test_qr_code_str,
                user_lat=10.8500,
                user_lng=106.7500,
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Vị trí của bạn nằm ngoài phạm vi trạm thu gom. Vui lòng quét trực tiếp tại chỗ", ctx.exception.detail)

    async def test_05_qr_scan_invalid_code(self):
        """[Chức năng 34 - Table 144] Quét mã QR không tồn tại trong hệ thống"""
        with self.assertRaises(HTTPException) as ctx:
            await QRScanService.process_qr_scan(
                db=self.db,
                user=self.test_user,
                code="NON_EXISTENT_QR_CODE_999",
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Mã QR không hợp lệ hoặc không thuộc hệ thống", ctx.exception.detail)

    async def test_06_lucky_wheel_status_initial(self):
        """[Chức năng 35 - Table 145] Kiểm tra trạng thái vòng quay ban đầu khi người dùng còn 1 lượt"""
        status = await LuckyWheelService.get_wheel_status(self.db, self.test_user_id)
        self.assertEqual(status.spins_left_today, 1)
        self.assertTrue(status.has_spins_today)
        self.assertGreater(status.next_reset_seconds, 0)
        self.assertEqual(len(status.slots), 8)
        self.assertEqual(status.total_points_won, 0)

    async def test_07_lucky_wheel_spin_success_and_exhaustion(self):
        """[Chức năng 35 - Table 145 & 148] Quay thưởng thành công và khóa lượt quay tiếp theo trong ngày"""
        initial_points = self.test_user.green_points

        spin_res = await LuckyWheelService.spin_wheel(self.db, self.test_user)
        self.assertTrue(spin_res.success)
        self.assertIn(spin_res.slot_index, range(8))
        self.assertGreaterEqual(spin_res.points_won, 0)
        self.assertEqual(spin_res.spins_left_today, 0)
        self.assertEqual(self.test_user.green_points, initial_points + spin_res.points_won)

        status_after = await LuckyWheelService.get_wheel_status(self.db, self.test_user_id)
        self.assertEqual(status_after.spins_left_today, 0)
        self.assertFalse(status_after.has_spins_today)

        with self.assertRaises(HTTPException) as ctx:
            await LuckyWheelService.spin_wheel(self.db, self.test_user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Hôm nay bạn đã hết lượt quay", ctx.exception.detail)

    async def test_08_lucky_wheel_history(self):
        """[Chức năng 35 - Table 147] Tra cứu lịch sử quay thưởng 30 ngày"""
        await LuckyWheelService.spin_wheel(self.db, self.test_user)

        history_res = await LuckyWheelService.get_spin_history(self.db, self.test_user_id)
        self.assertEqual(history_res.total_spins, 1)
        self.assertEqual(len(history_res.history), 1)
        self.assertIsNone(history_res.empty_message)
        self.assertIsNotNone(history_res.history[0].formatted_time)

if __name__ == "__main__":
    unittest.main()
