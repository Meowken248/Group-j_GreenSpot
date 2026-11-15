from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from app.core.localization import get_current_language
from app.services.translation.translation_service import translation_service
from app.services.translation.dictionary import VI_TO_EN_DICTIONARY

router = APIRouter(prefix="/translation", tags=["Dynamic Translation & Localization"])

class TranslateTextRequest(BaseModel):
    text: str = Field(..., description="Văn bản cần dịch")
    target_lang: Optional[str] = Field(None, description="Ngôn ngữ đích (vi hoặc en), mặc định theo request context")
    source_lang: Optional[str] = Field("vi", description="Ngôn ngữ nguồn")

class TranslateTextResponse(BaseModel):
    original_text: str
    translated_text: str
    target_lang: str
    source_lang: str

class TranslateBatchRequest(BaseModel):
    texts: List[str] = Field(..., description="Danh sách văn bản cần dịch")
    target_lang: Optional[str] = Field(None, description="Ngôn ngữ đích (vi hoặc en)")
    source_lang: Optional[str] = Field("vi", description="Ngôn ngữ nguồn")

class TranslateBatchResponse(BaseModel):
    translations: List[str]
    target_lang: str
    source_lang: str

class LanguageDetectResponse(BaseModel):
    detected_language: str
    supported_languages: List[str]

@router.get("/detect", response_model=LanguageDetectResponse)
async def detect_language(current_lang: str = Depends(get_current_language)):
    """
    Phát hiện ngôn ngữ được thương lượng từ Client (Header Accept-Language / X-Language).
    """
    return LanguageDetectResponse(
        detected_language=current_lang,
        supported_languages=translation_service.get_supported_languages(),
    )

@router.post("/translate", response_model=TranslateTextResponse)
async def translate_single_text(
    payload: TranslateTextRequest,
    current_lang: str = Depends(get_current_language),
):
    """
    Dịch 1 đoạn văn bản động theo ngôn ngữ yêu cầu (hoặc tự động theo Header).
    """
    target = payload.target_lang if payload.target_lang else current_lang
    source = payload.source_lang or "vi"
    result = await translation_service.translate_text(
        text=payload.text,
        target_lang=target,
        source_lang=source,
    )
    return TranslateTextResponse(
        original_text=payload.text,
        translated_text=result,
        target_lang=target,
        source_lang=source,
    )

@router.post("/batch", response_model=TranslateBatchResponse)
async def translate_batch_texts(
    payload: TranslateBatchRequest,
    current_lang: str = Depends(get_current_language),
):
    """
    Dịch hàng loạt văn bản động cho bảng biểu hoặc danh sách sự cố.
    """
    target = payload.target_lang if payload.target_lang else current_lang
    source = payload.source_lang or "vi"
    results = await translation_service.translate_batch(
        texts=payload.texts,
        target_lang=target,
        source_lang=source,
    )
    return TranslateBatchResponse(
        translations=results,
        target_lang=target,
        source_lang=source,
    )

@router.get("/dictionary")
async def get_domain_dictionary():
    """
    Cung cấp từ điển thuật ngữ môi trường / đô thị phục vụ cache Frontend.
    """
    return {
        "vi_to_en": VI_TO_EN_DICTIONARY,
        "total_terms": len(VI_TO_EN_DICTIONARY),
    }

