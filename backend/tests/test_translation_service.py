import pytest
from starlette.requests import Request
from app.services.translation.translation_service import HybridTranslationService
from app.services.translation.dictionary import VI_TO_EN_DICTIONARY
from app.core.localization import parse_accept_language, get_current_language

@pytest.fixture
def service():
    return HybridTranslationService()

def test_supported_languages(service):
    langs = service.get_supported_languages()
    assert "vi" in langs
    assert "en" in langs

@pytest.mark.asyncio
async def test_dictionary_lookup(service):
    # Vietnamese to English
    assert await service.translate_text("Bãi rác tự phát", "en", "vi") == "Illegal Dump Site"
    assert await service.translate_text("đang xử lý", "en", "vi") == "In Progress"
    assert await service.translate_text("khẩn cấp", "en", "vi") == "Critical / Emergency"
    assert await service.translate_text("bệnh viện", "en", "vi") == "Hospital"

    # English to Vietnamese
    assert await service.translate_text("hospital", "vi", "en") == "bệnh viện"
    assert await service.translate_text("in progress", "vi", "en") == "đang xử lý"

@pytest.mark.asyncio
async def test_same_language_noop(service):
    text = "Nguyên bản không đổi"
    assert await service.translate_text(text, "vi", "vi") == text
    text_en = "Original unchanged text"
    assert await service.translate_text(text_en, "en", "en") == text_en

@pytest.mark.asyncio
async def test_translate_batch(service):
    texts = ["bãi rác tự phát", "đang xử lý", "trường học"]
    translated = await service.translate_batch(texts, "en", "vi")
    assert translated == ["Illegal Dump Site", "In Progress", "School"]

@pytest.mark.asyncio
async def test_translate_data_recursive(service):
    payload = {
        "incident_id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Bãi rác tự phát",
        "status": "đang xử lý",
        "severity": "khẩn cấp",
        "latitude": 10.7769,
        "longitude": 106.7009,
        "facility": {
            "name": "Bệnh viện",
            "distance": 150.5
        },
        "history": [
            {"notes": "Bãi rác tự phát"},
            {"notes": "Hoàn thành"}
        ],
        "is_active": True
    }

    translated = await service.translate_data(payload, target_lang="en", source_lang="vi")

    # IDs, numbers, booleans must remain completely unchanged
    assert translated["incident_id"] == "123e4567-e89b-12d3-a456-426614174000"
    assert translated["latitude"] == 10.7769
    assert translated["longitude"] == 106.7009
    assert translated["is_active"] is True
    assert translated["facility"]["distance"] == 150.5

    # Text fields must be translated to English
    assert translated["title"] == "Illegal Dump Site"
    assert translated["status"] == "In Progress"
    assert translated["facility"]["name"] == "Hospital"
    assert translated["history"][0]["notes"] == "Illegal Dump Site"
    assert translated["history"][1]["notes"] == "Completed"

def test_parse_accept_language():
    assert parse_accept_language("en-US,en;q=0.9,vi;q=0.8") == "en"
    assert parse_accept_language("vi-VN,vi;q=0.9,en;q=0.8") == "vi"
    assert parse_accept_language("fr-FR,fr;q=0.9,de;q=0.8") == "vi"  # Unsupported fallback to default
    assert parse_accept_language(None) == "vi"
    assert parse_accept_language("") == "vi"

def test_get_current_language_priority():
    # 1. Query parameter takes precedence
    scope = {
        "type": "http",
        "headers": [(b"accept-language", b"vi"), (b"x-language", b"vi")],
        "query_string": b"lang=en",
    }
    req = Request(scope)
    assert get_current_language(req) == "en"

def test_translation_api_router():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.v1.translation.router import router

    test_app = FastAPI()
    test_app.include_router(router)
    client = TestClient(test_app)

    # 1. Detect language via Accept-Language
    resp = client.get("/translation/detect", headers={"Accept-Language": "en-US,en;q=0.9"})
    assert resp.status_code == 200
    assert resp.json()["detected_language"] == "en"

    # 2. Translate single text
    resp = client.post("/translation/translate", json={"text": "bãi rác tự phát", "target_lang": "en"})
    assert resp.status_code == 200
    assert resp.json()["translated_text"] == "Illegal Dump Site"

    # 3. Translate batch
    resp = client.post("/translation/batch", json={"texts": ["đang xử lý", "khẩn cấp"], "target_lang": "en"})
    assert resp.status_code == 200
    assert resp.json()["translations"] == ["In Progress", "Critical / Emergency"]

    # 4. Get dictionary
    resp = client.get("/translation/dictionary")
    assert resp.status_code == 200
    assert resp.json()["total_terms"] > 10


    # 2. X-Language header
    scope = {
        "type": "http",
        "headers": [(b"x-language", b"EN"), (b"accept-language", b"vi")],
        "query_string": b"",
    }
    req = Request(scope)
    assert get_current_language(req) == "en"

def test_translation_api_router():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.v1.translation.router import router

    test_app = FastAPI()
    test_app.include_router(router)
    client = TestClient(test_app)

    # 1. Detect language via Accept-Language
    resp = client.get("/translation/detect", headers={"Accept-Language": "en-US,en;q=0.9"})
    assert resp.status_code == 200
    assert resp.json()["detected_language"] == "en"

    # 2. Translate single text
    resp = client.post("/translation/translate", json={"text": "bãi rác tự phát", "target_lang": "en"})
    assert resp.status_code == 200
    assert resp.json()["translated_text"] == "Illegal Dump Site"

    # 3. Translate batch
    resp = client.post("/translation/batch", json={"texts": ["đang xử lý", "khẩn cấp"], "target_lang": "en"})
    assert resp.status_code == 200
    assert resp.json()["translations"] == ["In Progress", "Critical / Emergency"]

    # 4. Get dictionary
    resp = client.get("/translation/dictionary")
    assert resp.status_code == 200
    assert resp.json()["total_terms"] > 10


    # 3. Accept-Language header
    scope = {
        "type": "http",
        "headers": [(b"accept-language", b"en-US,en;q=0.9")],
        "query_string": b"",
    }
    req = Request(scope)
    assert get_current_language(req) == "en"

def test_translation_api_router():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.v1.translation.router import router

    test_app = FastAPI()
    test_app.include_router(router)
    client = TestClient(test_app)

    # 1. Detect language via Accept-Language
    resp = client.get("/translation/detect", headers={"Accept-Language": "en-US,en;q=0.9"})
    assert resp.status_code == 200
    assert resp.json()["detected_language"] == "en"

    # 2. Translate single text
    resp = client.post("/translation/translate", json={"text": "bãi rác tự phát", "target_lang": "en"})
    assert resp.status_code == 200
    assert resp.json()["translated_text"] == "Illegal Dump Site"

    # 3. Translate batch
    resp = client.post("/translation/batch", json={"texts": ["đang xử lý", "khẩn cấp"], "target_lang": "en"})
    assert resp.status_code == 200
    assert resp.json()["translations"] == ["In Progress", "Critical / Emergency"]

    # 4. Get dictionary
    resp = client.get("/translation/dictionary")
    assert resp.status_code == 200
    assert resp.json()["total_terms"] > 10

