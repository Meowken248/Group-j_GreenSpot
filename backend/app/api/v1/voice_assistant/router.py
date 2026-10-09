"""
API Router: Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant API)
Cung cấp các endpoints phục vụ:
- Màn 1: Lấy danh sách câu lệnh mẫu gợi ý
- Màn 2 & 3: Tiếp nhận nhận dạng giọng nói, phân tích Intent và trả về phản hồi
- Lịch sử tương tác giọng nói
"""

from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.voice_assistant import voice_repository
from app.database import get_db
from app.schemas.voice_assistant import (
    VoiceHistoryItemResponse,
    VoiceProcessRequest,
    VoiceProcessResponse,
    VoiceSampleCommandResponse,
)
from app.services.voice_assistant import voice_service

router = APIRouter(prefix="/voice", tags=["Voice Assistant"])


# Danh sách câu lệnh mẫu dự phòng phòng trường hợp database chưa chạy seed
DEFAULT_FALLBACK_COMMANDS = [
    {
        "command_id": "aaaaaaaa-0001-0001-0001-000000000001",
        "category": "INCIDENT",
        "command_text": "Báo cáo bãi rác gần đây",
        "intent_code": "REPORT_INCIDENT",
        "action_type": "NAVIGATION",
        "action_target": "/report-incident",
        "default_response": "Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn.",
        "display_order": 1,
    },
    {
        "command_id": "aaaaaaaa-0001-0001-0001-000000000002",
        "category": "FLOOD",
        "command_text": "Đường nào an toàn không bị ngập?",
        "intent_code": "CHECK_SAFE_ROUTE",
        "action_type": "NAVIGATION",
        "action_target": "map_flood",
        "default_response": "Đang hiển thị bản đồ các tuyến đường an toàn không bị ngập nước.",
        "display_order": 2,
    },
    {
        "command_id": "aaaaaaaa-0001-0001-0001-000000000003",
        "category": "REWARD",
        "command_text": "Xem số dư ví điểm",
        "intent_code": "CHECK_REWARD_WALLET",
        "action_type": "LOOKUP",
        "action_target": "/wallet",
        "default_response": "Số dư ví điểm xanh của bạn hiện có 350 điểm GreenPoints.",
        "display_order": 3,
    },
    {
        "command_id": "aaaaaaaa-0001-0001-0001-000000000004",
        "category": "AIR_QUALITY",
        "command_text": "Mở bản đồ chất lượng không khí",
        "intent_code": "OPEN_AIR_QUALITY_MAP",
        "action_type": "NAVIGATION",
        "action_target": "dashboard_aqi",
        "default_response": "Đang mở bản đồ quan trắc chất lượng không khí và chỉ số AQI.",
        "display_order": 4,
    },
]


@router.get(
    "/suggestions",
    response_model=List[VoiceSampleCommandResponse],
    summary="Lấy danh sách các câu lệnh mẫu gợi ý cho Màn 1",
)
async def get_voice_suggestions(
    category: Optional[str] = Query(None, description="Lọc theo nhóm lệnh: INCIDENT, FLOOD, AIR_QUALITY, REWARD"),
    limit: int = Query(10, ge=1, le=50, description="Số lượng gợi ý tối đa"),
    db: AsyncSession = Depends(get_db),
):
    """
    Trả về danh sách câu lệnh mẫu phục vụ Màn 1 của Trợ lý giọng nói.
    Nếu DB chưa có dữ liệu, tự động trả về danh mục chuẩn hóa để UI không bị gián đoạn.
    """
    try:
        commands = await voice_repository.get_active_sample_commands(db, limit=limit, category=category)
        if commands:
            return commands
    except Exception:
        pass

    # Fallback dữ liệu nếu chưa có bản ghi trong DB
    filtered = DEFAULT_FALLBACK_COMMANDS
    if category:
        filtered = [c for c in filtered if c["category"] == category.upper()]
    return [VoiceSampleCommandResponse(**c) for c in filtered[:limit]]


@router.post(
    "/process",
    response_model=VoiceProcessResponse,
    status_code=status.HTTP_200_OK,
    summary="Xử lý câu lệnh giọng nói thời gian thực và phân loại Intent",
)
async def process_voice_command(
    request: VoiceProcessRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Tiếp nhận văn bản nhận dạng từ Màn 2 hoặc câu lệnh nhấp trực tiếp từ Màn 1.
    Thực hiện chuẩn hóa câu lệnh, phân tích ý định, sinh câu trả lời TTS và điều hướng.
    """
    return await voice_service.process_voice_command(db, request)


@router.get(
    "/history",
    response_model=List[VoiceHistoryItemResponse],
    summary="Truy xuất lịch sử tương tác giọng nói gần nhất",
)
async def get_voice_history(
    limit: int = Query(20, ge=1, le=100, description="Số lượng bản ghi tối đa"),
    user_id: Optional[uuid.UUID] = Query(None, description="Lọc theo UUID người dùng"),
    db: AsyncSession = Depends(get_db),
):
    """Truy xuất danh sách nhật ký tương tác để kiểm tra và audit"""
    try:
        logs = await voice_repository.get_recent_logs(db, limit=limit, user_id=user_id)
        return logs
    except Exception:
        return []
