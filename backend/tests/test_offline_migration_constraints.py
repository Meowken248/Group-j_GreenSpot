import os
import sys
import unittest
import uuid
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models.offline_sync import OfflineSubmission, OfflineMediaUpload


class TestOfflineMigrationConstraints(unittest.TestCase):
    """Kiểm tra tính toàn vẹn và các ràng buộc schema của bảng offline_submissions và offline_media_uploads."""

    def test_offline_submission_table_structure(self):
        table = OfflineSubmission.__table__
        self.assertEqual(table.name, "offline_submissions")
        column_names = [c.name for c in table.columns]
        expected_columns = [
            "submission_id",
            "client_submission_id",
            "user_id",
            "incident_id",
            "idempotency_key",
            "status",
            "client_timestamp",
            "server_received_at",
            "synced_at",
            "response_payload",
            "error_message",
            "version",
            "created_at",
            "updated_at",
        ]
        for col in expected_columns:
            self.assertIn(col, column_names, f"Thiếu cột {col} trong bảng offline_submissions")

        # Kiểm tra Unique Constraint trên client_submission_id
        client_sub_col = table.columns["client_submission_id"]
        self.assertTrue(client_sub_col.unique or any(
            isinstance(c, type(table.constraints)) for c in table.constraints
        ))

    def test_offline_media_uploads_table_structure(self):
        table = OfflineMediaUpload.__table__
        self.assertEqual(table.name, "offline_media_uploads")
        column_names = [c.name for c in table.columns]
        expected_columns = [
            "upload_id",
            "submission_id",
            "client_file_id",
            "media_type",
            "media_id",
            "captured_at",
            "file_url",
            "file_hash",
            "file_size_bytes",
            "status",
            "created_at",
        ]
        for col in expected_columns:
            self.assertIn(col, column_names, f"Thiếu cột {col} trong bảng offline_media_uploads")

    def test_model_instantiation(self):
        sub_id = uuid.uuid4()
        user_id = uuid.uuid4()
        now = datetime.utcnow()

        sub = OfflineSubmission(
            submission_id=sub_id,
            client_submission_id="sub_test_12345",
            user_id=user_id,
            idempotency_key="idemp_key_999",
            status="PROCESSED",
            client_timestamp=now,
            server_received_at=now,
        )
        self.assertEqual(sub.submission_id, sub_id)
        self.assertEqual(sub.client_submission_id, "sub_test_12345")
        self.assertEqual(sub.status, "PROCESSED")

        media = OfflineMediaUpload(
            submission_id=sub_id,
            client_file_id="file_abc_1",
            media_type="IMAGE",
            captured_at=now,
            file_url="https://storage.greenspot.vn/test.jpg",
            file_hash="hash_sha256_mock",
            file_size_bytes=1024,
        )
        self.assertEqual(media.submission_id, sub_id)
        self.assertEqual(media.client_file_id, "file_abc_1")
        self.assertEqual(media.media_type, "IMAGE")


if __name__ == "__main__":
    unittest.main()
