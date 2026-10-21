"""
Dịch vụ Quản lý Hội thoại và Trợ lý AI (Chatbot Service)
Chức năng 24: AI chat box
Cung cấp nghiệp vụ kiểm soát rate limit 30 tin/giờ, quản lý cửa sổ ngữ cảnh 10 tin,
điều phối Động cơ kép (Kira AI + Fallback RAG), phân trang lịch sử và xóa cứng hội thoại.
"""

import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chatbot import ChatbotConversation, ChatbotMessage, ChatbotSenderType
from app.models.rbac import User
from app.schemas.chatbot import (
    ChatbotQueryRequest,
    ChatbotQueryResponse,
    ChatbotMessageResponse,
    ChatbotConversationResponse,
    ChatbotConversationDetailResponse,
    ChatbotConversationListResponse,
    ChatbotPromptSuggestion,
    ChatbotStopResponse,
)
from app.services.chatbot.knowledge_engine import EnvironmentalKnowledgeEngine
from app.services.chatbot.ai_client import call_kira_ai


class ChatbotService:
    """Tầng xử lý nghiệp vụ cho Trợ lý AI Chatbot"""

    def __init__(self):
        self.knowledge_engine = EnvironmentalKnowledgeEngine()

    async def check_rate_limit(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        """
        Kiểm tra giới hạn tần suất: Tối đa 30 tin nhắn / giờ cho mỗi người dùng (SRS trang 194).
        Nếu vượt quá, trả lỗi HTTP 429 kèm số phút còn lại.
        """
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

        stmt = (
            select(func.count())
            .select_from(ChatbotMessage)
            .join(ChatbotConversation, ChatbotMessage.conversation_id == ChatbotConversation.conversation_id)
            .where(
                and_(
                    ChatbotConversation.user_id == user_id,
                    ChatbotMessage.sender_type == ChatbotSenderType.USER.value,
                    ChatbotMessage.created_at >= one_hour_ago,
                )
            )
        )
        res = await session.execute(stmt)
        msg_count = res.scalar() or 0

        if msg_count >= 30:
            # Tìm tin nhắn sớm nhất trong vòng 1 giờ để tính thời gian chờ
            earliest_stmt = (
                select(ChatbotMessage.created_at)
                .join(ChatbotConversation, ChatbotMessage.conversation_id == ChatbotConversation.conversation_id)
                .where(
                    and_(
                        ChatbotConversation.user_id == user_id,
                        ChatbotMessage.sender_type == ChatbotSenderType.USER.value,
                        ChatbotMessage.created_at >= one_hour_ago,
                    )
                )
                .order_by(ChatbotMessage.created_at.asc())
                .limit(1)
            )
            e_res = await session.execute(earliest_stmt)
            earliest_dt = e_res.scalar()

            minutes_left = 60
            if earliest_dt:
                now = datetime.now(timezone.utc)
                diff = (earliest_dt + timedelta(hours=1)) - now
                minutes_left = max(1, int(diff.total_seconds() / 60))

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau {minutes_left} phút",
            )

    async def get_context_window(
        self, session: AsyncSession, conversation_id: uuid.UUID
    ) -> Tuple[List[dict], bool]:
        """
        Trích xuất ngữ cảnh tối đa 10 tin nhắn gần nhất trong cùng cuộc trò chuyện (SRS trang 195 - 196).
        Trả về: (context_messages_payload, has_context_warning: bool)
        """
        stmt = (
            select(ChatbotMessage)
            .where(ChatbotMessage.conversation_id == conversation_id)
            .order_by(ChatbotMessage.created_at.desc())
            .limit(15)
        )
        res = await session.execute(stmt)
        raw_msgs = list(reversed(res.scalars().all()))

        # Kiểm tra nếu hội thoại dài hơn 10 tin nhắn để hiển thị cảnh báo
        has_warning = len(raw_msgs) > 10

        # Chỉ giữ lại 10 tin nhắn mới nhất làm ngữ cảnh đưa vào LLM
        recent_10 = raw_msgs[-10:] if len(raw_msgs) > 10 else raw_msgs

        context_payload = []
        for m in recent_10:
            role = "user" if m.sender_type == ChatbotSenderType.USER.value else "assistant"
            context_payload.append({"role": role, "content": m.content})

        return context_payload, has_warning

    async def process_query(
        self, session: AsyncSession, user: User, request: ChatbotQueryRequest
    ) -> ChatbotQueryResponse:
        """
        Xử lý câu hỏi người dùng:
        1. Kiểm tra rate limit
        2. Tạo hoặc nạp hội thoại
        3. Lưu tin nhắn người dùng
        4. Kiểm tra guardrails & gọi Dual-Engine
        5. Lưu tin nhắn AI & trả về phản hồi
        """
        now = datetime.now(timezone.utc)
        user_id = user.user_id

        # 1. Kiểm tra rate limit 30 tin/giờ
        await self.check_rate_limit(session, user_id)

        # 2. Quản lý cuộc trò chuyện
        conv: Optional[ChatbotConversation] = None
        is_new_conversation = False

        if request.conversation_id:
            conv = await session.get(ChatbotConversation, request.conversation_id)
            if not conv or conv.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cuộc trò chuyện không còn tồn tại",
                )
        else:
            is_new_conversation = True
            # Tiêu đề lấy từ câu hỏi đầu tiên (cắt gọn tối đa 40 ký tự theo SRS trang 197)
            title = request.question.strip()[:40]
            if len(request.question.strip()) > 40:
                title = title.rstrip() + "…"

            conv = ChatbotConversation(
                conversation_id=uuid.uuid4(),
                user_id=user_id,
                title=title,
                message_count=0,
                last_message_at=now,
                version=1,
                created_at=now,
                updated_at=now,
            )
            session.add(conv)
            await session.flush()

        # 3. Lưu tin nhắn của Người dùng
        user_msg = ChatbotMessage(
            message_id=uuid.uuid4(),
            conversation_id=conv.conversation_id,
            sender_type=ChatbotSenderType.USER.value,
            content=request.question,
            is_out_of_scope=False,
            is_stopped=False,
            created_at=now,
        )
        session.add(user_msg)
        await session.flush()

        # 4. Trích xuất ngữ cảnh 10 tin gần nhất
        context_msgs, has_warning = await self.get_context_window(session, conv.conversation_id)

        # 5. Xử lý AI qua Dual-Engine
        # Bước A: Kiểm tra xem có ngoài phạm vi không
        is_in_scope, expert_answer = self.knowledge_engine.check_scope_and_answer(request.question)

        ai_content: str
        is_out_of_scope: bool = not is_in_scope

        if not is_in_scope:
            # Ngoài phạm vi -> trả về câu từ chối chuẩn mực
            ai_content = expert_answer
        else:
            # Trong phạm vi -> Thử gọi mô hình ngôn ngữ lớn Kira AI
            kira_response = await call_kira_ai(context_msgs, timeout=30.0)
            if kira_response and len(kira_response.strip()) > 0:
                ai_content = kira_response.strip()
                # Đảm bảo luôn có câu khuyến cáo pháp lý nếu nói về luật
                if "Câu trả lời của AI mang tính tham khảo" not in ai_content:
                    ai_content += self.knowledge_engine.LEGAL_DISCLAIMER
            else:
                # Nếu Kira AI hết quota (402) hoặc timeout -> Dùng Fallback Engine
                ai_content = expert_answer

        # 6. Lưu tin nhắn của AI
        ai_msg = ChatbotMessage(
            message_id=uuid.uuid4(),
            conversation_id=conv.conversation_id,
            sender_type=ChatbotSenderType.AI.value,
            content=ai_content,
            is_out_of_scope=is_out_of_scope,
            is_stopped=False,
            created_at=datetime.now(timezone.utc),
        )
        session.add(ai_msg)

        # 7. Cập nhật thống kê cuộc trò chuyện
        conv.message_count += 2
        conv.last_message_at = ai_msg.created_at
        conv.updated_at = ai_msg.created_at
        conv.version += 1

        await session.commit()
        await session.refresh(conv)
        await session.refresh(user_msg)
        await session.refresh(ai_msg)

        warning_text = None
        if has_warning:
            warning_text = "Hội thoại đã dài. Hãy bắt đầu cuộc trò chuyện mới để có câu trả lời chính xác hơn"

        return ChatbotQueryResponse(
            conversation_id=conv.conversation_id,
            conversation_title=conv.title,
            user_message=ChatbotMessageResponse.model_validate(user_msg),
            ai_message=ChatbotMessageResponse.model_validate(ai_msg),
            has_context_warning=has_warning,
            context_warning_message=warning_text,
        )

    async def stop_generating(
        self, session: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> ChatbotStopResponse:
        """Đánh dấu dừng sinh văn bản cho tin nhắn AI cuối cùng (SRS trang 195 - Màn 2/4)"""
        conv = await session.get(ChatbotConversation, conversation_id)
        if not conv or conv.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuộc trò chuyện không còn tồn tại",
            )

        stmt = (
            select(ChatbotMessage)
            .where(
                and_(
                    ChatbotMessage.conversation_id == conversation_id,
                    ChatbotMessage.sender_type == ChatbotSenderType.AI.value,
                )
            )
            .order_by(ChatbotMessage.created_at.desc())
            .limit(1)
        )
        res = await session.execute(stmt)
        last_ai_msg = res.scalar_one_or_none()

        if last_ai_msg:
            last_ai_msg.is_stopped = True
            await session.commit()

        return ChatbotStopResponse(success=True, message="Đã dừng trả lời")

    async def get_user_conversations(
        self, session: AsyncSession, user_id: uuid.UUID, page: int = 1, size: int = 10
    ) -> Tuple[List[ChatbotConversation], int]:
        """
        Lấy danh sách các cuộc trò chuyện của người dùng (Màn 3/4):
        - Sắp xếp mới nhất lên trước
        - Phân trang 10 cuộc trò chuyện / trang
        """
        if page < 1:
            page = 1
        if size < 1:
            size = 10

        count_stmt = (
            select(func.count())
            .select_from(ChatbotConversation)
            .where(ChatbotConversation.user_id == user_id)
        )
        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        offset = (page - 1) * size
        stmt = (
            select(ChatbotConversation)
            .where(ChatbotConversation.user_id == user_id)
            .order_by(ChatbotConversation.updated_at.desc())
            .offset(offset)
            .limit(size)
        )
        res = await session.execute(stmt)
        items = res.scalars().all()

        return list(items), total

    async def get_conversation_detail(
        self, session: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> ChatbotConversationDetailResponse:
        """Lấy chi tiết một cuộc trò chuyện kèm toàn bộ danh sách tin nhắn để mở lại (Màn 3/4 -> 1/4)"""
        stmt = (
            select(ChatbotConversation)
            .options(selectinload(ChatbotConversation.messages))
            .where(
                and_(
                    ChatbotConversation.conversation_id == conversation_id,
                    ChatbotConversation.user_id == user_id,
                )
            )
        )
        res = await session.execute(stmt)
        conv = res.scalar_one_or_none()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuộc trò chuyện không còn tồn tại",
            )

        messages_dto = [
            ChatbotMessageResponse.model_validate(m)
            for m in conv.messages
        ]

        return ChatbotConversationDetailResponse(
            conversation_id=conv.conversation_id,
            title=conv.title,
            message_count=conv.message_count,
            last_message_at=conv.last_message_at,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            version=conv.version,
            messages=messages_dto,
        )

    async def delete_conversation(
        self, session: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        """
        Xóa cứng (hard delete) cuộc trò chuyện và cascade toàn bộ tin nhắn (SRS trang 198 - Màn 4/4).
        """
        conv = await session.get(ChatbotConversation, conversation_id)
        if not conv or conv.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuộc trò chuyện không còn tồn tại",
            )

        await session.delete(conv)
        await session.commit()
        return True

    def get_suggested_prompts(self) -> List[dict]:
        """Cung cấp các thẻ câu hỏi mẫu cố định cho Màn 1/4 (SRS trang 193)"""
        return [
            {
                "id": "prompt-pin",
                "text": "Pin cũ và bình ắc quy thì bỏ vào thùng rác nào?",
                "category": "waste_classification",
            },
            {
                "id": "prompt-penalty",
                "text": "Vứt rác sinh hoạt bừa bãi trên vỉa hè bị phạt bao nhiêu tiền?",
                "category": "penalty_lookup",
            },
            {
                "id": "prompt-recycling",
                "text": "Tìm trạm tái chế và điểm tiếp nhận rác nguy hại tại TP.HCM",
                "category": "recycling_facilities",
            },
            {
                "id": "prompt-points",
                "text": "Làm sao để tích luỹ Điểm Xanh và thăng hạng Công dân Xanh?",
                "category": "green_rewards",
            },
            {
                "id": "prompt-incident",
                "text": "Hướng dẫn gửi báo cáo điểm rác ô nhiễm kèm tọa độ GPS",
                "category": "platform_guide",
            },
        ]
