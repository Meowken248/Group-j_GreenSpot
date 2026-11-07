import asyncio
import html
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import httpx
from app.interface.translation.translation_interface import ITranslationService
from app.services.translation.dictionary import VI_TO_EN_DICTIONARY, EN_TO_VI_DICTIONARY

VIETNAMESE_ACCENT_DICT = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a','â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'đ':'d',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o','ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'À':'A','Á':'A','Ả':'A','Ã':'A','Ạ':'A','Ă':'A','Ằ':'A','Ắ':'A','Ẳ':'A','Ẵ':'A','Ặ':'A','Â':'A','Ầ':'A','Ấ':'A','Ẩ':'A','Ẫ':'A','Ậ':'A',
    'Đ':'D',
    'È':'E','É':'E','Ẻ':'E','Ẽ':'E','Ẹ':'E','Ê':'E','Ề':'E','Ế':'E','Ể':'E','Ễ':'E','Ệ':'E',
    'Ì':'I','Í':'I','Ỉ':'I','Ĩ':'I','Ị':'I',
    'Ò':'O','Ó':'O','Ỏ':'O','Õ':'O','Ọ':'O','Ô':'O','Ồ':'O','Ố':'O','Ổ':'O','Ỗ':'O','Ộ':'O','Ơ':'O','Ờ':'O','Ớ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
    'Ù':'U','Ú':'U','Ủ':'U','Ũ':'U','Ụ':'U','Ư':'U','Ừ':'U','Ứ':'U','Ử':'U','Ữ':'U','Ự':'U',
    'Ỳ':'Y','Ý':'Y','Ỷ':'Y','Ỹ':'Y','Ỵ':'Y'
}
VIETNAMESE_ACCENT_TABLE = str.maketrans(VIETNAMESE_ACCENT_DICT)

def strip_vietnamese_accents(text: str) -> str:
    return text.translate(VIETNAMESE_ACCENT_TABLE)

