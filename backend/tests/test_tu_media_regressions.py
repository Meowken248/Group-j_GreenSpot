import unittest
from starlette.datastructures import UploadFile, Headers
from io import BytesIO
from fastapi import HTTPException
from PIL import Image
from app.core.media_validation import validate_image_bytes


class MediaTests(unittest.TestCase):
    def test_pdf_or_html_renamed_as_jpg_is_rejected(self):
        for content in [b"%PDF-1.7 fake", b"<html>not image</html>", b""]:
            with self.subTest(content=content), self.assertRaises(HTTPException) as error:
                validate_image_bytes(content)
            self.assertEqual(error.exception.status_code, 400)

    def test_real_image_passes_and_gets_matching_extension(self):
        stream = BytesIO()
        Image.new("RGB", (2, 2)).save(stream, format="PNG")
        self.assertEqual(validate_image_bytes(stream.getvalue()), ".png")


class UploadRoutesTests(unittest.IsolatedAsyncioTestCase):
    async def test_renamed_pdf_rejected_by_all_cover_routes(self):
        from app.api.v1.events import upload_event_cover
        from app.api.v1.fundraisers import upload_fundraiser_image
        from app.api.v1.groups import upload_group_cover
        from app.api.v1.offline_sync import upload_offline_media_endpoint
        for route in [upload_event_cover, upload_fundraiser_image, upload_group_cover, upload_offline_media_endpoint]:
            file = UploadFile(BytesIO(b"%PDF-1.7 fake"), filename="renamed.jpg",
                              headers=Headers({"content-type": "image/jpeg"}))
            with self.subTest(route=route.__name__), self.assertRaises(HTTPException) as error:
                if route == upload_offline_media_endpoint:
                    await route(file=file, client_file_id="img", latitude=None, longitude=None, captured_at=None, auth_data=None)
                else:
                    await route(file=file, current_user=None)
            self.assertEqual(error.exception.status_code, 400)
