"""
Seed dữ liệu mẫu cho Chức năng 15:
Nhắn tin riêng 1-1, Chat nhóm và Chat quận thời gian thực (EcoReport Real-time Chat)
- Khởi tạo 22 phòng chat quận TP.HCM
- Khởi tạo hội thoại 1-1 mẫu giữa các tài khoản kiểm thử
- Khởi tạo nhóm chat mẫu "Đội Tình Nguyện Xanh Q1"
"""

import sys
from pathlib import Path
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func, and_
from sqlalchemy.orm import aliased
from app.database import AsyncSessionLocal
from app.models.chat import (
    Conversation,
    ConversationMember,
    ConversationType,
    MemberRole,
    Message,
)
from app.models.friends import Friendship
from app.models.rbac import User
from app.services.chat_service import TPHCM_DISTRICTS


async def seed_chat_data():
    print("=" * 60)
    print("🚀 [GreenSpot Seeder] Bắt đầu khởi tạo dữ liệu mẫu cho Chức năng 15 (Chat)...")
    async with AsyncSessionLocal() as session:
        # 1. Lấy người dùng chính
        u_res = await session.execute(
            select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.asc()).limit(10)
        )
        users = u_res.scalars().all()
        if not users:
            print("❌ Không tìm thấy user nào để tạo hội thoại.")
            return

        user1 = users[0]  # Thường là citizen@ecoreport.gov.vn
        user2 = users[1] if len(users) > 1 else None
        user3 = users[2] if len(users) > 2 else None

        print(f"👤 User 1: {user1.full_name} ({user1.email})")
        if user2:
            print(f"👤 User 2: {user2.full_name} ({user2.email})")
        if user3:
            print(f"👤 User 3: {user3.full_name} ({user3.email})")

        # Cập nhật quận cho các user mẫu nếu chưa có
        if not user1.district:
            user1.district = "Quận 1"
        if user2 and not user2.district:
            user2.district = "Quận 1"
        if user3 and not user3.district:
            user3.district = "Bình Thạnh"
        await session.commit()

        # 2. Đảm bảo quan hệ bạn bè giữa user1 và user2, user1 và user3 (để thỏa mãn SRS chat 1-1 và tạo nhóm)
        if user2:
            pair12 = (user1.user_id, user2.user_id) if user1.user_id < user2.user_id else (user2.user_id, user1.user_id)
            fs_12 = await session.execute(
                select(Friendship).where(
                    Friendship.user_id_1 == pair12[0],
                    Friendship.user_id_2 == pair12[1],
                )
            )
            if not fs_12.scalars().first():
                session.add(
                    Friendship(
                        friendship_id=uuid.uuid4(),
                        user_id_1=pair12[0],
                        user_id_2=pair12[1],
                        created_at=datetime.now(timezone.utc),
                    )
                )
                user1.friends_count = (user1.friends_count or 0) + 1
                user2.friends_count = (user2.friends_count or 0) + 1

        if user3:
            pair13 = (user1.user_id, user3.user_id) if user1.user_id < user3.user_id else (user3.user_id, user1.user_id)
            fs_13 = await session.execute(
                select(Friendship).where(
                    Friendship.user_id_1 == pair13[0],
                    Friendship.user_id_2 == pair13[1],
                )
            )
            if not fs_13.scalars().first():
                session.add(
                    Friendship(
                        friendship_id=uuid.uuid4(),
                        user_id_1=pair13[0],
                        user_id_2=pair13[1],
                        created_at=datetime.now(timezone.utc),
                    )
                )
                user1.friends_count = (user1.friends_count or 0) + 1
                user3.friends_count = (user3.friends_count or 0) + 1

        await session.commit()
        print("✅ Đã kiểm tra và đảm bảo quan hệ bạn bè giữa các user mẫu.")

        # 3. Khởi tạo 22 phòng chat quận TP.HCM
        print("🏘️ Đang kiểm tra 22 phòng chat quận TP.HCM...")
        created_districts = 0
        for dist in TPHCM_DISTRICTS:
            res = await session.execute(
                select(Conversation).where(
                    Conversation.type == ConversationType.DISTRICT.value,
                    Conversation.district_name == dist,
                )
            )
            conv = res.scalars().first()
            if not conv:
                conv = Conversation(
                    conversation_id=uuid.uuid4(),
                    type=ConversationType.DISTRICT.value,
                    title=f"Phòng chat {dist}",
                    district_name=dist,
                    created_by=None,
                    last_message_preview=f"Chào mừng bạn đến với cộng đồng môi trường {dist}!",
                    last_message_at=datetime.now(timezone.utc) - timedelta(minutes=5),
                    created_at=datetime.now(timezone.utc) - timedelta(days=1),
                )
                session.add(conv)
                await session.flush()
                created_districts += 1

                # Thêm tin nhắn chào mừng ban đầu
                sys_msg = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=conv.conversation_id,
                    sender_id=user1.user_id,
                    content=f"Chào mừng cư dân đến với kênh trao đổi thông tin môi trường {dist}!",
                    is_system_message=True,
                    created_at=conv.last_message_at,
                )
                session.add(sys_msg)
                conv.last_message_id = sys_msg.message_id

            # Gắn các user vào phòng quận tương ứng
            if user1.district == dist:
                m_res = await session.execute(
                    select(ConversationMember).where(
                        ConversationMember.conversation_id == conv.conversation_id,
                        ConversationMember.user_id == user1.user_id,
                    )
                )
                if not m_res.scalars().first():
                    session.add(
                        ConversationMember(
                            member_id=uuid.uuid4(),
                            conversation_id=conv.conversation_id,
                            user_id=user1.user_id,
                            role=MemberRole.MEMBER.value,
                            unread_count=0,
                        )
                    )

            if user2 and user2.district == dist:
                m_res = await session.execute(
                    select(ConversationMember).where(
                        ConversationMember.conversation_id == conv.conversation_id,
                        ConversationMember.user_id == user2.user_id,
                    )
                )
                if not m_res.scalars().first():
                    session.add(
                        ConversationMember(
                            member_id=uuid.uuid4(),
                            conversation_id=conv.conversation_id,
                            user_id=user2.user_id,
                            role=MemberRole.MEMBER.value,
                            unread_count=0,
                        )
                    )

        await session.commit()
        print(f"✅ Đã khởi tạo {created_districts} phòng chat quận mới (Tổng: {len(TPHCM_DISTRICTS)} phòng).")

        # 4. Khởi tạo hội thoại 1-1 mẫu (giữa user1 và user2)
        if user2:
            # Kiểm tra hội thoại 1-1 đã có chưa
            m1 = aliased(ConversationMember)
            m2 = aliased(ConversationMember)
            f_stmt = (
                select(Conversation)
                .join(m1, m1.conversation_id == Conversation.conversation_id)
                .join(m2, m2.conversation_id == Conversation.conversation_id)
                .where(
                    Conversation.type == ConversationType.DIRECT.value,
                    m1.user_id == user1.user_id,
                    m2.user_id == user2.user_id,
                )
            )
            f_res = await session.execute(f_stmt)
            direct_conv = f_res.scalars().first()

            if not direct_conv:
                direct_conv = Conversation(
                    conversation_id=uuid.uuid4(),
                    type=ConversationType.DIRECT.value,
                    created_by=user1.user_id,
                    created_at=datetime.now(timezone.utc) - timedelta(hours=2),
                )
                session.add(direct_conv)
                await session.flush()

                mem1 = ConversationMember(
                    member_id=uuid.uuid4(),
                    conversation_id=direct_conv.conversation_id,
                    user_id=user1.user_id,
                    role=MemberRole.MEMBER.value,
                    unread_count=0,
                )
                mem2 = ConversationMember(
                    member_id=uuid.uuid4(),
                    conversation_id=direct_conv.conversation_id,
                    user_id=user2.user_id,
                    role=MemberRole.MEMBER.value,
                    unread_count=1,
                )
                session.add_all([mem1, mem2])

                # Thêm một vài tin nhắn mẫu
                t1 = datetime.now(timezone.utc) - timedelta(minutes=45)
                t2 = datetime.now(timezone.utc) - timedelta(minutes=30)
                t3 = datetime.now(timezone.utc) - timedelta(minutes=15)

                msg1 = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=direct_conv.conversation_id,
                    sender_id=user1.user_id,
                    content="Chào bạn! Cuối tuần này nhóm mình có chiến dịch thu gom pin cũ ở công viên Tao Đàn, bạn có tham gia không?",
                    created_at=t1,
                )
                msg2 = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=direct_conv.conversation_id,
                    sender_id=user2.user_id,
                    content="Chào bạn! Nghe ý nghĩa quá, mấy giờ tập trung vậy bạn?",
                    created_at=t2,
                )
                msg3 = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=direct_conv.conversation_id,
                    sender_id=user1.user_id,
                    content="Tập trung lúc 7h30 sáng tại cổng đường Trương Định nhé bạn 🌱",
                    created_at=t3,
                )
                session.add_all([msg1, msg2, msg3])

                direct_conv.last_message_id = msg3.message_id
                direct_conv.last_message_at = t3
                direct_conv.last_message_preview = msg3.content

                await session.commit()
                print("✅ Đã khởi tạo hội thoại 1-1 mẫu kèm tin nhắn trao đổi.")
            else:
                print("ℹ️ Hội thoại 1-1 mẫu đã tồn tại.")

        # 5. Khởi tạo nhóm chat mẫu "Đội Tình Nguyện Xanh Q1" (user1 + user2 + user3)
        if user2 and user3:
            grp_res = await session.execute(
                select(Conversation).where(
                    Conversation.type == ConversationType.GROUP.value,
                    Conversation.title == "Đội Tình Nguyện Xanh Q1",
                )
            )
            group_conv = grp_res.scalars().first()

            if not group_conv:
                g_now = datetime.now(timezone.utc) - timedelta(hours=1)
                group_conv = Conversation(
                    conversation_id=uuid.uuid4(),
                    type=ConversationType.GROUP.value,
                    title="Đội Tình Nguyện Xanh Q1",
                    created_by=user1.user_id,
                    created_at=g_now,
                    last_message_at=g_now + timedelta(minutes=20),
                    last_message_preview="Đội mình đã chuẩn bị sẵn 50 đôi bao tay và túi tự hủy sinh học rồi nhé!",
                )
                session.add(group_conv)
                await session.flush()

                # user1 là ADMIN
                session.add(
                    ConversationMember(
                        member_id=uuid.uuid4(),
                        conversation_id=group_conv.conversation_id,
                        user_id=user1.user_id,
                        role=MemberRole.ADMIN.value,
                        unread_count=0,
                    )
                )
                # user2 và user3 là MEMBER
                session.add(
                    ConversationMember(
                        member_id=uuid.uuid4(),
                        conversation_id=group_conv.conversation_id,
                        user_id=user2.user_id,
                        role=MemberRole.MEMBER.value,
                        unread_count=0,
                    )
                )
                session.add(
                    ConversationMember(
                        member_id=uuid.uuid4(),
                        conversation_id=group_conv.conversation_id,
                        user_id=user3.user_id,
                        role=MemberRole.MEMBER.value,
                        unread_count=2,
                    )
                )

                # Tin nhắn hệ thống tạo nhóm
                g_msg0 = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=group_conv.conversation_id,
                    sender_id=user1.user_id,
                    content=f"{user1.full_name} đã tạo nhóm 'Đội Tình Nguyện Xanh Q1'",
                    is_system_message=True,
                    created_at=g_now,
                )
                g_msg1 = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=group_conv.conversation_id,
                    sender_id=user1.user_id,
                    content="Chào mừng mọi người đến với nhóm! Nhóm lập ra để phối hợp xử lý các sự cố môi trường và dọn rác khu vực Q1.",
                    created_at=g_now + timedelta(minutes=5),
                )
                g_msg2 = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=group_conv.conversation_id,
                    sender_id=user2.user_id,
                    content="Chào anh em! Mọi người đã chuẩn bị đủ đồ bảo hộ chưa?",
                    created_at=g_now + timedelta(minutes=10),
                )
                g_msg3 = Message(
                    message_id=uuid.uuid4(),
                    conversation_id=group_conv.conversation_id,
                    sender_id=user1.user_id,
                    content="Đội mình đã chuẩn bị sẵn 50 đôi bao tay và túi tự hủy sinh học rồi nhé!",
                    created_at=g_now + timedelta(minutes=20),
                )
                session.add_all([g_msg0, g_msg1, g_msg2, g_msg3])
                group_conv.last_message_id = g_msg3.message_id

                await session.commit()
                print("✅ Đã khởi tạo nhóm chat mẫu 'Đội Tình Nguyện Xanh Q1' kèm tin nhắn trao đổi.")
            else:
                print("ℹ️ Nhóm chat mẫu 'Đội Tình Nguyện Xanh Q1' đã tồn tại.")

    print("🎉 Hoàn tất gieo dữ liệu mẫu cho Chức năng 15 (Chat) thành công!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_chat_data())
