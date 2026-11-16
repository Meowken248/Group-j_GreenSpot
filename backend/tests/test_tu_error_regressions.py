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


class RealRouterSafetyTests(unittest.TestCase):
    def setUp(self):
        from unittest.mock import MagicMock
        from app.database import get_db
        self.db = MagicMock()
        self.db.execute.side_effect = AssertionError("Regression tests must not query the development database")
        self.app = FastAPI()
        self.app.add_exception_handler(RequestValidationError, crud_validation_error_handler)

        async def isolated_db():
            yield self.db

        self.app.dependency_overrides[get_db] = isolated_db

    def test_real_offline_validation_is_readable(self):
        from types import SimpleNamespace
        from app.api.v1.offline_sync import router
        from app.api.v1.auth import get_current_user_and_session
        self.app.include_router(router, prefix="/api/v1")
        self.app.dependency_overrides[get_current_user_and_session] = lambda: (SimpleNamespace(), SimpleNamespace())
        response = TestClient(self.app).post("/api/v1/offline-sync/incidents", json={
            "client_submission_id": "submission_123456", "idempotency_key": "key_1234567890",
            "category_id": 1, "title": "　", "description": "Cần thu gom", "latitude": 10.77,
            "longitude": 106.7, "address_text": "Quận 1",
            "media": [{"client_file_id": "image", "file_url": "/uploads/a.jpg"}],
        })
        self.assertEqual(response.status_code, 422)
        self.assertIsInstance(response.json()["detail"], str)
        self.assertIn("không được chỉ chứa khoảng trắng", response.json()["detail"])
        self.db.execute.assert_not_called()

    def test_real_delete_routes_require_login(self):
        import uuid
        from fastapi.routing import APIRoute
        from app.api.v1 import posts, comments, chat, groups, fundraisers, waste_categories, recycling_facilities, chatbot
        modules = [posts, comments, chat, groups, fundraisers, waste_categories, recycling_facilities, chatbot]
        for module in modules:
            self.app.include_router(module.router, prefix="/api/v1")
        client = TestClient(self.app)
        checked = 0
        for route in [route for module in modules for route in module.router.routes]:
            if not isinstance(route, APIRoute) or "DELETE" not in route.methods:
                continue
            path = "/api/v1" + route.path
            for field in route.param_convertors:
                value = "1" if field in {"category_id", "facility_id"} else str(uuid.uuid4())
                path = path.replace("{" + field + "}", value)
            with self.subTest(path=path):
                self.assertIn(client.delete(path).status_code, (401, 403))
            checked += 1
        self.assertGreaterEqual(checked, 8)
        self.db.execute.assert_not_called()

    def test_pasting_member_delete_url_in_browser_does_not_delete(self):
        import uuid
        from app.api.v1.groups import router
        self.app.include_router(router, prefix="/api/v1")
        path = f"/api/v1/groups/{uuid.uuid4()}/members/{uuid.uuid4()}"
        self.assertEqual(TestClient(self.app).get(path).status_code, 405)
        self.db.execute.assert_not_called()
