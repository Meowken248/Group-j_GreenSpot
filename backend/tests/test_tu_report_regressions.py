import unittest
from pydantic import ValidationError
from app.schemas.incident import IncidentCreateRequest


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
