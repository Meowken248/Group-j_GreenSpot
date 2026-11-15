"""
Router API cho Chức năng 24: AI chat box (Trợ lý AI Môi trường & Nền tảng GreenSpot)
Tài liệu căn cứ: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 193 - 199, Bảng 6 trang 26)
Hỗ trợ đầy đủ các nghiệp vụ:
1. POST /api/v1/ai/chatbot/query: Gửi câu hỏi và nhận câu trả lời AI (Dual-Engine)
2. POST /api/v1/ai/chatbot/stop: Dừng sinh văn bản (Màn 2/4)
3. GET  /api/v1/ai/chatbot/conversations: Lấy lịch sử hội thoại (phân trang 10/trang - Màn 3/4)
4. GET  /api/v1/ai/chatbot/conversations/{id}: Lấy chi tiết tin nhắn để mở lại (Màn 3/4 -> 1/4)
5. DELETE /api/v1/ai/chatbot/conversations/{id}: Xóa cứng hội thoại (Màn 4/4)
6. GET  /api/v1/ai/chatbot/suggested-prompts: Lấy danh sách câu hỏi mẫu (Màn 1/4)
"""

import math
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.rbac import get_current_active_user as get_current_user
from app.models.rbac import User
from app.schemas.chatbot import (
    ChatbotQueryRequest,
    ChatbotQueryResponse,
    ChatbotConversationResponse,
    ChatbotConversationDetailResponse,
    ChatbotConversationListResponse,
    ChatbotPromptSuggestion,
    ChatbotStopRequest,
    ChatbotStopResponse,
)
from app.services.chatbot.chatbot_service import ChatbotService

router = APIRouter(prefix="/ai/chatbot", tags=["AI Chatbot - Feature 24"])
chatbot_service = ChatbotService()


@router.get(
    "/suggested-prompts",
    response_model=List[ChatbotPromptSuggestion],
    summary="Lấy danh sách các thẻ câu hỏi mẫu gợi ý (Màn 1/4)",
)
async def get_suggested_prompts():
    """Trả về danh sách các câu hỏi mẫu môi trường cố định theo đặc tả SRS trang 193"""
    return chatbot_service.get_suggested_prompts()


@router.post(
    "/query",
    response_model=ChatbotQueryResponse,
    summary="Gửi câu hỏi cho Trợ lý AI (Màn 1/4 & 2/4)",
)
async def send_chat_query(
    request: ChatbotQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tiếp nhận câu hỏi của công dân:
    - Bắt buộc đăng nhập
    - Kiểm tra rate limit 30 tin/giờ
    - Lấy ngữ cảnh 10 tin nhắn gần nhất
    - Lọc guardrails ngoài phạm vi
    - Xử lý qua Dual-Engine (Kira AI hoặc Fallback RAG Engine)
    - Lưu lịch sử và cập nhật thống kê hội thoại
    """
    return await chatbot_service.process_query(db, current_user, request)


@router.post(
    "/stop",
    response_model=ChatbotStopResponse,
    summary="Dừng trả lời AI khi đang sinh nội dung (Màn 2/4)",
)
async def stop_generating_answer(
    request: ChatbotStopRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bấm nút 'Dừng trả lời' để ngắt tiến trình và lưu lại phần văn bản đã sinh"""
    return await chatbot_service.stop_generating(db, request.conversation_id, current_user.user_id)


@router.get(
    "/conversations",
    response_model=ChatbotConversationListResponse,
    summary="Lấy danh sách lịch sử các cuộc trò chuyện (Màn 3/4)",
)
async def list_conversations(
    page: int = Query(1, ge=1, description="Số thứ tự trang"),
    size: int = Query(10, ge=1, le=50, description="Số lượng mục mỗi trang (mặc định 10)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách các cuộc trò chuyện đã lưu của người dùng, phân trang 10 mục/trang"""
    items, total = await chatbot_service.get_user_conversations(db, current_user.user_id, page=page, size=size)
    total_pages = math.ceil(total / size) if total > 0 else 1

    return ChatbotConversationListResponse(
        items=[ChatbotConversationResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        size=size,
        total_pages=total_pages,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ChatbotConversationDetailResponse,
    summary="Lấy chi tiết tin nhắn của cuộc trò chuyện để mở lại (Màn 3/4 -> 1/4)",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nạp lại toàn bộ tin nhắn của một cuộc hội thoại lên giao diện chat"""
    return await chatbot_service.get_conversation_detail(db, conversation_id, current_user.user_id)


@router.delete(
    "/conversations/{conversation_id}",
    summary="Xóa cứng cuộc trò chuyện và toàn bộ tin nhắn khỏi tài khoản (Màn 4/4)",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa vĩnh viễn cuộc trò chuyện khỏi tài khoản theo đặc tả SRS trang 198:
    'Hệ thống xoá cứng nội dung cuộc trò chuyện khỏi tài khoản người dùng và không thể khôi phục.'
    """
    await chatbot_service.delete_conversation(db, conversation_id, current_user.user_id)
    return {"success": True, "message": "Đã xoá cuộc trò chuyện"}
