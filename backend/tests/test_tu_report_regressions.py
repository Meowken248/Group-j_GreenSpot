import unittest
from pydantic import ValidationError
from app.schemas.incident import IncidentCreateRequest
from app.schemas.offline_sync import OfflineSubmissionRequest


class ReportValidationTests(unittest.TestCase):
    def setUp(self):
        self.valid = dict(category_id=1, title="Rác thải", description="Cần thu gom",
            latitude=10.77, longitude=106.7, address_text="Quận 1", severity="MEDIUM",
            media=[dict(file_url="/uploads/incidents/a.jpg", media_type="IMAGE")])

    def test_rejects_invalid_selections_blank_text_and_too_many_files(self):
        for patch in [dict(category_id=99999999999), dict(severity="FAKE"),
                      dict(title="　"), dict(description="  "), dict(media=[]),
                      dict(media=self.valid["media"] * 6)]:
            with self.subTest(patch=patch), self.assertRaises(ValidationError):
                IncidentCreateRequest(**(self.valid | patch))

    def test_rejects_browser_only_urls(self):
        for url in ["blob:local-only", "data:image/png;base64,abc", " "]:
            with self.subTest(url=url), self.assertRaises(ValidationError):
                IncidentCreateRequest(**(self.valid | {"media": [dict(file_url=url)]}))

    def test_offline_rejects_same_invalid_input_as_online(self):
        valid = self.valid | {"client_submission_id": "submission_123456", "idempotency_key": "key_1234567890",
            "media": [dict(client_file_id="img", file_url="/uploads/a.jpg")]}
        for patch in [dict(title="　"), dict(severity="FAKE"), dict(category_id=99999999999), dict(media=[]),
                      dict(media=[dict(client_file_id="img", file_url="blob:lost")])]:
            with self.subTest(patch=patch), self.assertRaises(ValidationError):
                OfflineSubmissionRequest(**(valid | patch))
