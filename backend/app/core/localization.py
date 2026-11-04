from typing import Optional
from fastapi import Request

SUPPORTED_LANGUAGES = {"vi", "en"}
DEFAULT_LANGUAGE = "vi"

def parse_accept_language(accept_language: Optional[str]) -> str:
    """
    Parses RFC 7231 Accept-Language header.
    Example: 'en-US,en;q=0.9,vi;q=0.8' -> returns 'en'.
    Example: 'vi-VN,vi;q=0.9,fr;q=0.8' -> returns 'vi'.
    """
    if not accept_language:
        return DEFAULT_LANGUAGE

    # Split by comma
    parts = accept_language.split(",")
    candidates = []

    for part in parts:
        item = part.strip()
        if not item:
            continue
        quality = 1.0
        lang_tag = item
        if ";q=" in item:
            try:
                lang_tag, q_val = item.split(";q=")
                quality = float(q_val.strip())
            except ValueError:
                quality = 1.0

        lang_tag = lang_tag.strip().lower()
        # Extract primary code (e.g. 'en-us' -> 'en')
        primary_lang = lang_tag.split("-")[0].strip()
        candidates.append((primary_lang, quality))

    # Sort candidates by quality descending
    candidates.sort(key=lambda x: x[1], reverse=True)

    for lang, _ in candidates:
        if lang in SUPPORTED_LANGUAGES:
            return lang

    return DEFAULT_LANGUAGE

def get_current_language(request: Request) -> str:
    """
    FastAPI Dependency to retrieve the negotiated request language.
    Priority:
    1. Query Parameter `lang` or `locale` (e.g. ?lang=en)
    2. Custom Header `X-Language` (e.g. 'EN' or 'VI')
    3. Standard Header `Accept-Language` (e.g. 'en-US,en;q=0.9')
    4. Default fallback: 'vi'
    """
    # 1. Query param
    query_lang = request.query_params.get("lang") or request.query_params.get("locale")
    if query_lang and query_lang.lower().strip() in SUPPORTED_LANGUAGES:
        return query_lang.lower().strip()

    # 2. X-Language header
    x_lang = request.headers.get("x-language") or request.headers.get("X-Language")
    if x_lang and x_lang.lower().strip() in SUPPORTED_LANGUAGES:
        return x_lang.lower().strip()

    # 3. Accept-Language header
    accept_lang = request.headers.get("accept-language") or request.headers.get("Accept-Language")
    return parse_accept_language(accept_lang)
