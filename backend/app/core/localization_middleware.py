import json
import logging
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.localization import get_current_language
from app.services.translation.translation_service import translation_service

logger = logging.getLogger(__name__)


class ResponseLocalizationMiddleware(BaseHTTPMiddleware):
    """
    Global Response Localization Middleware.
    When request specifies 'en' via X-Language or Accept-Language header:
    1. Intercepts JSON responses from all API endpoints.
    2. Recursively translates all Vietnamese text fields to English.
    3. Returns a single translated English JSON payload (RFC 7231 — no dual vi+en payload).
    """

    # Paths that should bypass translation (technical/static endpoints)
    _SKIP_PREFIXES = (
        "/docs",
        "/redoc",
        "/openapi.json",
        "/uploads",
        "/api/v1/translation",
        "/health",
    )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Fast-path: skip non-API and explicitly excluded paths
        if any(path.startswith(prefix) for prefix in self._SKIP_PREFIXES):
            return await call_next(request)

        # Resolve target language BEFORE forwarding the request
        target_lang = get_current_language(request)

        # Forward request to the actual endpoint handler
        response = await call_next(request)

        # Only translate JSON responses when English is requested
        if target_lang != "en":
            return response

        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        # Skip already-translated responses (prevent double translation)
        if response.headers.get("content-language") == "en":
            return response

        try:
            # Read full streaming body
            body_chunks = [chunk async for chunk in response.body_iterator]
            body_bytes = b"".join(body_chunks)
            if not body_bytes:
                return response

            payload = json.loads(body_bytes.decode("utf-8"))

            # Deep recursive translation of all Vietnamese string fields
            translated_payload = await translation_service.translate_data(
                data=payload,
                target_lang="en",
                source_lang="vi",
            )

            new_body = json.dumps(translated_payload, ensure_ascii=False).encode("utf-8")

            # Preserve original response headers, only update content-related ones
            headers = {
                k: v for k, v in response.headers.items()
                if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
            }
            headers["content-length"] = str(len(new_body))
            headers["content-language"] = "en"
            headers["content-type"] = "application/json; charset=utf-8"

            return Response(
                content=new_body,
                status_code=response.status_code,
                headers=headers,
                media_type="application/json",
            )
        except Exception as exc:
            logger.warning("[i18n] Translation middleware error for %s: %s", path, exc)
            # Reconstruct original response from already-consumed body
            return Response(
                content=body_bytes if "body_bytes" in dir() else b"",
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=content_type,
            )
