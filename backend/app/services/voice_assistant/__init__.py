"""
Voice Assistant Service Module:
Gói chuyên biệt xử lý trợ lý giọng nói rảnh tay (Hands-free Voice AI).
Bao gồm:
- VoiceNluService: Bộ động cơ NLU, chuẩn hóa tiếng Việt, khớp ý định đa tầng.
- voice_service: Singleton instance của VoiceNluService.
- LOCATION_COORDINATES: Bảng tọa độ địa lý các quận/huyện TP.HCM phục vụ tra cứu thời tiết & AQI thực tế.
"""

from app.services.voice_assistant.voice_service import (
    VoiceNluService,
    voice_service,
    LOCATION_COORDINATES,
)

__all__ = [
    "VoiceNluService",
    "voice_service",
    "LOCATION_COORDINATES",
]
