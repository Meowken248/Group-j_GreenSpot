"""
Voice Assistant Schemas Module:
Gói chứa các Pydantic DTO cho tính năng Trợ lý Giọng nói.
"""

from app.schemas.voice_assistant.voice import (
    VoiceSampleCommandResponse,
    VoiceProcessRequest,
    VoiceProcessResponse,
    VoiceHistoryItemResponse,
)

__all__ = [
    "VoiceSampleCommandResponse",
    "VoiceProcessRequest",
    "VoiceProcessResponse",
    "VoiceHistoryItemResponse",
]
