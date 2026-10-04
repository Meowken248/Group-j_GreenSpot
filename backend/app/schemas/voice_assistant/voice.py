"""
Pydantic Schemas: Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)
Định nghĩa Data Transfer Objects (DTO) chuẩn hóa theo chuẩn FastAPI & Pydantic V2.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VoiceSampleCommandResponse(BaseModel):
    """Schema trả về thông tin câu lệnh gợi ý cho Màn 1"""
    command_id: uuid.UUID
    category: str
    command_text: str
    intent_code: str
    action_type: str
    action_target: Optional[str] = None
    default_response: str
    display_order: int

    class Config:
        from_attributes = True


class VoiceProcessRequest(BaseModel):
    """Schema yêu cầu xử lý câu lệnh giọng nói từ Màn 2 hoặc click gợi ý Màn 1"""
    transcript: str = Field(..., min_length=1, max_length=500, description="Văn bản nhận dạng giọng nói hoặc câu lệnh click")
    session_source: str = Field(default="VOICE", description="'VOICE' hoặc 'SUGGESTION_CLICK'")
    user_id: Optional[uuid.UUID] = Field(default=None, description="UUID người dùng nếu đã đăng nhập")
    current_lat: Optional[float] = Field(default=None, description="Vĩ độ hiện tại của người dùng")
    current_lng: Optional[float] = Field(default=None, description="Kinh độ hiện tại của người dùng")


class VoiceProcessResponse(BaseModel):
    """
    Schema kết quả xử lý trả về cho Màn 3 (Lệnh của bạn & Phản hồi)
    Bao gồm câu đã chuẩn hóa, phản hồi TTS, thẻ hành động và gợi ý nếu cần.
    """
    log_id: uuid.UUID
    raw_transcript: str
    normalized_text: str
    detected_intent: Optional[str] = None
    confidence_score: float = 1.0
    action_type: str = "UNKNOWN"
    action_target: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None
    response_text: str
    is_success: bool = True
    sample_suggestions: Optional[List[str]] = None
    processing_time_ms: int = 0


class VoiceHistoryItemResponse(BaseModel):
    """Schema trả về lịch sử tương tác giọng nói"""
    log_id: uuid.UUID
    raw_transcript: str
    normalized_text: str
    detected_intent: Optional[str] = None
    action_type: Optional[str] = None
    response_text: str
    is_success: bool
    session_source: str
    processing_time_ms: int
    created_at: datetime

    class Config:
        from_attributes = True
