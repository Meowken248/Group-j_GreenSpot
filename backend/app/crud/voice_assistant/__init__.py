"""
Voice Assistant CRUD Repository Module:
Gói chứa Repository truy xuất CSDL cho tính năng Trợ lý Giọng nói.
"""

from app.crud.voice_assistant.voice_repository import (
    VoiceAssistantRepository,
    voice_repository,
)

__all__ = [
    "VoiceAssistantRepository",
    "voice_repository",
]
