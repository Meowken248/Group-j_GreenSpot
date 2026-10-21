"""
Test Suite for Feature STT 24: AI chat box (Trợ lý AI Môi trường & Nền tảng GreenSpot)
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 193 - 199)
Tuân thủ TDD (Test-Driven Development) và Quy chuẩn Dự án (PROJECT_RULES.md).

Danh sách ca kiểm thử:
1. TC-01: Validation câu hỏi: Không để trống, giới hạn tối đa 500 ký tự (Màn 1/4).
2. TC-02: Rate Limiting: Giới hạn tối đa 30 tin nhắn / giờ cho mỗi tài khoản (Màn 1/4).
3. TC-03: Trả lời trong phạm vi (In-domain): Hướng dẫn phân loại rác & trích dẫn văn bản pháp lý (Màn 1/4 & 2/4).
4. TC-04: Ràng buộc ngoài phạm vi (Guardrails Out-of-domain): Từ chối câu hỏi không liên quan đúng câu văn đặc tả (Màn 1/4).
5. TC-05: Quản lý cửa sổ ngữ cảnh: Nhớ tối đa 10 tin nhắn gần nhất và cảnh báo khi hội thoại dài (Màn 2/4).
6. TC-06: Động cơ kép chịu lỗi (Dual-Engine Resiliency): Tự động chuyển Fallback RAG khi LLM hết hạn mức (402) hoặc timeout.
7. TC-07: Quản lý danh sách hội thoại: Phân trang 10 mục/trang, sắp xếp theo thời gian cập nhật mới nhất (Màn 3/4).
8. TC-08: Bảo mật dữ liệu người dùng: Người dùng chỉ xem được hội thoại của chính mình (Màn 3/4).
9. TC-09: Xóa cứng hội thoại (Hard delete): Xóa vĩnh viễn cuộc trò chuyện và cascade toàn bộ tin nhắn (Màn 4/4).
10. TC-10: Danh sách câu hỏi mẫu cố định (Suggested Prompts) theo đúng SRS Màn 1/4.
"""

import unittest
import uuid
from datetime import datetime, timezone, timedelta
from pydantic import ValidationError
from fastapi import HTTPException

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User, Role
from app.models.chatbot import ChatbotConversation, ChatbotMessage, ChatbotSenderType
from app.schemas.chatbot import (
    ChatbotQueryRequest,
    ChatbotQueryResponse,
    ChatbotConversationResponse,
    ChatbotMessageResponse,
)
from app.services.chatbot.knowledge_engine import EnvironmentalKnowledgeEngine
from app.services.chatbot.chatbot_service import ChatbotService


