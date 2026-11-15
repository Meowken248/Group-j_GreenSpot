"""
Cross-platform Vietnamese Unicode TTF font resolver and registrar for ReportLab PDFs.
Supports Linux Docker (DejaVu / Liberation / Noto), Windows (Arial / Segoe UI / Tahoma),
and custom environment overrides without crashing on missing OS-specific font paths.
"""

import os
from typing import Optional, Tuple

_FONT_CANDIDATES = [
    # Linux Debian/Ubuntu standard packages (fonts-dejavu-core, fonts-liberation, fonts-noto-core)
    (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "GreenSpotUnicode",
    ),
    (
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "GreenSpotUnicode",
    ),
    (
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "GreenSpotUnicode",
    ),
    (
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        "GreenSpotUnicode",
    ),
    # Windows system fonts
    (
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "GreenSpotUnicode",
    ),
    (
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "GreenSpotUnicode",
    ),
    (
        "C:/Windows/Fonts/tahoma.ttf",
        "C:/Windows/Fonts/tahomabd.ttf",
        "GreenSpotUnicode",
    ),
]


def resolve_unicode_font_paths() -> Optional[Tuple[str, str, str]]:
    """Find the first available (regular_path, bold_path, family_name) TTF pair."""
    env_regular = os.getenv("PDF_FONT_REGULAR")
    env_bold = os.getenv("PDF_FONT_BOLD")
    if env_regular and os.path.exists(env_regular):
        bold = env_bold if (env_bold and os.path.exists(env_bold)) else env_regular
        return env_regular, bold, "GreenSpotUnicode"

    for reg_path, bold_path, family_name in _FONT_CANDIDATES:
        if os.path.exists(reg_path):
            resolved_bold = bold_path if os.path.exists(bold_path) else reg_path
            return reg_path, resolved_bold, family_name

    return None


def register_vietnamese_pdf_fonts() -> Tuple[str, str]:
    """
    Register Unicode TTF regular & bold fonts with ReportLab.
    Returns (regular_font_name, bold_font_name).
    """
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError:
        return "Helvetica", "Helvetica-Bold"

    resolved = resolve_unicode_font_paths()
    if not resolved:
        return "Helvetica", "Helvetica-Bold"

    reg_path, bold_path, family_name = resolved
    reg_name = family_name
    bold_name = f"{family_name}-Bold"

    try:
        registered = set(pdfmetrics.getRegisteredFontNames())
        if reg_name not in registered:
            pdfmetrics.registerFont(TTFont(reg_name, reg_path))
        if bold_name not in registered:
            pdfmetrics.registerFont(TTFont(bold_name, bold_path))
        pdfmetrics.registerFontFamily(
            family_name,
            normal=reg_name,
            bold=bold_name,
            italic=reg_name,
            boldItalic=bold_name,
        )
        return reg_name, bold_name
    except Exception:
        return "Helvetica", "Helvetica-Bold"

