"""
Voice Assistant Interfaces Module:
Gói chứa Abstract Base Classes cho tính năng Trợ lý Giọng nói.
"""

from app.interface.voice_assistant.voice_interface import (
    IVoiceAssistantRepository,
    IVoiceNluService,
)

__all__ = [
    "IVoiceAssistantRepository",
    "IVoiceNluService",
]
