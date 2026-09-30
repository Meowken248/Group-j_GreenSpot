from typing import Dict, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.core.i18n import get_locale_bundle, t, translate_keys

router = APIRouter(prefix="/i18n", tags=["Internationalization (i18n)"])


class TranslateRequest(BaseModel):
    lang: str = Field(default="vi", description="Mã ngôn ngữ đích ('vi' hoặc 'en')")
    key: Optional[str] = Field(default=None, description="Khóa dịch đơn lẻ, vd: 'app.title'")
    keys: Optional[List[str]] = Field(default=None, description="Danh sách nhiều khóa cần dịch")


class SupportedLanguage(BaseModel):
    code: str
    label: str
    flag: str


@router.get("/languages", response_model=List[SupportedLanguage])
async def get_supported_languages():
    """Lấy danh sách các ngôn ngữ hệ thống hỗ trợ."""
    return [
        {"code": "vi", "label": "Tiếng Việt", "flag": "🇻🇳"},
        {"code": "en", "label": "English", "flag": "🇬🇧"},
    ]


@router.get("/translations")
async def get_translations(
    lang: str = Query("vi", description="Ngôn ngữ cần lấy ('vi' hoặc 'en')"),
    flat: bool = Query(True, description="Trả về dạng phẳng 'app.title' để dễ binding")
):
    """
    API cung cấp toàn bộ bộ từ điển dịch thuật được nạp và quản lý bởi thư viện python-i18n.
    Frontend sẽ gọi API này khi người dùng nhấn nút chuyển đổi ngôn ngữ.
    """
    normalized_lang = "vi" if lang.lower().startswith("vi") else "en"
    bundle = get_locale_bundle(normalized_lang, flat=flat)
    return {
        "status": "success",
        "lang": normalized_lang,
        "engine": "python-i18n",
        "total_keys": len(bundle),
        "translations": bundle,
    }


@router.post("/translate")
async def translate_endpoint(payload: TranslateRequest):
    """
    Gọi trực tiếp hàm i18n.t() của thư viện python-i18n trên Backend
    để dịch một key hoặc danh sách key theo yêu cầu.
    """
    normalized_lang = "vi" if payload.lang.lower().startswith("vi") else "en"

    # Dịch theo danh sách keys
    if payload.keys:
        results = translate_keys(payload.keys, locale=normalized_lang)
        return {
            "status": "success",
            "lang": normalized_lang,
            "engine": "python-i18n",
            "results": results
        }

    # Dịch 1 key đơn
    if payload.key:
        translated_text = t(payload.key, locale=normalized_lang)
        return {
            "status": "success",
            "lang": normalized_lang,
            "key": payload.key,
            "translated": translated_text,
            "engine": "python-i18n"
        }

    return {"status": "error", "message": "Vui lòng cung cấp 'key' hoặc 'keys' cần dịch."}
