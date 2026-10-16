"""
Unit Test Suite for Profile Domain (Chức năng 5) - Target: 100% Coverage
Kiểm thử toàn diện 4 màn hình theo đặc tả:
1. Màn 1: Profile Timeline (Profile info, empty state, bài viết công khai/ẩn, soft delete, phân trang)
2. Màn 2: Green Passport & Huy hiệu (Công thức % tiến độ, cấp cao nhất, badges đã nhận / chưa mở khóa)
3. Màn 3: Lịch sử đóng góp (Phân loại, hoạt động 0 điểm, kiểm tra ràng buộc ngày, phân trang)
4. Màn 4: Chỉnh sửa hồ sơ (Validation họ tên, bio, ngày sinh, Optimistic Locking version conflict 409)
"""

import unittest
import uuid
import math
from datetime import datetime, date, timedelta, timezone
from pydantic import ValidationError
from fastapi import HTTPException
from sqlalchemy import select, update, delete

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role, UserSession
from app.models.profile import CitizenLevel, Badge, UserBadge, UserActivity, Post
from app.schemas.profile import (
    UpdateProfileRequest,
    UserProfileResponse,
    PostListResponse,
    GreenPassportResponse,
    UserBadgesResponse,
    ActivityListResponse,
)
from app.api.v1.profile import (
    get_my_profile,
    get_user_profile,
    get_user_posts,
    get_green_passport,
    get_user_badges,
    get_user_activities,
    update_my_profile,
    generate_passport_code,
)


