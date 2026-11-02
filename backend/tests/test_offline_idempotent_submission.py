import os
import sys
import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.offline_sync import (
    OfflineSubmissionRequest,
    OfflineSubmissionResponse,
    OfflineMediaItem,
)
from app.models.offline_sync import OfflineSubmission
from app.models.incident import Incident, WasteCategory
from app.models.rbac import User
from app.services.offline_sync_service import (
    submit_offline_incident,
    get_submission_status,
    compute_payload_hash,
)
from tests.fixtures.offline_fixtures import (
    get_mock_user_a_id,
    get_mock_user_b_id,
    create_valid_offline_payload,
)


class TestOfflineIdempotentSubmission(unittest.IsolatedAsyncioTestCase):
    """
    Bộ kiểm thử TDD cho nghiệp vụ Offline-First Backend (STT 19):
    - Đảm bảo tính Idempotent (chống gửi trùng, chống cộng lặp điểm thưởng).
    - Đảm bảo phân tách an toàn dữ liệu giữa các tài khoản (User A vs User B).
    - Đảm bảo xác thực ràng buộc dữ liệu đầu vào.
    """

    def setUp(self):
        self.user_a_id = get_mock_user_a_id()
        self.user_b_id = get_mock_user_b_id()

    def test_schema_validation_valid_payload(self):
        raw_payload = create_valid_offline_payload()
        req = OfflineSubmissionRequest(**raw_payload)
        self.assertEqual(req.client_submission_id, raw_payload["client_submission_id"])
        self.assertEqual(req.severity, "HIGH")
        self.assertEqual(len(req.media), 2)
        self.assertEqual(req.media[0].media_type, "IMAGE")
        self.assertEqual(req.media[1].media_type, "AUDIO")

    def test_schema_validation_rejects_invalid_coordinates(self):
        # Vĩ độ > 90
        raw_payload = create_valid_offline_payload(latitude=95.0)
        with self.assertRaises(Exception):
            OfflineSubmissionRequest(**raw_payload)

        # Kinh độ < -180
        raw_payload = create_valid_offline_payload(longitude=-185.0)
        with self.assertRaises(Exception):
            OfflineSubmissionRequest(**raw_payload)

    def test_schema_validation_rejects_empty_submission_id(self):
        raw_payload = create_valid_offline_payload(client_submission_id="short")
        with self.assertRaises(Exception):
            OfflineSubmissionRequest(**raw_payload)

    async def test_duplicate_submission_same_key_returns_cached_incident_without_double_points(self):
        """
        Kịch bản R14 & Chống tạo trùng:
        Gửi yêu cầu lần 2 với cùng client_submission_id:
        - Server nhận biết đây là replay của yêu cầu cũ.
        - Trả về is_duplicate_replay = True.
        - Số điểm thưởng cộng thêm = 0 (không cộng lặp!).
        - Mã tracking code trùng khớp với bản ghi đã tạo trước đó.
        """
        mock_db = AsyncMock()

        cid = "client_sub_unique_123456"
        ikey = "idemp_key_unique_123456"
        existing_incident_id = uuid.uuid4()
        existing_submission_id = uuid.uuid4()

        raw_payload = create_valid_offline_payload(
            client_submission_id=cid,
            idempotency_key=ikey,
        )
        payload = OfflineSubmissionRequest(**raw_payload)
        expected_hash = compute_payload_hash(payload)

        # Giả lập bản ghi đã tồn tại trong offline_submissions của User A
        mock_existing_sub = OfflineSubmission(
            submission_id=existing_submission_id,
            client_submission_id=cid,
            user_id=self.user_a_id,
            incident_id=existing_incident_id,
            idempotency_key=ikey,
            payload_hash=expected_hash,
            status="PROCESSED",
            created_at=datetime.now(timezone.utc),
        )

        mock_existing_incident = Incident(
            incident_id=existing_incident_id,
            tracking_code="#INC-20261101-ABCDE",
            title="Sự cố rác thải cũ",
            description="Mô tả cũ",
            address_text="Địa chỉ cũ",
            latitude=10.79,
            longitude=106.66,
        )

        # Cấu hình mock execute trả về bản ghi cũ
        mock_res_sub = MagicMock()
        mock_res_sub.scalar_one_or_none.return_value = mock_existing_sub

        mock_res_inc = MagicMock()
        mock_res_inc.scalar_one_or_none.return_value = mock_existing_incident

        mock_db.execute.side_effect = [mock_res_sub, mock_res_inc]

        # Gọi service
        response = await submit_offline_incident(
            db=mock_db,
            data=payload,
            current_user_id=self.user_a_id,
        )

        self.assertTrue(response.is_duplicate_replay)
        self.assertEqual(response.points_awarded, 0, "Không được cộng điểm lặp khi gửi lại yêu cầu cũ")
        self.assertEqual(response.tracking_code, "#INC-20261101-ABCDE")
        self.assertEqual(response.client_submission_id, cid)
        # db.commit() không được gọi lại cho incident cũ
        mock_db.commit.assert_not_called()

    async def test_user_isolation_blocks_cross_user_access(self):
        """
        Kịch bản R18:
        Tài khoản B không thể gửi đè hoặc nhận thông tin biên nhận của Tài khoản A.
        """
        mock_db = AsyncMock()
        cid = "client_sub_owner_user_a"

        mock_existing_sub = OfflineSubmission(
            submission_id=uuid.uuid4(),
            client_submission_id=cid,
            user_id=self.user_a_id,  # Thuộc quyền sở hữu của User A
            status="PROCESSED",
        )

        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = mock_existing_sub
        mock_db.execute.return_value = mock_res

        payload = OfflineSubmissionRequest(
            **create_valid_offline_payload(client_submission_id=cid)
        )

        # User B cố tình gửi cùng client_submission_id của User A
        with self.assertRaises(PermissionError):
            await submit_offline_incident(
                db=mock_db,
                data=payload,
                current_user_id=self.user_b_id,
            )

        # User B cũng không được phép tra cứu trạng thái biên nhận của User A
        with self.assertRaises(PermissionError):
            await get_submission_status(
                db=mock_db,
                client_submission_id=cid,
                current_user_id=self.user_b_id,
            )

    async def test_first_submission_creates_incident_and_awards_points(self):
        """
        Kịch bản Gửi lần đầu tiên:
        - Tạo incident mới.
        - Cộng +50 điểm thưởng Công dân Xanh.
        - Ghi biên nhận offline_submissions.
        - Commit giao dịch thành công.
        """
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        cid = "client_sub_new_first_time"

        # 1. Kiểm tra offline_submissions: chưa có
        mock_res_sub = MagicMock()
        mock_res_sub.scalar_one_or_none.return_value = None

        # 2. Lấy category: hợp lệ
        mock_category = WasteCategory(
            category_id=1,
            category_code="RAC_SINH_HOAT",
            name="Rác sinh hoạt",
            sla_hours=24,
            is_active=True,
        )
        mock_res_cat = MagicMock()
        mock_res_cat.scalar_one_or_none.return_value = mock_category

        # 3. Lấy User để cộng điểm
        mock_user = User(
            user_id=self.user_a_id,
            email="user_a@greenspot.vn",
            full_name="Nguyễn Văn A",
            total_green_points=100,
        )
        mock_res_user = MagicMock()
        mock_res_user.scalar_one_or_none.return_value = mock_user

        mock_db.execute.side_effect = [
            mock_res_sub,
            mock_res_cat,
            mock_res_user,
        ]

        payload = OfflineSubmissionRequest(
            **create_valid_offline_payload(
                client_submission_id=cid,
                category_id=1,
                latitude=10.798,
                longitude=106.661,
            )
        )

        with patch("app.services.offline_sync_service.is_within_hcmc_bounds", return_value=True), \
             patch("app.services.offline_sync_service.find_matching_administrative_unit", return_value=(1, "Phường 2, Tân Bình")):
            response = await submit_offline_incident(
                db=mock_db,
                data=payload,
                current_user_id=self.user_a_id,
            )

        self.assertFalse(response.is_duplicate_replay)
        self.assertEqual(response.points_awarded, 50)
        self.assertEqual(response.status, "PROCESSED")
        self.assertTrue(response.tracking_code.startswith("#INC-"))
        self.assertEqual(mock_user.total_green_points, 150)
        # db.commit() phải được gọi đúng 1 lần duy nhất cho toàn bộ giao dịch
        mock_db.commit.assert_awaited_once()

    async def test_same_idempotency_key_different_submission_id_treated_as_duplicate(self):
        """
        Cùng idempotency_key nhưng client_submission_id khác nhau (Issue 6):
        Hệ thống vẫn nhận diện là trùng lặp, không tạo sự cố mới, không cộng điểm 2 lần.
        """
        mock_db = AsyncMock()
        ikey = "idemp_shared_key_111"
        existing_sub_id = uuid.uuid4()
        existing_inc_id = uuid.uuid4()

        payload = OfflineSubmissionRequest(
            **create_valid_offline_payload(
                client_submission_id="sub_new_cid_222",
                idempotency_key=ikey,
            )
        )
        h = compute_payload_hash(payload)

        mock_existing_sub = OfflineSubmission(
            submission_id=existing_sub_id,
            client_submission_id="sub_old_cid_111",
            user_id=self.user_a_id,
            incident_id=existing_inc_id,
            idempotency_key=ikey,
            payload_hash=h,
            status="PROCESSED",
            created_at=datetime.now(timezone.utc),
        )
        mock_inc = Incident(
            incident_id=existing_inc_id,
            tracking_code="#INC-20261102-OLD01",
        )

        mock_res_sub = MagicMock()
        mock_res_sub.scalar_one_or_none.return_value = mock_existing_sub
        mock_res_inc = MagicMock()
        mock_res_inc.scalar_one_or_none.return_value = mock_inc
        mock_db.execute.side_effect = [mock_res_sub, mock_res_inc]

        resp = await submit_offline_incident(
            db=mock_db,
            data=payload,
            current_user_id=self.user_a_id,
        )

        self.assertTrue(resp.is_duplicate_replay)
        self.assertEqual(resp.points_awarded, 0)
        self.assertEqual(resp.tracking_code, "#INC-20261102-OLD01")

    async def test_reused_idempotency_key_with_different_payload_raises_error(self):
        """
        Cùng idempotency_key nhưng đổi nội dung phản ánh (Issue 6):
        Hệ thống phải phát hiện sai lệch payload_hash và từ chối với lỗi rõ ràng.
        """
        mock_db = AsyncMock()
        ikey = "idemp_tampered_key_333"

        payload = OfflineSubmissionRequest(
            **create_valid_offline_payload(
                client_submission_id="sub_tampered_333",
                idempotency_key=ikey,
                title="Tiêu đề đã bị thay đổi hoàn toàn",
            )
        )

        mock_existing_sub = OfflineSubmission(
            submission_id=uuid.uuid4(),
            client_submission_id="sub_tampered_333",
            user_id=self.user_a_id,
            incident_id=uuid.uuid4(),
            idempotency_key=ikey,
            payload_hash="old_different_hash_abc123",
            status="PROCESSED",
            created_at=datetime.now(timezone.utc),
        )
        mock_res_sub = MagicMock()
        mock_res_sub.scalar_one_or_none.return_value = mock_existing_sub
        mock_db.execute.side_effect = [mock_res_sub]

        with self.assertRaises(ValueError) as ctx:
            await submit_offline_incident(
                db=mock_db,
                data=payload,
                current_user_id=self.user_a_id,
            )

        self.assertIn("đã được sử dụng với nội dung phản ánh khác", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
