import asyncio
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import httpx
from app.interface.translation.translation_interface import ITranslationService
from app.services.translation.dictionary import VI_TO_EN_DICTIONARY, EN_TO_VI_DICTIONARY

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
        }

    def get_supported_languages(self) -> List[str]:
        return list(self._supported_langs)

    def _lookup_dictionary(self, text: str, target_lang: str, source_lang: str) -> Optional[str]:
        cleaned = text.strip()
        lower = cleaned.lower()

        if target_lang == "en" and source_lang == "vi":
            if lower in VI_TO_EN_DICTIONARY:
                res = VI_TO_EN_DICTIONARY[lower]
                if cleaned.isupper():
                    return res.upper()
                return res
        elif target_lang == "vi" and source_lang == "en":
            if lower in EN_TO_VI_DICTIONARY:
                res = EN_TO_VI_DICTIONARY[lower]
                if cleaned.isupper():
                    return res.upper()
                if cleaned[0].isupper():
                    return res.capitalize()
                return res

        return None

    async def _fetch_online_translation(
        self, text: str, target_lang: str, source_lang: str
    ) -> Optional[str]:
        """
        Translates dynamic user-generated content via Google Translate engine.
        Timeouts gracefully in 2.5 seconds to guarantee high-speed API responses.
        """
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": source_lang,
            "tl": target_lang,
            "dt": "t",
            "q": text,
        }
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    payload = resp.json()
                    # Google Translate response format: [[["translated text", "original text", ...], ...], ...]
                    if payload and isinstance(payload, list) and len(payload) > 0:
                        parts = payload[0]
                        if isinstance(parts, list):
                            translated = "".join(
                                part[0] for part in parts if isinstance(part, list) and len(part) > 0 and part[0]
                            )
                            if translated:
                                return translated.strip()
        except Exception:
            # Fallback to local dictionary or clean string on any network timeout or error
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

    async def translate_data(
        self,
        data: Union[Dict[str, Any], List[Any], Any],
        target_lang: str = "en",
        source_lang: str = "vi",
        target_keys: Optional[List[str]] = None
    ) -> Any:
        """
        Recursively translates text fields in dict/list payloads.
        Only translates text values belonging to target_keys.
        Does not mutate the original data structure.
        """
        target_lang = target_lang.lower().strip()
        source_lang = source_lang.lower().strip()

        if target_lang == source_lang or data is None:
            return data

        keys_to_translate = set(target_keys) if target_keys else self._default_target_keys

        if isinstance(data, dict):
            new_dict = {}
            for k, v in data.items():
                if k in keys_to_translate and isinstance(v, str):
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
                elif isinstance(item, str) and target_keys is None:
                    new_list.append(await self.translate_text(item, target_lang, source_lang))
                else:
                    new_list.append(item)
            return new_list

        return data

# Singleton Instance
translation_service = HybridTranslationService()
