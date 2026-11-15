import pytest
from starlette.requests import Request
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.services.translation.translation_service import HybridTranslationService
from app.core.localization import parse_accept_language, get_current_language
from app.core.localization_middleware import ResponseLocalizationMiddleware
from app.api.v1.translation.router import router as translation_router

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

    # 2. X-Language header
    scope = {
        "type": "http",
        "headers": [(b"x-language", b"EN"), (b"accept-language", b"vi")],
        "query_string": b"",
    }
    req = Request(scope)
    assert get_current_language(req) == "en"

    # 3. Accept-Language header
    scope = {
        "type": "http",
        "headers": [(b"accept-language", b"en-US,en;q=0.9")],
        "query_string": b"",
    }
    req = Request(scope)
    assert get_current_language(req) == "en"

def test_translation_api_router():
    test_app = FastAPI()
    test_app.include_router(translation_router)
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

def test_response_localization_middleware_translates_database_json():
    """
    Kiem tra ResponseLocalizationMiddleware tu dong dich response JSON tu Database
    khi Client gui kem X-Language: EN hoac Accept-Language: en-US
    """
    app = FastAPI()
    app.add_middleware(ResponseLocalizationMiddleware)

    # Gia lap endpoint tra ve du lieu tieng Viet tu CSDL
    @app.get("/api/v1/mock-db-categories")
    def get_categories():
        return [
            {
                "category_id": 1,
                "category_name": "Rác thải sinh hoạt",
                "description": "Vứt rác vỉa hè, lòng đường, vứt tàn thuốc lá, không phân loại rác tại nguồn.",
                "clause_count": 3
            },
            {
                "category_id": 2,
                "category_name": "Rác công nghiệp/nguy hại",
                "description": "Chôn lấp chất thải nguy hại, đốt chất thải công nghiệp ngoài cơ sở được cấp phép.",
                "clause_count": 2
            }
        ]

    client = TestClient(app)

    # 1. Mac dinh (Khong co header hoac VI) -> Du lieu tieng Viet nguyen ban
    resp_vi = client.get("/api/v1/mock-db-categories")
    assert resp_vi.status_code == 200
    data_vi = resp_vi.json()
    assert data_vi[0]["category_name"] == "Rác thải sinh hoạt"
    assert data_vi[0]["clause_count"] == 3

    # 2. Client gui X-Language: EN -> Response JSON phai tu dong duoc dich sang Tieng Anh!
    resp_en = client.get("/api/v1/mock-db-categories", headers={"X-Language": "EN"})
    assert resp_en.status_code == 200
    data_en = resp_en.json()
    assert data_en[0]["category_name"] == "Domestic Waste"
    assert data_en[0]["clause_count"] == 3  # So lieu nguyen ven
    assert data_en[1]["category_name"] == "Industrial / Hazardous Waste"
    assert "Burying hazardous waste" in data_en[1]["description"]

@pytest.mark.asyncio
async def test_compound_and_accent_romanization(service):
    # Test compound phrase with address and proper nouns
    result = await service.translate_text(
        "Điểm ngập úng sâu 50cm giao lộ Nguyễn Văn Quá",
        target_lang="en",
        source_lang="vi"
    )
    assert "Flood Point" in result
    assert "50cm deep" in result
    assert "Nguyen Van Qua" in result
    # Must not contain Vietnamese accents
    assert not any(c in result for c in "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ")

@pytest.mark.asyncio
async def test_safety_check_and_disaster_phrases(service):
    """Kiem tra cac thuat ngu moi ve PCTT, Safety Check, Friends duoc dich sang Tieng Anh chuan"""
    test_cases = {
        "Xác nhận an toàn": "Safety Confirmation",
        "Tôi an toàn": "I Am Safe",
        "Gửi cho bạn bè": "Send to Friends",
        "Danh bạ bạn bè": "Friends List",
        "Bạn chưa có người bạn nào trong danh bạ": "You do not have any friends in your contact list",
        "Thử nghiệm cảnh báo": "Test Alert",
        "Ban chỉ huy PCTT & TKCN": "Disaster Prevention & Search and Rescue Committee",
        "Vị trí GPS thời gian thực (Đã xác thực)": "Real-time GPS Location (Verified)",
    }
    for vi_text, expected_en in test_cases.items():
        translated = await service.translate_text(vi_text, "en", "vi")
        assert translated.lower() == expected_en.lower()


