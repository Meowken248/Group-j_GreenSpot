"""CRUD regressions. No connection to the development database."""
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import app.models  # noqa: F401
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.waste_category import WasteCategoryUpdateRequest
from app.schemas.recycling_facility import RecyclingFacilityUpdateRequest
from app.services import waste_category_service as categories
from app.services import recycling_facility_service as facilities


class CrudRegressionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = MagicMock(spec=AsyncSession)
        self.result = MagicMock()
        self.db.execute = AsyncMock(return_value=self.result)
        self.db.commit = AsyncMock()
        self.user = SimpleNamespace(user_id=None, email="test@example.com")

    async def test_category_second_tab_cannot_overwrite_newer_data(self):
        self.result.scalar_one_or_none.return_value = SimpleNamespace(
            updated_at=datetime(2026, 11, 16, 2, tzinfo=timezone.utc))
        req = WasteCategoryUpdateRequest(name="Nhựa", sla_hours=24, sla_warning_hours=4,
                                        updated_at="2026-11-16T01:00:00Z")
        with self.assertRaises(HTTPException) as error:
            await categories.update_category(self.db, self.user, 1, req)
        self.assertEqual(error.exception.status_code, 409)
        self.db.commit.assert_not_awaited()

    async def test_facility_future_version_is_rejected(self):
        self.result.scalar_one_or_none.return_value = SimpleNamespace(version=2)
        req = RecyclingFacilityUpdateRequest(name="Trạm", address="Địa chỉ", unit_id=1,
            latitude=10.77, longitude=106.7, accepted_waste_types=["NHUA"],
            open_time="07:30", close_time="17:00", is_active=True, version=99)
        with self.assertRaises(HTTPException) as error:
            await facilities.update_facility(self.db, self.user, 1, req)
        self.assertEqual(error.exception.status_code, 409)
        self.db.commit.assert_not_awaited()

    async def test_second_category_delete_is_not_success(self):
        self.result.scalar_one_or_none.return_value = None
        with self.assertRaises(HTTPException) as error:
            await categories.delete_category(self.db, self.user, 1)
        self.assertEqual(error.exception.status_code, 404)
        self.db.commit.assert_not_awaited()

    async def test_out_of_range_page_has_clear_error(self):
        self.result.scalar.return_value = 2
        with self.assertRaises(HTTPException) as error:
            await categories.list_categories(self.db, page=99999)
        self.assertEqual(error.exception.status_code, 404)

    async def test_facility_rejects_unknown_waste_selection(self):
        district = MagicMock()
        district.scalar_one_or_none.return_value = SimpleNamespace(level="DISTRICT")
        codes = MagicMock()
        codes.scalars.return_value.all.return_value = ["NHUA"]
        self.db.execute.side_effect = [district, codes]
        with self.assertRaises(HTTPException) as error:
            await facilities.validate_facility_selections(self.db, 1, ["HTML_FAKE"])
        self.assertEqual(error.exception.status_code, 400)

    def test_facility_requires_version_and_real_clock_times(self):
        fields = dict(name="Trạm", address="Địa chỉ", unit_id=1, latitude=10.77,
                      longitude=106.7, accepted_waste_types=["NHUA"], is_active=True)
        for extra in [dict(open_time="07:30", close_time="17:00"),
                      dict(open_time="26:00", close_time="99:99", version=1)]:
            with self.subTest(extra=extra), self.assertRaises(ValidationError):
                RecyclingFacilityUpdateRequest(**fields, **extra)

    def test_category_rejects_missing_token_and_full_width_numbers(self):
        for fields in [dict(name="Nhựa", sla_hours=24, sla_warning_hours=4),
                       dict(name="Nhựa", sla_hours="２４", sla_warning_hours=4,
                            updated_at="2026-11-16T01:00:00Z")]:
            with self.subTest(fields=fields), self.assertRaises(ValidationError):
                WasteCategoryUpdateRequest(**fields)


if __name__ == "__main__":
    unittest.main()