class TestProfileDomainUnitCoverage(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị cho toàn bộ nghiệp vụ Profile & Timeline (Chức năng 5)"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()

        # Lấy tài khoản Citizen kiểm thử
        cit_res = await self.session.execute(
            select(User).where(User.email == "citizen@ecoreport.gov.vn")
        )
        self.citizen = cit_res.scalars().first()
        self.assertIsNotNone(self.citizen, "Cần có tài khoản citizen@ecoreport.gov.vn trong CSDL")

        # Lấy tài khoản Admin (đạt cấp cao nhất)
        adm_res = await self.session.execute(
            select(User).where(User.email == "admin@ecoreport.gov.vn")
        )
        self.admin = adm_res.scalars().first()
        self.assertIsNotNone(self.admin, "Cần có tài khoản admin@ecoreport.gov.vn trong CSDL")

        # Lấy tài khoản Newbie (0 điểm, chưa có bio, chưa có badge)
        newbie_res = await self.session.execute(
            select(User).where(User.email == "newbie@ecoreport.gov.vn")
        )
        self.newbie = newbie_res.scalars().first()
        self.assertIsNotNone(self.newbie, "Cần có tài khoản newbie@ecoreport.gov.vn trong CSDL")

        # Mock dummy session
        self.dummy_session = UserSession(
            session_id=uuid.uuid4(),
            user_id=self.citizen.user_id,
            refresh_token_hash="dummy_hash",
            device_name="Test Device",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )

    async def asyncTearDown(self):
        try:
            await self.session.rollback()
            await self.session.close()
        except Exception:
            pass
        await engine.dispose()

    # =========================================================================
    # I. KIỂM THỬ VALIDATION SCHEMAS
    # =========================================================================

    def test_schema_full_name_valid(self):
        """Họ tên hợp lệ: Tiếng Việt có dấu, khoảng trắng, độ dài 2-50 ký tự"""
        req = UpdateProfileRequest(
            full_name="Nguyễn Thành Đạt",
            bio="Yêu môi trường",
            date_of_birth=date(1995, 5, 15),
            version=1
        )
        self.assertEqual(req.full_name, "Nguyễn Thành Đạt")

    def test_schema_full_name_empty(self):
        """Họ tên để trống -> Báo lỗi Vui lòng nhập họ tên"""
        with self.assertRaises(ValidationError) as ctx:
            UpdateProfileRequest(
                full_name="   ",
                bio="Bio",
                version=1
            )
        self.assertIn("Vui lòng nhập họ tên", str(ctx.exception))

    def test_schema_full_name_length_invalid(self):
        """Họ tên < 2 hoặc > 50 ký tự -> Báo lỗi độ dài"""
        with self.assertRaises(ValidationError) as ctx:
            UpdateProfileRequest(
                full_name="A",
                version=1
            )
        self.assertIn("từ 2 đến 50 ký tự", str(ctx.exception))

        with self.assertRaises(ValidationError) as ctx2:
            UpdateProfileRequest(
                full_name="A" * 51,
                version=1
            )
        self.assertIn("từ 2 đến 50 ký tự", str(ctx2.exception))

    def test_schema_full_name_invalid_characters(self):
        """Họ tên chứa số hoặc ký tự đặc biệt -> Báo lỗi"""
        for invalid_name in ["Đạt123", "Nguyễn @ Đạt", "Dat_Nguyen"]:
            with self.assertRaises(ValidationError) as ctx:
                UpdateProfileRequest(
                    full_name=invalid_name,
                    version=1
                )
            self.assertIn("chỉ gồm chữ cái và khoảng trắng", str(ctx.exception))

    def test_schema_bio_trim_over_200(self):
        """Bio vượt quá 200 ký tự -> Tự động cắt đúng 200 ký tự"""
        long_bio = "x" * 250
        req = UpdateProfileRequest(
            full_name="Nguyễn Thành Đạt",
            bio=long_bio,
            version=1
        )
        self.assertEqual(len(req.bio), 200)

    def test_schema_dob_future_and_past(self):
        """Ngày sinh ở tương lai hoặc trước 1900 -> Báo lỗi"""
        tomorrow = date.today() + timedelta(days=1)
        with self.assertRaises(ValidationError) as ctx:
            UpdateProfileRequest(
                full_name="Nguyễn Thành Đạt",
                date_of_birth=tomorrow,
                version=1
            )
        self.assertIn("không được ở tương lai", str(ctx.exception))

        ancient_date = date(1899, 12, 31)
        with self.assertRaises(ValidationError) as ctx2:
            UpdateProfileRequest(
                full_name="Nguyễn Thành Đạt",
                date_of_birth=ancient_date,
                version=1
            )
        self.assertIn("Ngày sinh không hợp lệ", str(ctx2.exception))

    # =========================================================================
    # II. KIỂM THỬ MÀN 1: PROFILE & TIMELINE POSTS
    # =========================================================================

    async def test_get_my_profile_success(self):
        """Chủ trang lấy thông tin hồ sơ của chính mình"""
        res = await get_my_profile(
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertTrue(res.is_own_profile)
        self.assertEqual(res.user_id, self.citizen.user_id)
        self.assertEqual(res.full_name, self.citizen.full_name)
        self.assertIsNotNone(res.current_level)
        self.assertLessEqual(len(res.highlight_badges), 3)
        self.assertIsNotNone(res.date_of_birth)
        self.assertGreaterEqual(res.version, 1)

    async def test_get_other_user_profile_success(self):
        """Người dùng xem hồ sơ của người khác: is_own_profile=False, ẩn date_of_birth"""
        res = await get_user_profile(
            user_id=self.admin.user_id,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertFalse(res.is_own_profile)
        self.assertEqual(res.user_id, self.admin.user_id)
        self.assertIsNone(res.date_of_birth, "Ngày sinh không được hiển thị công khai cho người khác")

    async def test_get_profile_user_not_found(self):
        """Xem hồ sơ người dùng không tồn tại -> 404 USER_NOT_FOUND"""
        random_id = uuid.uuid4()
        with self.assertRaises(HTTPException) as ctx:
            await get_user_profile(
                user_id=random_id,
                auth_data=(self.citizen, self.dummy_session),
                db=self.session
            )
        self.assertEqual(ctx.exception.status_code, 404)

    async def test_get_profile_newbie_empty_state(self):
        """Xem hồ sơ người dùng mới tinh: chưa có bio, chưa có badge"""
        res = await get_user_profile(
            user_id=self.newbie.user_id,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertIsNone(res.bio)
        self.assertEqual(len(res.highlight_badges), 0)
        self.assertEqual(res.total_badges_count, 0)
        self.assertEqual(res.current_level.level_name, "Mầm Xanh")

    async def test_get_posts_own_profile_includes_hidden(self):
        """Chủ trang xem bài đăng -> Thấy cả bài ẩn (is_hidden = True)"""
        res = await get_user_posts(
            user_id=self.citizen.user_id,
            page=1,
            limit=20,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        hidden_posts = [p for p in res.items if p.is_hidden]
        self.assertGreaterEqual(len(hidden_posts), 1, "Chủ trang phải nhìn thấy bài đã ẩn")

    async def test_get_posts_other_user_excludes_hidden(self):
        """Người khác xem bài đăng -> KHÔNG thấy bài ẩn (is_hidden = True)"""
        res = await get_user_posts(
            user_id=self.citizen.user_id,
            page=1,
            limit=20,
            auth_data=(self.admin, self.dummy_session),
            db=self.session
        )
        hidden_posts = [p for p in res.items if p.is_hidden]
        self.assertEqual(len(hidden_posts), 0, "Người khác không được thấy bài đã ẩn của chủ trang")

    async def test_get_posts_soft_delete_filtered(self):
        """Bài viết bị xóa mềm (deleted_at IS NOT NULL) không xuất hiện trong danh sách"""
        # Tạo 1 bài viết tạm và xóa mềm
        dummy_post_id = uuid.uuid4()
        post = Post(
            post_id=dummy_post_id,
            user_id=self.citizen.user_id,
            content="Bài viết đã bị xóa mềm",
            deleted_at=datetime.now(timezone.utc)
        )
        self.session.add(post)
        await self.session.commit()

        res = await get_user_posts(
            user_id=self.citizen.user_id,
            page=1,
            limit=50,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        post_ids = [p.post_id for p in res.items]
        self.assertNotIn(dummy_post_id, post_ids)

        # Cleanup
        await self.session.execute(delete(Post).where(Post.post_id == dummy_post_id))
        await self.session.commit()

    async def test_get_posts_pagination(self):
        """Kiểm tra phân trang bài đăng timeline (10 bài/lần)"""
        res = await get_user_posts(
            user_id=self.citizen.user_id,
            page=1,
            limit=10,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertLessEqual(len(res.items), 10)
        self.assertTrue(res.has_more)

    # =========================================================================
    # III. KIỂM THỬ MÀN 2: GREEN PASSPORT & HUY HIỆU
    # =========================================================================

    async def test_get_green_passport_formula(self):
        """Kiểm tra tính toán Hộ chiếu Xanh: công thức % tiến độ và điểm lên cấp"""
        res = await get_green_passport(
            user_id=self.citizen.user_id,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertTrue(res.passport_code.startswith("GP-"))
        self.assertEqual(res.current_level, "Lá Xanh")
        self.assertEqual(res.next_level_name, "Cây Xanh")
        self.assertEqual(res.total_green_points, 450)
        # Công thức: floor((450 - 300) / (600 - 300) * 100) = 50%
        self.assertEqual(res.progress_percentage, 50)
        self.assertEqual(res.points_to_next_level, 150)
        self.assertFalse(res.is_max_level)

    async def test_get_green_passport_max_level(self):
        """Người dùng đạt cấp cao nhất (Đại Sứ Xanh) -> progress 100%, is_max_level=True"""
        res = await get_green_passport(
            user_id=self.admin.user_id,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertEqual(res.current_level, "Đại Sứ Xanh")
        self.assertTrue(res.is_max_level)
        self.assertEqual(res.progress_percentage, 100)
        self.assertEqual(res.points_to_next_level, 0)
        self.assertIsNone(res.next_level_name)

    async def test_get_badges_own_profile(self):
        """Chủ trang xem huy hiệu -> Thấy cả Đã nhận và Chưa mở khóa"""
        res = await get_user_badges(
            user_id=self.citizen.user_id,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertTrue(res.is_own_profile)
        self.assertGreaterEqual(len(res.earned_badges), 1)
        self.assertIsNotNone(res.locked_badges)
        self.assertGreaterEqual(len(res.locked_badges), 1)

    async def test_get_badges_other_profile_hides_locked(self):
        """Người khác xem huy hiệu -> locked_badges ẩn hoàn toàn (None)"""
        res = await get_user_badges(
            user_id=self.citizen.user_id,
            auth_data=(self.admin, self.dummy_session),
            db=self.session
        )
        self.assertFalse(res.is_own_profile)
        self.assertGreaterEqual(len(res.earned_badges), 1)
        self.assertIsNone(res.locked_badges, "Trang người khác phải ẩn hoàn toàn phần chưa mở khóa")

    # =========================================================================
    # IV. KIỂM THỬ MÀN 3: LỊCH SỬ ĐÓNG GÓP
    # =========================================================================

    async def test_get_user_activities_list_and_points(self):
        """Lấy danh sách hoạt động đóng góp, tính tổng điểm và phân trang 20 dòng"""
        res = await get_user_activities(
            user_id=self.citizen.user_id,
            limit=20,
            offset=0,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertEqual(len(res.items), 20)
        self.assertGreater(res.total_activities, 20)
        self.assertTrue(res.has_more)
        self.assertGreater(res.total_points, 0)

        # Kiểm tra có hoạt động points = 0 trong CSDL để render "—"
        zero_pts_acts = [a for a in res.items if a.points == 0]
        self.assertGreaterEqual(len(zero_pts_acts), 1, "Cần có hoạt động points=0 để kiểm thử hiển thị dấu gạch ngang")

    async def test_get_user_activities_filter_by_type(self):
        """Lọc theo loại hoạt động (activity_type)"""
        res = await get_user_activities(
            user_id=self.citizen.user_id,
            activity_type="PLANT_TREE",
            limit=20,
            offset=0,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        for act in res.items:
            self.assertEqual(act.activity_type, "PLANT_TREE")

    async def test_get_user_activities_date_validation_future(self):
        """Chọn ngày trong tương lai -> HTTP 400 Không được chọn ngày trong tương lai"""
        tomorrow = date.today() + timedelta(days=1)
        with self.assertRaises(HTTPException) as ctx:
            await get_user_activities(
                user_id=self.citizen.user_id,
                from_date=tomorrow,
                auth_data=(self.citizen, self.dummy_session),
                db=self.session
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("tương lai", str(ctx.exception.detail))

    async def test_get_user_activities_date_validation_from_after_to(self):
        """Từ ngày sau Đến ngày -> HTTP 400 Từ ngày không được sau Đến ngày"""
        d_from = date(2024, 5, 20)
        d_to = date(2024, 5, 10)
        with self.assertRaises(HTTPException) as ctx:
            await get_user_activities(
                user_id=self.citizen.user_id,
                from_date=d_from,
                to_date=d_to,
                auth_data=(self.citizen, self.dummy_session),
                db=self.session
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Từ ngày không được sau Đến ngày", str(ctx.exception.detail))

    # =========================================================================
    # V. KIỂM THỬ MÀN 4: CẬP NHẬT HỒ SƠ & OPTIMISTIC CONCURRENCY CONTROL (OCC)
    # =========================================================================

    async def test_update_profile_success_and_occ_increment(self):
        """Cập nhật thông tin thành công -> version tự động tăng 1"""
        current_version = self.citizen.version
        update_req = UpdateProfileRequest(
            full_name="Nguyễn Thành Đạt Mới",
            bio="Bio đã cập nhật qua kiểm thử",
            date_of_birth=date(1996, 6, 20),
            version=current_version
        )
        res = await update_my_profile(
            body=update_req,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertTrue(res.success)
        self.assertEqual(res.new_version, current_version + 1)
        self.assertEqual(res.user.full_name, "Nguyễn Thành Đạt Mới")
        self.assertEqual(res.user.bio, "Bio đã cập nhật qua kiểm thử")

        # Rollback lại thông tin ban đầu để không ảnh hưởng các test khác
        await self.session.execute(
            update(User)
            .where(User.user_id == self.citizen.user_id)
            .values(
                full_name="Nguyễn Thành Đạt",
                bio="Yêu thiên nhiên, đam mê phân loại rác và lối sống không rác thải (Zero Waste).\nCùng chung tay vì một TP. Thủ Đức xanh - sạch - đẹp! 🌱",
                date_of_birth=date(1995, 5, 15),
                version=current_version
            )
        )
        await self.session.commit()

    async def test_update_profile_conflict_occ_409(self):
        """Cập nhật với version không khớp (Conflict race condition) -> HTTP 409 Conflict"""
        wrong_version = self.citizen.version + 999
        update_req = UpdateProfileRequest(
            full_name="Nguyễn Thành Đạt",
            bio="Thử nghiệm conflict",
            version=wrong_version
        )
        with self.assertRaises(HTTPException) as ctx:
            await update_my_profile(
                body=update_req,
                auth_data=(self.citizen, self.dummy_session),
                db=self.session
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("CONCURRENCY_CONFLICT", str(ctx.exception.detail))

    async def test_update_profile_fullname_whitespace_trimming(self):
        """Họ tên có khoảng trắng thừa đầu cuối và ở giữa phải được tự động chuẩn hóa"""
        raw_name = "   Nguyễn   Văn   Bảo   "
        update_req = UpdateProfileRequest(
            full_name=raw_name,
            version=self.citizen.version
        )
        self.assertEqual(update_req.full_name, "Nguyễn Văn Bảo")

    async def test_update_profile_image_save_and_update(self):
        """Cập nhật avatar ảnh hợp lệ được xử lý qua Pillow và cập nhật database"""
        import io
        import base64
        from PIL import Image

        # Tạo ảnh 200x200 pixel hợp lệ dạng base64
        img = Image.new("RGB", (200, 200), color="green")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64_str = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

        current_ver = self.citizen.version
        update_req = UpdateProfileRequest(
            full_name="Nguyễn Thành Đạt",
            avatar_url=b64_str,
            version=current_ver
        )
        res = await update_my_profile(
            body=update_req,
            auth_data=(self.citizen, self.dummy_session),
            db=self.session
        )
        self.assertTrue(res.success)
        self.assertTrue(res.user.avatar_url.startswith("http://localhost:8000/uploads/profiles/avatar"))

        # Khôi phục version
        await self.session.execute(
            update(User)
            .where(User.user_id == self.citizen.user_id)
            .values(version=current_ver)
        )
        await self.session.commit()


if __name__ == "__main__":
    unittest.main()
