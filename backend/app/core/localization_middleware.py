import json
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.localization import get_current_language
from app.services.translation.translation_service import translation_service

class ResponseLocalizationMiddleware(BaseHTTPMiddleware):
    """
    Global Response Localization Middleware.
    When request specifies 'en' via Accept-Language or X-Language:
    1. Intercepts JSON responses from API endpoints.
    2. Translates dynamic domain & database text fields to English.
    3. Returns ONLY the translated English JSON payload (RFC 7231 compliance, no double payloads).
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip docs, static files, openapi schema, and translation endpoints
        path = request.url.path
        if path.startswith(("/docs", "/redoc", "/openapi.json", "/uploads", "/api/v1/translation")):
            return await call_next(request)

        target_lang = get_current_language(request)
        response = await call_next(request)

        # Only process if client requested English and response is successful JSON
        if target_lang != "en" or response.status_code >= 400:
            return response

        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        try:
            # Consume the streaming response body
            body_chunks = [chunk async for chunk in response.body_iterator]
            body_bytes = b"".join(body_chunks)
            if not body_bytes:
                return response

            payload = json.loads(body_bytes.decode("utf-8"))
            translated_payload = await translation_service.translate_data(
                data=payload,
                target_lang="en",
                source_lang="vi",
            )

            new_body = json.dumps(translated_payload, ensure_ascii=False).encode("utf-8")
            headers = dict(response.headers)
            headers["content-length"] = str(len(new_body))
            headers["content-language"] = "en"

            return Response(
                content=new_body,
                status_code=response.status_code,
                headers=headers,
                media_type="application/json",
            )
        except Exception:
            # Fallback to original response on any JSON decoding or translation issue
            return response
