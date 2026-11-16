from io import BytesIO
import warnings
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError


def validate_image_bytes(content: bytes, allowed_formats=("JPEG", "PNG", "WEBP")) -> str:
    """Decode/verify bytes: MIME and a renamed extension alone are insufficient."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                image_format = image.format
                if image_format not in allowed_formats:
                    raise ValueError("unsupported image")
                image.verify()
        return {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[image_format]
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError,
            Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(400, "Tệp không phải ảnh hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.")