class TestChatbotAIFeature24(unittest.IsolatedAsyncioTestCase):
    """Bộ kiểm thử đơn vị và tích hợp cho Chức năng 24 (AI Chat Box)"""

    async def asyncSetUp(self):
        await engine.dispose()
        self.session = AsyncSessionLocal()
        self.knowledge_engine = EnvironmentalKnowledgeEngine()
        self.service = ChatbotService()

        # Tạo hoặc lấy tài khoản test
        test_email = f"test_chatbot_{uuid.uuid4().hex[:8]}@greenspot.vn"
        user = User(
            user_id=uuid.uuid4(),
            email=test_email,
            password_hash="$2b$12$dummyhashforunittestonly12345678901234567890",
            full_name="Nguyễn Văn Xanh",
            role_id=1,
            status="active",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        self.test_user = user

    async def asyncTearDown(self):
        # Dọn dẹp dữ liệu test
        try:
            if hasattr(self, "test_user") and self.test_user:
                await self.session.delete(self.test_user)
                await self.session.commit()
        except Exception:
            await self.session.rollback()
        finally:
            await self.session.close()

    def test_tc01_validation_question_length(self):
        """TC-01: Kiểm tra validation câu hỏi: không rỗng, tối đa 500 ký tự"""
        # Câu hỏi rỗng
        with self.assertRaises(ValidationError):
            ChatbotQueryRequest(question="")

        # Câu hỏi chỉ có khoảng trắng
        with self.assertRaises(ValidationError):
            ChatbotQueryRequest(question="   ")

        # Câu hỏi hợp lệ 500 ký tự
        valid_q = "A" * 500
        req = ChatbotQueryRequest(question=valid_q)
        self.assertEqual(len(req.question), 500)

        # Câu hỏi vượt quá 500 ký tự
        with self.assertRaises(ValidationError):
            ChatbotQueryRequest(question="A" * 501)

    def test_tc04_guardrails_out_of_domain_detection(self):
        """TC-04: Phát hiện câu hỏi ngoài phạm vi và sinh câu từ chối chuẩn mực theo đặc tả"""
        out_of_domain_queries = [
            "Bạn có thể viết một bài thơ tình lãng mạn không?",
            "Giải giúp tôi phương trình vi phân bậc hai này",
            "Dự đoán giá vàng và chứng khoán ngày mai",
            "Viết code React Native để đăng nhập Facebook",
        ]
        standard_refusal = (
            "Tôi chỉ hỗ trợ các vấn đề về môi trường và hệ thống Xanh. "
            "Bạn thử hỏi về phân loại rác nhé"
        )

        for q in out_of_domain_queries:
            is_in_scope, refusal_text = self.knowledge_engine.check_scope_and_answer(q)
            self.assertFalse(is_in_scope, f"Câu hỏi '{q}' phải bị phân loại ngoài phạm vi")
            self.assertIn(standard_refusal, refusal_text)

    def test_tc03_in_domain_waste_classification(self):
        """TC-03: Trả lời chuẩn xác các câu hỏi phân loại rác môi trường"""
        in_domain_queries = [
            "Pin cũ và bình ắc quy thì bỏ vào thùng rác nào?",
            "Vỏ hộp sữa giấy và chai nhựa PET thuộc loại rác gì?",
            "Lá cây và thức ăn thừa có phải rác hữu cơ không?",
            "Vứt rác trên vỉa hè bị phạt bao nhiêu tiền?",
        ]
        for q in in_domain_queries:
            is_in_scope, answer = self.knowledge_engine.check_scope_and_answer(q)
            self.assertTrue(is_in_scope, f"Câu hỏi '{q}' phải được xác định trong phạm vi")
            self.assertTrue(len(answer) > 50, "Câu trả lời phải chi tiết và đầy đủ hướng dẫn")
            self.assertIn("Câu trả lời của AI mang tính tham khảo", answer)

    async def test_tc02_rate_limiting_30_per_hour(self):
        """TC-02: Kiểm tra giới hạn tần suất 30 tin nhắn mỗi giờ cho mỗi người dùng"""
        user_id = self.test_user.user_id

        # Giả lập 30 tin nhắn đã gửi trong 30 phút qua
        now = datetime.now(timezone.utc)
        conv = ChatbotConversation(
            conversation_id=uuid.uuid4(),
            user_id=user_id,
            title="Phiên test rate limit",
            message_count=30,
            last_message_at=now,
            created_at=now,
            updated_at=now,
        )
        self.session.add(conv)
        await self.session.flush()

        for i in range(30):
            msg = ChatbotMessage(
                message_id=uuid.uuid4(),
                conversation_id=conv.conversation_id,
                sender_type=ChatbotSenderType.USER.value,
                content=f"Câu hỏi số {i+1}",
                created_at=now - timedelta(minutes=i),
            )
            self.session.add(msg)
        await self.session.commit()

        # Kiểm tra qua Service: tin thứ 31 phải bị chặn 429
        with self.assertRaises(HTTPException) as ctx:
            await self.service.check_rate_limit(self.session, user_id)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Bạn đã gửi quá nhiều tin nhắn", ctx.exception.detail)

    async def test_tc05_context_window_10_messages(self):
        """TC-05: Cửa sổ ngữ cảnh chỉ giữ tối đa 10 tin nhắn gần nhất và gắn cờ cảnh báo"""
        user_id = self.test_user.user_id
        now = datetime.now(timezone.utc)
        conv = ChatbotConversation(
            conversation_id=uuid.uuid4(),
            user_id=user_id,
            title="Phiên test context",
            message_count=14,
            last_message_at=now,
            created_at=now,
            updated_at=now,
        )
        self.session.add(conv)
        await self.session.flush()

        # Tạo 14 tin nhắn
        for i in range(14):
            sender = ChatbotSenderType.USER.value if i % 2 == 0 else ChatbotSenderType.AI.value
            msg = ChatbotMessage(
                message_id=uuid.uuid4(),
                conversation_id=conv.conversation_id,
                sender_type=sender,
                content=f"Tin nhắn hội thoại thứ {i+1}",
                created_at=now - timedelta(minutes=20 - i),
            )
            self.session.add(msg)
        await self.session.commit()

        # Lấy ngữ cảnh
        context_msgs, has_warning = await self.service.get_context_window(self.session, conv.conversation_id)
        self.assertEqual(len(context_msgs), 10, "Chỉ được trích xuất tối đa 10 tin nhắn gần nhất")
        self.assertTrue(has_warning, "Phải bật cờ cảnh báo khi hội thoại vượt quá 10 tin nhắn")

    async def test_tc07_and_tc08_conversation_list_and_isolation(self):
        """TC-07 & TC-08: Danh sách hội thoại phân trang 10/trang và cô lập theo người dùng"""
        user_id = self.test_user.user_id
        now = datetime.now(timezone.utc)

        # Tạo 12 hội thoại cho test_user
        for i in range(12):
            conv = ChatbotConversation(
                conversation_id=uuid.uuid4(),
                user_id=user_id,
                title=f"Hội thoại #{i+1}",
                message_count=2,
                last_message_at=now - timedelta(minutes=i),
                created_at=now - timedelta(minutes=i),
                updated_at=now - timedelta(minutes=i),
            )
            self.session.add(conv)

        # Tạo 1 hội thoại của người dùng khác
        other_user = User(
            user_id=uuid.uuid4(),
            email=f"other_{uuid.uuid4().hex[:8]}@greenspot.vn",
            password_hash="dummyhash",
            full_name="Người Dùng Khác",
            role_id=1,
            status="active",
        )
        self.session.add(other_user)
        await self.session.flush()

        other_conv = ChatbotConversation(
            conversation_id=uuid.uuid4(),
            user_id=other_user.user_id,
            title="Hội thoại người khác",
            message_count=1,
            last_message_at=now,
            created_at=now,
            updated_at=now,
        )
        self.session.add(other_conv)
        await self.session.commit()

        # Kiểm tra trang 1 (page=1, size=10)
        page1, total1 = await self.service.get_user_conversations(self.session, user_id, page=1, size=10)
        self.assertEqual(total1, 12, "Tổng số hội thoại của test_user phải là 12")
        self.assertEqual(len(page1), 10, "Trang 1 phải có đúng 10 mục")

        # Kiểm tra trang 2 (page=2, size=10)
        page2, _ = await self.service.get_user_conversations(self.session, user_id, page=2, size=10)
        self.assertEqual(len(page2), 2, "Trang 2 phải có đúng 2 mục còn lại")

        # Xác minh không thấy hội thoại của người khác
        all_ids = [c.conversation_id for c in page1 + page2]
        self.assertNotIn(other_conv.conversation_id, all_ids)

        # Cleanup other user
        await self.session.delete(other_user)
        await self.session.commit()

    async def test_tc09_hard_delete_conversation(self):
        """TC-09: Xóa cứng cuộc trò chuyện và cascade xóa sạch tin nhắn khỏi tài khoản (Màn 4/4)"""
        user_id = self.test_user.user_id
        now = datetime.now(timezone.utc)
        conv = ChatbotConversation(
            conversation_id=uuid.uuid4(),
            user_id=user_id,
            title="Hội thoại sắp xóa",
            message_count=3,
            last_message_at=now,
            created_at=now,
            updated_at=now,
        )
        self.session.add(conv)
        await self.session.flush()

        msg = ChatbotMessage(
            message_id=uuid.uuid4(),
            conversation_id=conv.conversation_id,
            sender_type=ChatbotSenderType.USER.value,
            content="Tin nhắn bên trong",
            created_at=now,
        )
        self.session.add(msg)
        await self.session.commit()

        # Xóa cuộc trò chuyện
        deleted = await self.service.delete_conversation(self.session, conv.conversation_id, user_id)
        self.assertTrue(deleted)

        # Kiểm tra lại: Không còn trong CSDL
        check_conv = await self.session.get(ChatbotConversation, conv.conversation_id)
        self.assertIsNone(check_conv, "Cuộc trò chuyện phải bị xóa cứng khỏi CSDL")

        check_msg = await self.session.get(ChatbotMessage, msg.message_id)
        self.assertIsNone(check_msg, "Tin nhắn bên trong phải bị cascade xóa theo cuộc trò chuyện")

    def test_tc10_suggested_prompts(self):
        """TC-10: Cung cấp danh sách các thẻ câu hỏi mẫu cố định cho Màn 1/4"""
        prompts = self.service.get_suggested_prompts()
        self.assertIsInstance(prompts, list)
        self.assertTrue(len(prompts) >= 4)
        sample_texts = [p["text"] for p in prompts]
        self.assertTrue(any("pin" in t.lower() for t in sample_texts))
        self.assertTrue(any("phạt" in t.lower() for t in sample_texts))
        self.assertTrue(any("tái chế" in t.lower() for t in sample_texts))
        self.assertTrue(any("điểm xanh" in t.lower() for t in sample_texts))


if __name__ == "__main__":
    unittest.main()