class HybridTranslationService(ITranslationService):
    """
    Hybrid Translation Service:
    1. Instant O(1) domain dictionary lookup for system metadata & environmental terms.
    2. Dynamic async auto-translation for user-generated content (posts, descriptions, addresses).
    3. Memory-efficient LRU cache to avoid repeated translations.
    4. Resilient graceful degradation (fallback) if offline or network unavailable.
    """

    def __init__(self, cache_size: int = 5000):
        self._cache: Dict[Tuple[str, str, str], str] = {}
        self._cache_size = cache_size
        self._supported_langs = ["vi", "en"]
        self._default_target_keys = {
            "title",
            "description",
            "name",
            "category",
            "category_name",
            "status",
            "address",
            "content",
            "message",
            "reason",
            "label",
            "notes",
            "summary",
            "action_text",
            "display_name",
            "hazard_level",
            "domain",
            "legal_reference",
            "decree",
            "behavior_summary",
            "remedial_measures",
            "penalty_range",
            "authority",
            "quick_category",
            "incident_title",
            "incident_type",
            "team_name",
            "team_status",
            "location_address",
            "status_label",
            "priority_label",
            "empty_message",
            "district",
            "ward",
            "role_name",
            "role_description",
            "badge_name",
            "badge_desc",
            "quest_title",
            "quest_description",
            "comment_text",
            "post_content",
            "report_title",
            "feedback_message",
            "response_text",
            "victim_name",
            "severity_level",
            "detail",
            "error",
            "hint",
            "tip",
            "prize_name",
            "tier_name",
            "bio",
        }

    def get_supported_languages(self) -> List[str]:
        return list(self._supported_langs)

    def _lookup_dictionary(self, text: str, target_lang: str, source_lang: str) -> Optional[str]:
        cleaned = text.strip()
        lower = cleaned.lower()

        if target_lang == "en" and source_lang == "vi":
            if cleaned in VI_TO_EN_DICTIONARY:
                return VI_TO_EN_DICTIONARY[cleaned]
            if lower in VI_TO_EN_DICTIONARY:
                res = VI_TO_EN_DICTIONARY[lower]
                if cleaned.isupper():
                    return res.upper()
                if cleaned[0].isupper() and not res[0].isupper():
                    return res[0].upper() + res[1:]
                return res
            for k, v in VI_TO_EN_DICTIONARY.items():
                if k.lower() == lower:
                    if cleaned.isupper():
                        return v.upper()
                    if cleaned[0].isupper() and not v[0].isupper():
                        return v[0].upper() + v[1:]
                    return v
        elif target_lang == "vi" and source_lang == "en":
            if cleaned in EN_TO_VI_DICTIONARY:
                return EN_TO_VI_DICTIONARY[cleaned]
            if lower in EN_TO_VI_DICTIONARY:
                res = EN_TO_VI_DICTIONARY[lower]
                if cleaned.isupper():
                    return res.upper()
                if cleaned[0].isupper() and not res[0].isupper():
                    return res[0].upper() + res[1:]
                return res
            for k, v in EN_TO_VI_DICTIONARY.items():
                if k.lower() == lower:
                    if cleaned.isupper():
                        return v.upper()
                    if cleaned[0].isupper() and not v[0].isupper():
                        return v[0].upper() + v[1:]
                    return v

        return None

    async def _fetch_online_translation(
        self, text: str, target_lang: str, source_lang: str
    ) -> Optional[str]:
        """
        Translates dynamic user-generated content via multi-engine fallback:
        Engine 1: MyMemory Translation API (Fast, reliable, high availability)
        Engine 2: Google Translate GTX Endpoint (Alternative fallback)
        """
        # Engine 1: MyMemory Translation
        try:
            mymemory_url = "https://api.mymemory.translated.net/get"
            langpair = f"{source_lang}|{target_lang}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(mymemory_url, params={"q": text, "langpair": langpair})
                if resp.status_code == 200:
                    data = resp.json()
                    trans_text = data.get("responseData", {}).get("translatedText")
                    if trans_text and isinstance(trans_text, str) and trans_text.strip():
                        # Unescape HTML entities like &#39;, &quot;, &amp;
                        unescaped = html.unescape(trans_text.strip())
                        # If response is not just an error message or same untranslated text
                        if not unescaped.startswith("MYMEMORY WARNING:") and unescaped.lower() != text.lower():
                            return unescaped
        except Exception:
            pass

        # Engine 2: Google Translate GTX fallback
        try:
            gtx_url = "https://translate.googleapis.com/translate_a/single"
            params = {
                "client": "gtx",
                "sl": source_lang,
                "tl": target_lang,
                "dt": "t",
                "q": text,
            }
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(gtx_url, params=params)
                if resp.status_code == 200:
                    payload = resp.json()
                    if payload and isinstance(payload, list) and len(payload) > 0:
                        parts = payload[0]
                        if isinstance(parts, list):
                            translated = "".join(
                                part[0] for part in parts if isinstance(part, list) and len(part) > 0 and part[0]
                            )
                            if translated:
                                return html.unescape(translated.strip())
        except Exception:
            pass

        return None

    def _fallback_token_translation(self, text: str, target_lang: str, source_lang: str) -> str:
        """Token-level replacement for compound phrases using dictionary terms."""
        if target_lang != "en":
            return text

        result = text
        # Replace longer matching dictionary terms first
        sorted_terms = sorted(VI_TO_EN_DICTIONARY.keys(), key=len, reverse=True)
        for term in sorted_terms:
            pattern = re.compile(re.escape(term), re.IGNORECASE)
            result = pattern.sub(VI_TO_EN_DICTIONARY[term], result)

        # Regex replacements for numbers and patterns
        result = re.sub(r"(\d+)\s*người\s*dân", r"\1 residents", result, flags=re.IGNORECASE)
        result = re.sub(r"(\d+)\s*người", lambda m: "1 person" if m.group(1) == "1" else f"{m.group(1)} people", result, flags=re.IGNORECASE)
        result = re.sub(r"(\d+)\s*trẻ\s*nhỏ", lambda m: "1 child" if m.group(1) == "1" else f"{m.group(1)} children", result, flags=re.IGNORECASE)
        result = re.sub(r"(\d+)\s*người\s*già", r"\1 elderly", result, flags=re.IGNORECASE)
        result = re.sub(r"(\d+)\s*điểm", r"\1 points", result, flags=re.IGNORECASE)
        result = re.sub(r"(\d+)\s*điều khoản", r"\1 clauses", result, flags=re.IGNORECASE)
        result = re.sub(r"sâu\s*(\d+)cm", r"\1cm deep", result, flags=re.IGNORECASE)
        result = re.sub(r"bán kính\s*(\d+)km", r"\1km radius", result, flags=re.IGNORECASE)

        # Address & location token replacements
        result = re.sub(r"\bNgã\s*tư\b", "Intersection of", result, flags=re.IGNORECASE)
        result = re.sub(r"\bGiao\s*lộ\b", "Intersection of", result, flags=re.IGNORECASE)
        result = re.sub(r"\bĐường\b", "Street", result, flags=re.IGNORECASE)
        result = re.sub(r"\bPhường\b", "Ward", result, flags=re.IGNORECASE)
        result = re.sub(r"\bQuận\b", "District", result, flags=re.IGNORECASE)
        result = re.sub(r"\bHuyện\b", "District", result, flags=re.IGNORECASE)
        result = re.sub(r"\bTP\.?\s*Thủ\s*Đức\b", "Thu Duc City", result, flags=re.IGNORECASE)
        result = re.sub(r"\bTP\.?\s*HCM\b", "HCMC", result, flags=re.IGNORECASE)
        result = re.sub(r"\bTP\.?\s*Hồ\s*Chí\s*Minh\b", "HCMC", result, flags=re.IGNORECASE)
        result = re.sub(r"\bBờ\s*kè\b", "Embankment", result, flags=re.IGNORECASE)
        result = re.sub(r"\bChợ\b", "Market", result, flags=re.IGNORECASE)
        result = re.sub(r"\bKênh\b", "Canal", result, flags=re.IGNORECASE)
        result = re.sub(r"\bSông\b", "River", result, flags=re.IGNORECASE)
        result = re.sub(r"\bCầu\b", "Bridge", result, flags=re.IGNORECASE)
        result = re.sub(r"\bHẻm\b", "Alley", result, flags=re.IGNORECASE)

        return result

    async def translate_text(
        self,
        text: str,
        target_lang: str = "en",
        source_lang: str = "vi"
    ) -> str:
        if not text or not isinstance(text, str):
            return text

        target_lang = target_lang.lower().strip()
        source_lang = source_lang.lower().strip()

        # If source and target are the same language, no translation needed
        if target_lang == source_lang:
            return text

        cache_key = (text, source_lang, target_lang)
        if cache_key in self._cache:
            return self._cache[cache_key]

        # 1. Exact dictionary match
        dict_match = self._lookup_dictionary(text, target_lang, source_lang)
        if dict_match:
            self._save_to_cache(cache_key, dict_match)
            return dict_match

        # 2. Dynamic online translation for user-generated strings
        online_result = await self._fetch_online_translation(text, target_lang, source_lang)
        if online_result:
            self._save_to_cache(cache_key, online_result)
            return online_result

        # 3. Fallback token-level dictionary replacement
        fallback_result = self._fallback_token_translation(text, target_lang, source_lang)
        self._save_to_cache(cache_key, fallback_result)
        return fallback_result

    def _save_to_cache(self, key: Tuple[str, str, str], value: str):
        if len(self._cache) >= self._cache_size:
            # Evict oldest entry (simple FIFO purge)
            first_key = next(iter(self._cache))
            del self._cache[first_key]
        self._cache[key] = value

    async def translate_batch(
        self,
        texts: List[str],
        target_lang: str = "en",
        source_lang: str = "vi"
    ) -> List[str]:
        if not texts:
            return []
        tasks = [self.translate_text(t, target_lang, source_lang) for t in texts]
        return await asyncio.gather(*tasks)

    def _is_translatable_string(self, key: str, val: Any, explicit_keys: Optional[set]) -> bool:
        if not isinstance(val, str) or len(val) < 2:
            return False
        if explicit_keys is not None:
            return key in explicit_keys

        # Skip values that are clearly technical identifiers or not translateable
        if val.startswith(("http://", "https://", "#", "data:", "/")):
            return False
        if re.match(r"^[0-9a-fA-F-]{36}$", val):  # UUID
            return False
        if re.match(r"^\d{4}-\d{2}-\d{2}T", val):  # ISO Date
            return False
        if re.match(r"^\d{4}-\d{2}-\d{2}$", val):  # Date YYYY-MM-DD
            return False
        if re.match(r"^[+\d\s\-()]{7,20}$", val):  # Phone number
            return False
        if re.match(r"^[A-Z0-9_]{2,20}$", val):  # ENUM codes like IN_PROGRESS, CANCELLED
            return False

        key_lower = key.lower()
        # Skip purely technical keys regardless of value
        if any(ign in key_lower for ign in ["password", "token", "hash", "secret", "key", "url", "path", "icon", "color", "image", "photo", "avatar", "thumbnail"]):
            return False

        # ALWAYS translate if the value contains Vietnamese diacritics (highest priority rule)
        if re.search(r"[\u00C0-\u1EF9]", val):
            return True

        # Also translate known semantic keys whose values may be pure ASCII Vietnamese romanized
        if key_lower in self._default_target_keys:
            return True
        if any(key_lower.endswith(sfx) for sfx in [
            "_title", "_name", "_address", "_label", "_desc", "_description",
            "_text", "_msg", "_message", "_content", "_status", "_type", "_category"
        ]):
            return True

        return False

    async def translate_data(
        self,
        data: Union[Dict[str, Any], List[Any], Any],
        target_lang: str = "en",
        source_lang: str = "vi",
        target_keys: Optional[List[str]] = None
    ) -> Any:
        """
        Recursively translates text fields in dict/list payloads.
        Only translates text values belonging to target_keys or containing Vietnamese accents.
        Does not mutate the original data structure.
        """
        target_lang = target_lang.lower().strip()
        source_lang = source_lang.lower().strip()

        if target_lang == source_lang or data is None:
            return data

        explicit_keys = set(target_keys) if target_keys else None

        if isinstance(data, dict):
            new_dict = {}
            for k, v in data.items():
                if self._is_translatable_string(k, v, explicit_keys):
                    new_dict[k] = await self.translate_text(v, target_lang, source_lang)
                elif isinstance(v, (dict, list)):
                    new_dict[k] = await self.translate_data(v, target_lang, source_lang, target_keys)
                else:
                    new_dict[k] = v
            return new_dict

        elif isinstance(data, list):
            new_list = []
            for item in data:
                if isinstance(item, (dict, list)):
                    new_list.append(await self.translate_data(item, target_lang, source_lang, target_keys))
                elif isinstance(item, str) and (explicit_keys is None or self._is_translatable_string("", item, None)):
                    new_list.append(await self.translate_text(item, target_lang, source_lang))
                else:
                    new_list.append(item)
            return new_list

        return data

# Singleton Instance
translation_service = HybridTranslationService()
