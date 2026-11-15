import io
import os
import sys
import unittest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import UploadFile
from app.api.v1.offline_sync import upload_offline_media_endpoint
from app.models.rbac import User, UserSession


class TestOfflineMediaUploadEndpoint(unittest.IsolatedAsyncioTestCase):
    """
    Kiểm thử trực tiếp endpoint upload tệp ngoại tuyến (STT 19 - Issue 2):
    - Đảm bảo upload ảnh thành công, đóng dấu watermark và tạo thumbnail.
    - Đảm bảo upload video thành công, tạo poster và watermark.
    - Đảm bảo upload âm thanh thành công, lưu file an toàn và không gây TypeError.
    """

    def setUp(self):
        self.mock_user = MagicMock()
        self.mock_user.user_id = uuid.uuid4()
        self.mock_user.email = "tester@greenspot.vn"
        self.mock_user.full_name = "Nguyễn Văn Test"
        self.mock_user.is_active = True

        self.mock_session = MagicMock()
        self.mock_session.session_id = uuid.uuid4()
        self.mock_session.is_revoked = False

        self.auth_data = (self.mock_user, self.mock_session)

    async def test_upload_image_success(self):
        # Tạo 1 ảnh hợp lệ nhỏ trong RAM
        img = Image.new("RGB", (100, 100), color="green")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        upload_file = UploadFile(
            file=buf,
            filename="offline_trash.jpg",
            headers={"content-type": "image/jpeg"},
        )

        res = await upload_offline_media_endpoint(
            file=upload_file,
            client_file_id="img_client_001",
            latitude=10.7769,
            longitude=106.7009,
            captured_at="2026-11-02T10:00:00Z",
            auth_data=self.auth_data,
        )

        self.assertEqual(res["client_file_id"], "img_client_001")
        self.assertEqual(res["media_type"], "IMAGE")
        self.assertTrue(res["file_url"].startswith("/uploads/incidents/"))
        self.assertIsNotNone(res["thumbnail_url"])
        self.assertTrue(res["watermark_applied"])
        self.assertIn("GPS", res["watermark_text"])

    async def test_upload_video_success(self):
        video_bytes = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00"  # Dummy MP4 header
        buf = io.BytesIO(video_bytes)

        upload_file = UploadFile(
            file=buf,
            filename="evidence_video.mp4",
            headers={"content-type": "video/mp4"},
        )

        res = await upload_offline_media_endpoint(
            file=upload_file,
            client_file_id="vid_client_002",
            latitude=10.7769,
            longitude=106.7009,
            captured_at="2026-11-02T10:05:00Z",
            auth_data=self.auth_data,
        )

        self.assertEqual(res["client_file_id"], "vid_client_002")
        self.assertEqual(res["media_type"], "VIDEO")
        self.assertTrue(res["file_url"].startswith("/uploads/incidents/"))
        self.assertIsNotNone(res["thumbnail_url"])
        self.assertTrue(res["watermark_applied"])

    async def test_upload_audio_success(self):
        audio_bytes = b"RIFF....WAVEfmt ....data...."  # Dummy audio bytes
        buf = io.BytesIO(audio_bytes)

        upload_file = UploadFile(
            file=buf,
            filename="voice_recording.webm",
            headers={"content-type": "audio/webm"},
        )

        res = await upload_offline_media_endpoint(
            file=upload_file,
            client_file_id="aud_client_003",
            latitude=10.7769,
            longitude=106.7009,
            captured_at="2026-11-02T10:10:00Z",
            auth_data=self.auth_data,
        )

        self.assertEqual(res["client_file_id"], "aud_client_003")
        self.assertEqual(res["media_type"], "AUDIO")
        self.assertTrue(res["file_url"].startswith("/uploads/incidents/"))
        self.assertIsNone(res["thumbnail_url"])  # Audio không cần thumbnail ảnh
        self.assertIsNotNone(res["watermark_text"])
