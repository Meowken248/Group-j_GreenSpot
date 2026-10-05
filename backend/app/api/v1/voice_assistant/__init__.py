"""
Voice Assistant API Router Module:
Gói chứa FastAPI Router cho tính năng Trợ lý Giọng nói.
"""

from app.api.v1.voice_assistant.router import router as voice_router

__all__ = ["voice_router"]
