"""
Voice Assistant Models Module:
Gói chứa các models CSDL cho tính năng Trợ lý Giọng nói.
"""

from app.models.voice_assistant.voice import (
    VoiceActionType,
    VoiceCategory,
    VoiceSampleCommand,
    VoiceInteractionLog,
)

__all__ = [
    "VoiceActionType",
    "VoiceCategory",
    "VoiceSampleCommand",
    "VoiceInteractionLog",
]
