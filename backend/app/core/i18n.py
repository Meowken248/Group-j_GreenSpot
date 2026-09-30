import json
from pathlib import Path
from typing import Any, Dict, List
import i18n

# Đường dẫn tuyệt đối tới thư mục locales
LOCALES_DIR = Path(__file__).resolve().parent.parent / "locales"

# Bộ nhớ đệm cache các gói bản dịch đã load
_translations_cache: Dict[str, Dict[str, Any]] = {}


def setup_i18n() -> None:
    """Khởi tạo và cấu hình thư viện python-i18n."""
    LOCALES_DIR.mkdir(parents=True, exist_ok=True)
    i18n.load_path.clear()
    i18n.load_path.append(str(LOCALES_DIR))
    i18n.set("filename_format", "{locale}.{format}")
    i18n.set("file_format", "json")
    i18n.set("skip_locale_root_data", True)
    i18n.set("locale", "vi")
    i18n.set("fallback", "en")
    i18n.set("encoding", "utf-8")


def _flatten_dict(d: Dict[str, Any], parent_key: str = "", sep: str = ".") -> Dict[str, str]:
    """Làm phẳng dictionary lồng nhau thành dạng key phẳng: 'app.nav.map' -> 'Bản đồ WebGIS'"""
    items: List[tuple] = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(_flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, str(v)))
    return dict(items)


def get_locale_bundle(locale: str = "vi", flat: bool = True) -> Dict[str, Any]:
    """
    Nạp và trả về toàn bộ cây dịch thuật từ thư viện python-i18n cho ngôn ngữ yêu cầu.
    Hỗ trợ trả về dạng phẳng (flat key-value) để Frontend dễ dàng mapping: t('app.title')
    """
    normalized_locale = "vi" if locale.lower().startswith("vi") else "en"
    
    file_path = LOCALES_DIR / f"{normalized_locale}.json"
    if not file_path.exists():
        file_path = LOCALES_DIR / "en.json"

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if flat:
            return _flatten_dict(data)
        return data
    except Exception as e:
        return {"error": f"Failed to load translations for {normalized_locale}: {str(e)}"}


def t(key: str, locale: str = "vi", **kwargs) -> str:
    """
    Dịch một key đơn lẻ sử dụng hàm core i18n.t() của thư viện python-i18n.
    Ví dụ: t("app.title", locale="en") -> "GreenSpot WebGIS & Environmental Monitoring"
    """
    normalized_locale = "vi" if locale.lower().startswith("vi") else "en"
    return i18n.t(key, locale=normalized_locale, **kwargs)


def translate_keys(keys: List[str], locale: str = "vi") -> Dict[str, str]:
    """Dịch đồng loạt một danh sách các key bằng python-i18n."""
    normalized_locale = "vi" if locale.lower().startswith("vi") else "en"
    return {k: i18n.t(k, locale=normalized_locale) for k in keys}
