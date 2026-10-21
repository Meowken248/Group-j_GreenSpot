"""
Seed dữ liệu mẫu cho Chức năng 24:
Trợ lý AI Hỏi đáp Môi trường & Nền tảng (AI Environmental & Platform Chatbot)
- Khởi tạo hội thoại mẫu về Phân loại pin cũ & chất thải nguy hại
- Khởi tạo hội thoại mẫu về Tra cứu mức phạt theo Nghị định 45/2022/NĐ-CP
- Khởi tạo hội thoại mẫu về Hướng dẫn sử dụng nền tảng GreenSpot
"""

import sys
from pathlib import Path
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.chatbot import (
    ChatbotConversation,
    ChatbotMessage,
    ChatbotSenderType,
)
from app.models.rbac import User


async def seed_chatbot_data():
    print("=" * 60)
    print("🤖 [GreenSpot Seeder] Bắt đầu khởi tạo dữ liệu mẫu cho Chức năng 24 (AI Chatbot)...")
    async with AsyncSessionLocal() as session:
        # 1. Tìm người dùng thử nghiệm chính (Citizen hoặc Admin)
        u_res = await session.execute(
            select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.asc()).limit(5)
        )
        users = u_res.scalars().all()
        if not users:
            print("⚠️ Chưa có người dùng trong CSDL để liên kết hội thoại Chatbot.")
            return

        test_user = None
        for u in users:
            if "citizen" in u.email.lower() or "admin" in u.email.lower():
                test_user = u
                break
        if not test_user:
            test_user = users[0]

        print(f"👤 Sử dụng tài khoản thử nghiệm: {test_user.email} (ID: {test_user.user_id})")

        # 2. Kiểm tra nếu đã có hội thoại của user thì bỏ qua tránh trùng lặp
        c_check = await session.execute(
            select(func.count()).select_from(ChatbotConversation).where(ChatbotConversation.user_id == test_user.user_id)
        )
        existing_count = c_check.scalar() or 0
        if existing_count > 0:
            print(f"✅ Đã có {existing_count} cuộc trò chuyện Chatbot trong hệ thống. Bỏ qua khởi tạo.")
            return

        now = datetime.now(timezone.utc)

        # 3. Hội thoại mẫu 1: Phân loại pin cũ
        conv1 = ChatbotConversation(
            conversation_id=uuid.uuid4(),
            user_id=test_user.user_id,
            title="Pin cũ bỏ vào đâu?",
            message_count=2,
            last_message_at=now - timedelta(hours=3),
            version=1,
            created_at=now - timedelta(hours=3, minutes=10),
            updated_at=now - timedelta(hours=3),
        )
        session.add(conv1)

        msg1_user = ChatbotMessage(
            message_id=uuid.uuid4(),
            conversation_id=conv1.conversation_id,
            sender_type=ChatbotSenderType.USER.value,
            content="Pin cũ và rác điện tử thì nên phân loại và bỏ ở đâu vậy bạn?",
            is_out_of_scope=False,
            is_stopped=False,
            created_at=now - timedelta(hours=3, minutes=10),
        )
        msg1_ai = ChatbotMessage(
            message_id=uuid.uuid4(),
            conversation_id=conv1.conversation_id,
            sender_type=ChatbotSenderType.AI.value,
            content=(
                "Chào bạn! Pin cũ và ắc quy thuộc nhóm **Chất thải nguy hại sinh hoạt**, tuyệt đối "
                "không được vứt chung với rác sinh hoạt thông thường hoặc đem đốt vì chứa chì, thủy ngân và cadimi gây nhiễm độc nguồn nước ngầm.\n\n"
                "**Hướng dẫn xử lý đúng chuẩn:**\n"
                "1. Dán băng keo vào hai đầu cực của pin để chống đoản mạch.\n"
                "2. Thu gom vào hộp/lọ kín riêng biệt.\n"
                "3. Mang đến các **Trạm Tái chế & Điểm thu hồi pin cũ** tại UBND Phường hoặc siêu thị gần bạn nhất.\n"
                "4. Khi đem rác pin đến trạm, bạn có thể **quét mã QR** để nhận thêm **+20 Điểm Xanh** vào ví!\n\n"
                "*Câu trả lời của AI mang tính tham khảo, không thay thế văn bản pháp luật chính thức.*"
            ),
            is_out_of_scope=False,
            is_stopped=False,
            created_at=now - timedelta(hours=3),
        )
        session.add_all([msg1_user, msg1_ai])

        # 4. Hội thoại mẫu 2: Mức phạt xả rác bừa bãi
        conv2 = ChatbotConversation(
            conversation_id=uuid.uuid4(),
            user_id=test_user.user_id,
            title="Mức phạt vứt rác vỉa hè",
            message_count=2,
            last_message_at=now - timedelta(days=1),
            version=1,
            created_at=now - timedelta(days=1, minutes=5),
            updated_at=now - timedelta(days=1),
        )
        session.add(conv2)

        msg2_user = ChatbotMessage(
            message_id=uuid.uuid4(),
            conversation_id=conv2.conversation_id,
            sender_type=ChatbotSenderType.USER.value,
            content="Hành vi vứt rác sinh hoạt bừa bãi trên vỉa hè bị phạt bao nhiêu tiền theo quy định?",
            is_out_of_scope=False,
            is_stopped=False,
            created_at=now - timedelta(days=1, minutes=5),
        )
        msg2_ai = ChatbotMessage(
            message_id=uuid.uuid4(),
            conversation_id=conv2.conversation_id,
            sender_type=ChatbotSenderType.AI.value,
            content=(
                "Chào bạn! Căn cứ theo **Khoản 2 Điều 25 Nghị định 45/2022/NĐ-CP** quy định về xử phạt vi phạm hành chính trong lĩnh vực bảo vệ môi trường:\n\n"
                "- **Mức phạt tiền:** Từ **1.000.000 đồng đến 2.000.000 đồng** đối với hành vi vứt, thải rác thải sinh hoạt bừa bãi tại vỉa hè, lòng đường, công viên hoặc hệ thống thoát nước đô thị.\n"
                "- **Biện pháp khắc phục hậu quả:** Buộc khôi phục lại tình trạng môi trường ban đầu và thu dọn toàn bộ lượng rác đã vứt trái phép.\n"
                "- **Đối với tổ chức vi phạm:** Mức phạt tiền bằng **2 lần** mức phạt áp dụng cho cá nhân.\n\n"
                "Nếu phát hiện hành vi này, bạn hãy dùng chức năng **Báo cáo sự cố (STT 18)** trên GreenSpot để gửi hình ảnh và định vị GPS cho lực lượng chức năng xử lý nhé!\n\n"
                "*Câu trả lời của AI mang tính tham khảo, không thay thế văn bản pháp luật chính thức.*"
            ),
            is_out_of_scope=False,
            is_stopped=False,
            created_at=now - timedelta(days=1),
        )
        session.add_all([msg2_user, msg2_ai])

        await session.commit()
        print("🎉 [GreenSpot Seeder] Khởi tạo thành công 2 cuộc trò chuyện mẫu với 4 tin nhắn cho AI Chatbot!")


if __name__ == "__main__":
    asyncio.run(seed_chatbot_data())

