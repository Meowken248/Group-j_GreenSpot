from abc import ABC, abstractmethod
from typing import Any, List, Optional, Dict, Union

class ITranslationService(ABC):
    """
    Abstract Interface for Translation Service (DIP Compliance).
    Supports high-speed domain dictionary translations, dynamic text translations,
    and automatic recursive data structure translation.
    """

    @abstractmethod
    async def translate_text(
        self,
        text: str,
        target_lang: str = "en",
        source_lang: str = "vi"
    ) -> str:
        """Translate a single text string."""
        pass

    @abstractmethod
    async def translate_batch(
        self,
        texts: List[str],
        target_lang: str = "en",
        source_lang: str = "vi"
    ) -> List[str]:
        """Translate a batch of text strings efficiently."""
        pass

    @abstractmethod
    async def translate_data(
        self,
        data: Union[Dict[str, Any], List[Any], Any],
        target_lang: str = "en",
        source_lang: str = "vi",
        target_keys: Optional[List[str]] = None
    ) -> Any:
        """
        Recursively translates text fields in dict/list payloads.
        Only translates text values belonging to target_keys (e.g., 'title', 'description', 'address', 'name', 'status').
        Preserves IDs, numbers, geometries, timestamps, and non-target fields.
        """
        pass

    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        """Return list of supported ISO language codes (e.g. ['vi', 'en'])."""
        pass

