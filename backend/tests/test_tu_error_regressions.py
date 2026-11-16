import unittest
from typing import Annotated
from fastapi import FastAPI, Path, Query
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from app.core.crud_errors import crud_validation_error_handler
from app.schemas.waste_category import WasteCategoryCreateRequest


class ValidationErrorsTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.add_exception_handler(RequestValidationError, crud_validation_error_handler)

        @app.get("/api/v1/waste-categories/{category_id}")
        def detail(category_id: Annotated[int, Path(ge=1, le=2147483647)]):
            return {"id": category_id}

        @app.get("/api/v1/waste-categories")
        def listing(page: int = Query(1, ge=1)):
            return {"page": page}

        @app.post("/api/v1/waste-categories")
        def create(body: WasteCategoryCreateRequest):
            return body

        self.client = TestClient(app)

    def test_bad_and_overflow_ids_are_404(self):
        for value in ["abc", "99999999999", "-1"]:
            response = self.client.get(f"/api/v1/waste-categories/{value}")
            self.assertEqual(response.status_code, 404)
            self.assertIn("Không tìm thấy", response.json()["detail"])

    def test_bad_page_is_readable(self):
        response = self.client.get("/api/v1/waste-categories?page=abc")
        self.assertEqual(response.status_code, 422)
        self.assertIn("Trang", response.json()["detail"])

    def test_huge_text_and_unicode_blank_have_specific_errors(self):
        for name, expected in [("x" * 101, "100 ký tự"), ("　", "Vui lòng nhập tên")]:
            response = self.client.post("/api/v1/waste-categories", json={
                "category_code": "TEST", "name": name, "sla_hours": 24, "sla_warning_hours": 4})
            self.assertEqual(response.status_code, 422)
            self.assertIn(expected, response.json()["detail"])
            self.assertNotIn('"input"', response.text)

    def test_get_does_not_execute_delete(self):
        response = self.client.get("/api/v1/waste-categories/delete?id=1")
        self.assertEqual(response.status_code, 404)
