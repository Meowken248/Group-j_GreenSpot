"""
Dịch vụ nghiệp vụ (Business Logic Service) cho Chức năng 15:
Nhắn tin riêng 1-1, Chat nhóm và Chat quận thời gian thực (EcoReport Real-time Chat)
Tuân thủ nghiêm ngặt đặc tả SRS:
- Màn 1: Danh sách hội thoại (20 items/page, 3 tab: 1-1, Nhóm, Quận, chấm xanh online, unread badge, realtime update)
- Màn 2: Khung chat chi tiết (30 tin/lần, căn lề, trạng thái Đã gửi/Đã xem, đính kèm ảnh <=5MB, 1000 ký tự, chống spam quận 3s, chặn/hủy bạn, rời nhóm)
- Màn 3: Tạo nhóm chat (2-50 bạn bè, tên <= 50 ký tự, người tạo là Quản trị nhóm, tin hệ thống)
- Màn 4: Xóa hội thoại 1-1 (1 phía cleared_at), Rời nhóm (bảo vệ Quản trị nhóm duy nhất, tin hệ thống)
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
from fastapi import HTTPException, status
from sqlalchemy import (
    and_,
    asc,
    case,
    desc,
    func,
    or_,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.models.chat import (
    Conversation,
    ConversationMember,
    ConversationType,
    MemberRole,
    Message,
    UserBlock,
)
from app.models.friends import Friendship
from app.models.rbac import User
from app.schemas.chat import (
    ConversationItemResponse,
    ConversationListResponse,
    CreateGroupConversationRequest,
    LastMessageSummary,
    MessageItemResponse,
    MessageListResponse,
    MessageSenderSummary,
    OnlineMemberItemResponse,
    SendMessageRequest,
)
from app.websocket.chat_manager import chat_manager

TPHCM_DISTRICTS = [
    "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6",
    "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12",
    "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình", "Tân Phú",
    "Bình Tân", "Thành phố Thủ Đức", "Huyện Bình Chánh",
    "Huyện Hóc Môn", "Huyện Củ Chi", "Huyện Nhà Bè", "Huyện Cần Giờ"
]


class ChatService:
    def __init__(self):
        # Bộ đệm chống spam tin nhắn cho Chat quận: user_id -> timestamp giây
        self._district_rate_limits: Dict[uuid.UUID, float] = {}

    # =========================================================================
    # 1. HỖ TRỢ PHÒNG CHAT QUẬN (TAB QUẬN)
    # =========================================================================

    async def ensure_district_conversation(
        self, db: AsyncSession, user: User
    ) -> Conversation:
        """
        Đảm bảo phòng chat quận của người dùng tồn tại và người dùng đã là thành viên.
        Nếu user chưa có quận, mặc định gán vào 'Quận 1'.
        """
        district_name = (user.district or "").strip()
        if not district_name:
            district_name = "Quận 1"
            user.district = district_name
            await db.commit()

        # Tìm conversation quận
        stmt = select(Conversation).where(
            Conversation.type == ConversationType.DISTRICT.value,
            Conversation.district_name == district_name,
            Conversation.deleted_at.is_(None),
        )
        res = await db.execute(stmt)
        conv = res.scalars().first()

        if not conv:
            conv = Conversation(
                conversation_id=uuid.uuid4(),
                type=ConversationType.DISTRICT.value,
                title=f"Phòng chat {district_name}",
                district_name=district_name,
                created_by=None,
                last_message_preview=f"Chào mừng bạn đến với cộng đồng môi trường {district_name}!",
                last_message_at=datetime.now(timezone.utc),
            )
            db.add(conv)
            await db.flush()

        # Đảm bảo user là thành viên
        m_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conv.conversation_id,
            ConversationMember.user_id == user.user_id,
        )
        m_res = await db.execute(m_stmt)
        member = m_res.scalars().first()

        if not member:
            member = ConversationMember(
                member_id=uuid.uuid4(),
                conversation_id=conv.conversation_id,
                user_id=user.user_id,
                role=MemberRole.MEMBER.value,
                unread_count=0,
            )
            db.add(member)
            await db.commit()
            await db.refresh(conv)

        return conv

    # =========================================================================
    # 2. MÀN 1: DANH SÁCH HỘI THOẠI (GET /conversations)
    # =========================================================================

    async def get_user_conversations(
        self,
        db: AsyncSession,
        user: User,
        tab: str = "direct",
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> ConversationListResponse:
        """
        Lấy danh sách hội thoại theo tab ("direct", "group", "district"),
        phân trang 20 items/lần, hỗ trợ tìm kiếm realtime, sắp xếp tin mới nhất lên đầu.
        """
        clean_tab = tab.strip().lower()
        if clean_tab == "district":
            # Đảm bảo phòng chat quận của user luôn sẵn sàng
            await self.ensure_district_conversation(db, user)

        # Mapping tab sang ConversationType
        type_mapping = {
            "direct": ConversationType.DIRECT.value,
            "group": ConversationType.GROUP.value,
            "district": ConversationType.DISTRICT.value,
        }
        target_type = type_mapping.get(clean_tab, ConversationType.DIRECT.value)

        # Base query: Lấy các conversation mà user là thành viên và chưa rời nhóm
        stmt = (
            select(Conversation, ConversationMember)
            .join(
                ConversationMember,
                and_(
                    ConversationMember.conversation_id == Conversation.conversation_id,
                    ConversationMember.user_id == user.user_id,
                    ConversationMember.left_at.is_(None),
                ),
            )
            .options(
                selectinload(Conversation.members).selectinload(ConversationMember.user),
            )
            .where(
                Conversation.type == target_type,
                Conversation.deleted_at.is_(None),
            )
        )

        # Nếu là tab quận: chỉ hiển thị phòng chat của quận mà user thuộc về
        if target_type == ConversationType.DISTRICT.value:
            user_district = (user.district or "Quận 1").strip()
            stmt = stmt.where(Conversation.district_name == user_district)

        # Tìm kiếm theo tên
        clean_search = (search or "").strip()
        if clean_search:
            search_pattern = f"%{clean_search}%"
            if target_type in (ConversationType.GROUP.value, ConversationType.DISTRICT.value):
                stmt = stmt.where(Conversation.title.ilike(search_pattern))
            else:
                # Tab 1-1: Tìm theo tên của đối phương
                other_member_alias = aliased(ConversationMember)
                stmt = stmt.join(
                    other_member_alias,
                    and_(
                        other_member_alias.conversation_id == Conversation.conversation_id,
                        other_member_alias.user_id != user.user_id,
                    ),
                ).join(User, User.user_id == other_member_alias.user_id).where(
                    User.full_name.ilike(search_pattern)
                )

        # Sắp xếp theo tin mới nhất ở trên
        stmt = stmt.order_by(
            desc(func.coalesce(Conversation.last_message_at, Conversation.created_at))
        )

        # Đếm tổng số
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Phân trang
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

        result = await db.execute(stmt)
        rows = result.all()

        items: List[ConversationItemResponse] = []
        for conv, member in rows:
            # Xử lý thông tin hiển thị theo từng loại
            title = conv.title or ""
            avatar_url = conv.avatar_url
            other_user_id = None
            is_online = False
            active_members_count = len([m for m in conv.members if m.left_at is None])
            is_admin = (member.role == MemberRole.ADMIN.value)

            if conv.type == ConversationType.DIRECT.value:
                # Tìm đối phương trong hội thoại 1-1
                other_m = next((m for m in conv.members if m.user_id != user.user_id), None)
                if other_m and other_m.user:
                    title = other_m.user.full_name
                    avatar_url = other_m.user.avatar_url
                    other_user_id = other_m.user.user_id
                    is_online = chat_manager.is_user_online(other_m.user.user_id)
                else:
                    title = "Người dùng"

            elif conv.type == ConversationType.DISTRICT.value:
                title = conv.title or f"Phòng chat {conv.district_name}"

            # Xử lý tóm tắt tin cuối cùng
            last_message_summary: Optional[LastMessageSummary] = None
            # Nếu người dùng đã xóa lịch sử (cleared_at), và tin cuối có trước cleared_at -> ẩn tin cuối
            is_cleared = (
                member.cleared_at is not None
                and conv.last_message_at is not None
                and conv.last_message_at <= member.cleared_at
            )

            if not is_cleared and conv.last_message_id:
                # Lấy tin nhắn cuối từ db nếu cần hoặc xây dựng từ metadata
                last_msg_stmt = (
                    select(Message)
                    .options(selectinload(Message.sender))
                    .where(Message.message_id == conv.last_message_id)
                )
                l_res = await db.execute(last_msg_stmt)
                last_msg = l_res.scalars().first()
                if last_msg:
                    last_message_summary = LastMessageSummary(
                        message_id=last_msg.message_id,
                        sender_id=last_msg.sender_id,
                        sender_name=last_msg.sender.full_name if last_msg.sender else "Hệ thống",
                        content=last_msg.content,
                        media_url=last_msg.media_url,
                        created_at=last_msg.created_at,
                    )
            elif not is_cleared and conv.last_message_preview:
                last_message_summary = LastMessageSummary(
                    message_id=conv.conversation_id,
                    sender_id=user.user_id,
                    sender_name="Hệ thống",
                    content=conv.last_message_preview,
                    media_url=None,
                    created_at=conv.last_message_at or conv.created_at,
                )

            unread = 0 if is_cleared else member.unread_count

            items.append(
                ConversationItemResponse(
                    conversation_id=conv.conversation_id,
                    type=conv.type,
                    title=title,
                    avatar_url=avatar_url,
                    district_name=conv.district_name,
                    other_user_id=other_user_id,
                    is_online=is_online,
                    unread_count=unread,
                    last_message=last_message_summary,
                    members_count=active_members_count,
                    is_admin=is_admin,
                    created_at=conv.created_at,
                )
            )

        # Nếu là tab 1-1 và có từ khóa tìm kiếm: bổ sung các bạn bè khớp tìm kiếm mà chưa có cuộc trò chuyện trong kết quả
        if target_type == ConversationType.DIRECT.value and clean_search:
            existing_other_ids = {item.other_user_id for item in items if item.other_user_id}
            u_id = user.user_id
            friend_user_alias = aliased(User)
            friends_query = (
                select(friend_user_alias)
                .select_from(Friendship)
                .join(
                    friend_user_alias,
                    friend_user_alias.user_id == case(
                        (Friendship.user_id_1 == u_id, Friendship.user_id_2),
                        else_=Friendship.user_id_1,
                    ),
                )
                .where(
                    or_(Friendship.user_id_1 == u_id, Friendship.user_id_2 == u_id),
                    Friendship.deleted_at.is_(None),
                    friend_user_alias.deleted_at.is_(None),
                    friend_user_alias.full_name.ilike(search_pattern),
                )
            )
            f_res = await db.execute(friends_query)
            matching_friends = f_res.scalars().all()

            for friend in matching_friends:
                if friend.user_id not in existing_other_ids:
                    try:
                        friend_conv = await self.get_or_create_direct_conversation(
                            db, user, friend.user_id
                        )
                        items.append(friend_conv)
                        existing_other_ids.add(friend.user_id)
                        total += 1
                    except Exception:
                        pass

        has_more = (offset + limit) < total
        return ConversationListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            has_more=has_more,
        )

    # =========================================================================
    # 3. LẤY CHI TIẾT 1 HỘI THOẠI (GET /conversations/{id})
    # =========================================================================

    async def get_conversation_detail(
        self, db: AsyncSession, user: User, conversation_id: uuid.UUID
    ) -> ConversationItemResponse:
        """Lấy thông tin chi tiết của 1 cuộc trò chuyện kèm trạng thái của người gọi"""
        stmt = (
            select(Conversation, ConversationMember)
            .join(
                ConversationMember,
                and_(
                    ConversationMember.conversation_id == Conversation.conversation_id,
                    ConversationMember.user_id == user.user_id,
                ),
            )
            .options(
                selectinload(Conversation.members).selectinload(ConversationMember.user)
            )
            .where(
                Conversation.conversation_id == conversation_id,
                Conversation.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cuộc trò chuyện",
            )

        conv, member = row
        title = conv.title or ""
        avatar_url = conv.avatar_url
        other_user_id = None
        is_online = False
        active_members_count = len([m for m in conv.members if m.left_at is None])
        is_admin = (member.role == MemberRole.ADMIN.value)

        if conv.type == ConversationType.DIRECT.value:
            other_m = next((m for m in conv.members if m.user_id != user.user_id), None)
            if other_m and other_m.user:
                title = other_m.user.full_name
                avatar_url = other_m.user.avatar_url
                other_user_id = other_m.user.user_id
                is_online = chat_manager.is_user_online(other_m.user.user_id)
            else:
                title = "Người dùng"
        elif conv.type == ConversationType.DISTRICT.value:
            title = conv.title or f"Phòng chat {conv.district_name}"

        return ConversationItemResponse(
            conversation_id=conv.conversation_id,
            type=conv.type,
            title=title,
            avatar_url=avatar_url,
            district_name=conv.district_name,
            other_user_id=other_user_id,
            is_online=is_online,
            unread_count=member.unread_count,
            last_message=None,
            members_count=active_members_count,
            is_admin=is_admin,
            created_at=conv.created_at,
        )

    # =========================================================================
    # 4. MÀN 2: LẤY TIN NHẮN TRONG HỘI THOẠI (GET /conversations/{id}/messages)
    # =========================================================================

    async def get_conversation_messages(
        self,
        db: AsyncSession,
        user: User,
        conversation_id: uuid.UUID,
        before_message_id: Optional[uuid.UUID] = None,
        limit: int = 30,
    ) -> MessageListResponse:
        """
        Tải 30 tin nhắn gần nhất (hoặc cũ hơn before_message_id khi cuộn lên).
        Lọc bỏ tin trước cleared_at (1-1) và sau left_at (nếu đã rời nhóm).
        Hiển thị trạng thái "SENT" hoặc "SEEN" cho chat 1-1.
        """
        # Kiểm tra tư cách thành viên
        m_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.user_id,
        )
        m_res = await db.execute(m_stmt)
        my_membership = m_res.scalars().first()

        if not my_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải thành viên của cuộc trò chuyện này",
            )

        # Lấy thông tin cuộc trò chuyện
        conv = await db.get(Conversation, conversation_id)
        if not conv or conv.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cuộc trò chuyện",
            )

        # Lấy thông tin đối phương (cho chat 1-1) để tính trạng thái SEEN/SENT
        other_member: Optional[ConversationMember] = None
        if conv.type == ConversationType.DIRECT.value:
            other_stmt = select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id != user.user_id,
            )
            o_res = await db.execute(other_stmt)
            other_member = o_res.scalars().first()

        # Query messages
        msg_stmt = (
            select(Message)
            .options(
                selectinload(Message.sender).selectinload(User.role)
            )
            .where(
                Message.conversation_id == conversation_id,
                Message.deleted_at.is_(None),
            )
        )

        # Lọc theo cleared_at của user (Màn 4 - Xóa cuộc trò chuyện 1 phía)
        if my_membership.cleared_at is not None:
            msg_stmt = msg_stmt.where(Message.created_at >= my_membership.cleared_at)

        # Lọc theo left_at (nếu đã rời nhóm, chỉ đọc được lịch sử trước thời điểm rời)
        if my_membership.left_at is not None:
            msg_stmt = msg_stmt.where(Message.created_at <= my_membership.left_at)

        # Phân trang cuộn ngược theo before_message_id
        if before_message_id:
            ref_msg = await db.get(Message, before_message_id)
            if ref_msg:
                msg_stmt = msg_stmt.where(Message.created_at < ref_msg.created_at)

        # Đếm tổng số tin nhắn thỏa mãn điều kiện
        count_stmt = select(func.count()).select_from(msg_stmt.subquery())
        c_res = await db.execute(count_stmt)
        total = c_res.scalar() or 0

        # Lấy limit + 1 để biết has_more
        msg_stmt = msg_stmt.order_by(desc(Message.created_at)).limit(limit + 1)
        res = await db.execute(msg_stmt)
        rows = list(res.scalars().all())

        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]

        # Đảo ngược lại theo thứ tự thời gian tăng dần (cũ -> mới) để UI render từ trên xuống dưới
        rows.reverse()

        items: List[MessageItemResponse] = []
        for m in rows:
            # Xác định trạng thái "Đã gửi" hay "Đã xem" cho chat 1-1
            msg_status = "SENT"
            if conv.type == ConversationType.DIRECT.value and m.sender_id == user.user_id:
                if other_member and other_member.unread_count == 0:
                    msg_status = "SEEN"

            sender_role = None
            if m.sender and getattr(m.sender, "role", None):
                sender_role = getattr(m.sender.role, "role_name", None)

            sender_summary = MessageSenderSummary(
                user_id=m.sender_id,
                full_name=m.sender.full_name if m.sender else "Người dùng",
                avatar_url=m.sender.avatar_url if m.sender else None,
                role=sender_role,
            )

            items.append(
                MessageItemResponse(
                    message_id=m.message_id,
                    conversation_id=m.conversation_id,
                    sender=sender_summary,
                    content=m.content,
                    media_url=m.media_url,
                    is_system_message=m.is_system_message,
                    status=msg_status,
                    created_at=m.created_at,
                )
            )

        return MessageListResponse(
            conversation_id=conversation_id,
            items=items,
            total=total,
            has_more=has_more,
        )

    # =========================================================================
    # 5. MÀN 2: GỬI TIN NHẮN (POST /conversations/{id}/messages)
    # =========================================================================

    async def send_message(
        self,
        db: AsyncSession,
        user: User,
        conversation_id: uuid.UUID,
        payload: SendMessageRequest,
    ) -> MessageItemResponse:
        """
        Gửi tin nhắn vào cuộc trò chuyện:
        - Kiểm tra thành viên và quyền (đã rời nhóm -> 403 "Bạn không còn là thành viên của nhóm này")
        - Kiểm tra Chặn và Bạn bè đối với chat 1-1 -> 403 "Bạn không thể nhắn tin cho người này"
        - Chống spam chat quận (3 giây cooldown) -> 429 "Bạn gửi tin quá nhanh. Vui lòng thử lại sau ít giây"
        - Cập nhật last_message_* và tăng unread_count cho các thành viên khác
        - Phát broadcast thời gian thực qua WebSocket
        """
        # 1. Kiểm tra thành viên
        m_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.user_id,
        )
        m_res = await db.execute(m_stmt)
        my_membership = m_res.scalars().first()

        if not my_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải thành viên của cuộc trò chuyện này",
            )

        if my_membership.left_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không còn là thành viên của nhóm này",
            )

        # 2. Kiểm tra cuộc trò chuyện
        conv = await db.get(Conversation, conversation_id)
        if not conv or conv.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cuộc trò chuyện",
            )

        # 3. Kiểm tra điều kiện Chat 1-1 (Không bị chặn, vẫn còn là bạn bè)
        if conv.type == ConversationType.DIRECT.value:
            other_stmt = select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id != user.user_id,
            )
            o_res = await db.execute(other_stmt)
            other_member = o_res.scalars().first()
            if not other_member:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không tìm thấy người nhận trong cuộc trò chuyện",
                )

            target_id = other_member.user_id

            # Kiểm tra quan hệ bạn bè
            u1, u2 = (user.user_id, target_id) if user.user_id < target_id else (target_id, user.user_id)
            fs_stmt = select(Friendship).where(
                Friendship.user_id_1 == u1,
                Friendship.user_id_2 == u2,
                Friendship.deleted_at.is_(None),
            )
            fs_res = await db.execute(fs_stmt)
            if not fs_res.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không thể nhắn tin cho người này",
                )

            # Kiểm tra block (người kia chặn tôi HOẶC tôi chặn người kia)
            block_stmt = select(UserBlock).where(
                or_(
                    and_(UserBlock.blocker_id == target_id, UserBlock.blocked_id == user.user_id),
                    and_(UserBlock.blocker_id == user.user_id, UserBlock.blocked_id == target_id),
                )
            )
            block_res = await db.execute(block_stmt)
            if block_res.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không thể nhắn tin cho người này",
                )

        # 4. Kiểm tra chống spam chat quận (Rate limit 3.0 giây cooldown)
        if conv.type == ConversationType.DISTRICT.value:
            now_ts = time.time()
            last_ts = self._district_rate_limits.get(user.user_id, 0.0)
            if now_ts - last_ts < 3.0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Bạn gửi tin quá nhanh. Vui lòng thử lại sau ít giây",
                )
            self._district_rate_limits[user.user_id] = now_ts

        # 5. Tạo tin nhắn mới
        clean_content = payload.content.strip() if payload.content else None
        new_msg = Message(
            message_id=uuid.uuid4(),
            conversation_id=conversation_id,
            sender_id=user.user_id,
            content=clean_content,
            media_url=payload.media_url,
            is_system_message=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_msg)
        await db.flush()

        # 6. Cập nhật metadata cuộc trò chuyện
        preview = clean_content[:100] if clean_content else "[Hình ảnh]"
        conv.last_message_id = new_msg.message_id
        conv.last_message_at = new_msg.created_at
        conv.last_message_preview = preview

        # 7. Tăng unread_count cho các thành viên khác đang hoạt động trong hội thoại
        update_unread_stmt = (
            update(ConversationMember)
            .where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id != user.user_id,
                ConversationMember.left_at.is_(None),
            )
            .values(unread_count=ConversationMember.unread_count + 1)
        )
        await db.execute(update_unread_stmt)

        # Cập nhật lại last_read cho người gửi (đã đọc tin chính mình vừa gửi)
        my_membership.last_read_message_id = new_msg.message_id
        my_membership.unread_count = 0

        await db.commit()
        await db.refresh(new_msg)

        # 8. Chuẩn bị response
        sender_summary = MessageSenderSummary(
            user_id=user.user_id,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
        )
        response_item = MessageItemResponse(
            message_id=new_msg.message_id,
            conversation_id=conversation_id,
            sender=sender_summary,
            content=new_msg.content,
            media_url=new_msg.media_url,
            is_system_message=False,
            status="SENT",
            created_at=new_msg.created_at,
        )

        # 9. Phát Real-time Event qua WebSocket tới các thành viên khác
        # Lấy danh sách ID các thành viên để broadcast
        all_members_stmt = select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.left_at.is_(None),
        )
        mem_res = await db.execute(all_members_stmt)
        recipient_ids = [uid for uid in mem_res.scalars().all() if uid != user.user_id]

        # Broadcast NEW_MESSAGE
        await chat_manager.broadcast_to_users(
            recipient_ids,
            {
                "event": "NEW_MESSAGE",
                "conversation_id": str(conversation_id),
                "message": response_item.model_dump(mode="json"),
            },
        )

        # Broadcast CONVERSATION_UPDATE (để nhảy lên đầu danh sách Màn 1)
        await chat_manager.broadcast_to_users(
            recipient_ids,
            {
                "event": "CONVERSATION_UPDATE",
                "conversation_id": str(conversation_id),
                "last_message": {
                    "message_id": str(new_msg.message_id),
                    "sender_id": str(user.user_id),
                    "sender_name": user.full_name,
                    "content": new_msg.content,
                    "media_url": new_msg.media_url,
                    "created_at": new_msg.created_at.isoformat(),
                },
                "last_message_at": new_msg.created_at.isoformat(),
            },
        )

        return response_item

    # =========================================================================
    # 6. ĐÁNH DẤU ĐÃ ĐỌC (POST /conversations/{id}/read)
    # =========================================================================

    async def mark_conversation_as_read(
        self, db: AsyncSession, user: User, conversation_id: uuid.UUID
    ) -> dict:
        """Đánh dấu đã đọc toàn bộ tin nhắn trong hội thoại, xóa badge unread"""
        m_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.user_id,
        )
        res = await db.execute(m_stmt)
        member = res.scalars().first()

        if member:
            member.unread_count = 0
            conv = await db.get(Conversation, conversation_id)
            if conv and conv.last_message_id:
                member.last_read_message_id = conv.last_message_id
            await db.commit()

            # Thông báo tới các thành viên khác rằng user này đã đọc tin nhắn
            other_stmt = select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id != user.user_id,
                ConversationMember.left_at.is_(None),
            )
            o_res = await db.execute(other_stmt)
            other_ids = o_res.scalars().all()

            await chat_manager.broadcast_to_users(
                other_ids,
                {
                    "event": "MESSAGE_SEEN",
                    "conversation_id": str(conversation_id),
                    "user_id": str(user.user_id),
                    "last_read_message_id": str(member.last_read_message_id) if member.last_read_message_id else None,
                },
            )

        return {"success": True}

    # =========================================================================
    # 7. KHỞI TẠO HOẶC LẤY CHAT 1-1 (POST /conversations/direct)
    # =========================================================================

    async def get_or_create_direct_conversation(
        self, db: AsyncSession, current_user: User, target_user_id: uuid.UUID
    ) -> ConversationItemResponse:
        """Khởi tạo hoặc tìm cuộc trò chuyện 1-1 với một người bạn"""
        if current_user.user_id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo cuộc trò chuyện với chính mình",
            )

        target_user = await db.get(User, target_user_id)
        if not target_user or target_user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng đối phương",
            )

        # Kiểm tra block
        block_stmt = select(UserBlock).where(
            or_(
                and_(UserBlock.blocker_id == target_user_id, UserBlock.blocked_id == current_user.user_id),
                and_(UserBlock.blocker_id == current_user.user_id, UserBlock.blocked_id == target_user_id),
            )
        )
        b_res = await db.execute(block_stmt)
        if b_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không thể nhắn tin cho người này",
            )

        # Kiểm tra quan hệ bạn bè
        u1, u2 = (
            (current_user.user_id, target_user_id)
            if current_user.user_id < target_user_id
            else (target_user_id, current_user.user_id)
        )
        fs_stmt = select(Friendship).where(
            Friendship.user_id_1 == u1,
            Friendship.user_id_2 == u2,
            Friendship.deleted_at.is_(None),
        )
        fs_res = await db.execute(fs_stmt)
        if not fs_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không thể nhắn tin cho người này",
            )

        # Tìm hội thoại 1-1 đã có giữa 2 người
        m1 = aliased(ConversationMember)
        m2 = aliased(ConversationMember)
        find_stmt = (
            select(Conversation)
            .join(m1, m1.conversation_id == Conversation.conversation_id)
            .join(m2, m2.conversation_id == Conversation.conversation_id)
            .where(
                Conversation.type == ConversationType.DIRECT.value,
                m1.user_id == current_user.user_id,
                m2.user_id == target_user_id,
                Conversation.deleted_at.is_(None),
            )
        )
        res = await db.execute(find_stmt)
        conv = res.scalars().first()

        if not conv:
            # Tạo mới cuộc trò chuyện 1-1
            conv = Conversation(
                conversation_id=uuid.uuid4(),
                type=ConversationType.DIRECT.value,
                created_by=current_user.user_id,
                created_at=datetime.now(timezone.utc),
            )
            db.add(conv)
            await db.flush()

            # Thêm 2 thành viên
            db.add_all([
                ConversationMember(
                    member_id=uuid.uuid4(),
                    conversation_id=conv.conversation_id,
                    user_id=current_user.user_id,
                    role=MemberRole.MEMBER.value,
                    unread_count=0,
                ),
                ConversationMember(
                    member_id=uuid.uuid4(),
                    conversation_id=conv.conversation_id,
                    user_id=target_user_id,
                    role=MemberRole.MEMBER.value,
                    unread_count=0,
                ),
            ])
            await db.commit()
            await db.refresh(conv)

        return await self.get_conversation_detail(db, current_user, conv.conversation_id)

    # =========================================================================
    # 8. MÀN 3: TẠO CHAT NHÓM (POST /conversations/group)
    # =========================================================================

    async def create_group_conversation(
        self, db: AsyncSession, current_user: User, payload: CreateGroupConversationRequest
    ) -> ConversationItemResponse:
        """
        Tạo nhóm chat mới:
        - Tên nhóm tối đa 50 ký tự (đã validate trong schema)
        - Chọn 2 đến 50 thành viên bạn bè (đã validate trong schema)
        - Người tạo tự động trở thành 'Quản trị nhóm' (ADMIN)
        - Sinh tin nhắn hệ thống thông báo tạo nhóm
        """
        # Xác minh tất cả thành viên được mời đều là bạn bè và không chặn
        all_member_ids = set(payload.member_user_ids)
        if current_user.user_id in all_member_ids:
            all_member_ids.remove(current_user.user_id)

        for target_id in all_member_ids:
            u1, u2 = (
                (current_user.user_id, target_id)
                if current_user.user_id < target_id
                else (target_id, current_user.user_id)
            )
            fs_stmt = select(Friendship).where(
                Friendship.user_id_1 == u1,
                Friendship.user_id_2 == u2,
                Friendship.deleted_at.is_(None),
            )
            fs_res = await db.execute(fs_stmt)
            if not fs_res.scalars().first():
                target_user = await db.get(User, target_id)
                name = target_user.full_name if target_user else str(target_id)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Người dùng {name} không còn trong danh sách bạn bè",
                )

        now = datetime.now(timezone.utc)
        system_preview = f"{current_user.full_name} đã tạo nhóm '{payload.title}'"

        # Tạo Conversation nhóm
        conv = Conversation(
            conversation_id=uuid.uuid4(),
            type=ConversationType.GROUP.value,
            title=payload.title,
            created_by=current_user.user_id,
            last_message_preview=system_preview,
            last_message_at=now,
            created_at=now,
        )
        db.add(conv)
        await db.flush()

        # Thêm người tạo làm ADMIN
        creator_member = ConversationMember(
            member_id=uuid.uuid4(),
            conversation_id=conv.conversation_id,
            user_id=current_user.user_id,
            role=MemberRole.ADMIN.value,
            unread_count=0,
        )
        db.add(creator_member)

        # Thêm các thành viên được mời làm MEMBER
        for uid in all_member_ids:
            member_obj = ConversationMember(
                member_id=uuid.uuid4(),
                conversation_id=conv.conversation_id,
                user_id=uid,
                role=MemberRole.MEMBER.value,
                unread_count=1,
            )
            db.add(member_obj)

        # Tạo tin nhắn hệ thống đầu tiên
        sys_msg = Message(
            message_id=uuid.uuid4(),
            conversation_id=conv.conversation_id,
            sender_id=current_user.user_id,
            content=system_preview,
            is_system_message=True,
            created_at=now,
        )
        db.add(sys_msg)
        conv.last_message_id = sys_msg.message_id

        await db.commit()
        await db.refresh(conv)

        # Broadcast tới tất cả thành viên được mời để cập nhật Màn 1 realtime
        await chat_manager.broadcast_to_users(
            list(all_member_ids),
            {
                "event": "GROUP_CREATED",
                "conversation_id": str(conv.conversation_id),
                "title": conv.title,
                "created_by": current_user.full_name,
            },
        )

        return await self.get_conversation_detail(db, current_user, conv.conversation_id)

    # =========================================================================
    # 9. MÀN 4: XOÁ CUỘC TRÒ CHUYỆN 1-1 (POST /conversations/{id}/clear)
    # =========================================================================

    async def clear_direct_conversation(
        self, db: AsyncSession, user: User, conversation_id: uuid.UUID
    ) -> dict:
        """
        Xóa cuộc trò chuyện 1-1:
        Chỉ xóa lịch sử phía người dùng (cleared_at = now). Đối phương vẫn giữ nguyên lịch sử!
        """
        conv = await db.get(Conversation, conversation_id)
        if not conv or conv.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cuộc trò chuyện",
            )

        if conv.type != ConversationType.DIRECT.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chỉ có thể xóa cuộc trò chuyện 1-1",
            )

        m_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.user_id,
        )
        res = await db.execute(m_stmt)
        member = res.scalars().first()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải thành viên của cuộc trò chuyện này",
            )

        member.cleared_at = datetime.now(timezone.utc)
        member.unread_count = 0
        await db.commit()

        return {
            "success": True,
            "message": "Đã xóa lịch sử cuộc trò chuyện phía bạn",
        }

    # =========================================================================
    # 10. MÀN 4: RỜI NHÓM CHAT (POST /conversations/{id}/leave)
    # =========================================================================

    async def leave_group_conversation(
        self, db: AsyncSession, user: User, conversation_id: uuid.UUID
    ) -> dict:
        """
        Rời nhóm chat:
        - Không nhận tin mới nữa (left_at = now)
        - Nếu là Quản trị nhóm duy nhất: Chặn không cho rời, yêu cầu chuyển quyền quản trị trước
        - Thêm tin nhắn hệ thống: '{Tên} đã rời nhóm'
        """
        conv = await db.get(Conversation, conversation_id)
        if not conv or conv.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy nhóm trò chuyện",
            )

        if conv.type != ConversationType.GROUP.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chức năng rời nhóm chỉ áp dụng cho nhóm trò chuyện",
            )

        m_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.user_id,
        )
        res = await db.execute(m_stmt)
        my_membership = res.scalars().first()

        if not my_membership or my_membership.left_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn không còn là thành viên của nhóm này",
            )

        # Lấy danh sách các thành viên còn lại đang hoạt động
        other_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id != user.user_id,
            ConversationMember.left_at.is_(None),
        )
        o_res = await db.execute(other_stmt)
        other_members = list(o_res.scalars().all())

        # Nếu user là ADMIN, kiểm tra xem có ADMIN nào khác không
        if my_membership.role == MemberRole.ADMIN.value and len(other_members) > 0:
            other_admins = [m for m in other_members if m.role == MemberRole.ADMIN.value]
            if not other_admins:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bạn là quản trị nhóm duy nhất. Hãy chuyển quyền quản trị cho thành viên khác trước khi rời",
                )

        now = datetime.now(timezone.utc)
        my_membership.left_at = now
        my_membership.unread_count = 0

        # Thêm tin nhắn hệ thống
        leave_preview = f"{user.full_name} đã rời nhóm"
        sys_msg = Message(
            message_id=uuid.uuid4(),
            conversation_id=conversation_id,
            sender_id=user.user_id,
            content=leave_preview,
            is_system_message=True,
            created_at=now,
        )
        db.add(sys_msg)

        conv.last_message_id = sys_msg.message_id
        conv.last_message_at = now
        conv.last_message_preview = leave_preview

        await db.commit()

        # Phát broadcast tới các thành viên còn lại
        remaining_ids = [m.user_id for m in other_members]
        await chat_manager.broadcast_to_users(
            remaining_ids,
            {
                "event": "USER_LEFT_GROUP",
                "conversation_id": str(conversation_id),
                "user_id": str(user.user_id),
                "full_name": user.full_name,
                "message": leave_preview,
            },
        )

        return {
            "success": True,
            "message": "Bạn đã rời nhóm chat thành công",
        }

    # =========================================================================
    # 11. CHUYỂN QUYỀN QUẢN TRỊ NHÓM (POST /conversations/{id}/transfer-admin)
    # =========================================================================

    async def transfer_group_admin(
        self,
        db: AsyncSession,
        user: User,
        conversation_id: uuid.UUID,
        new_admin_user_id: uuid.UUID,
    ) -> dict:
        """Chuyển quyền quản trị nhóm cho một thành viên khác đang hoạt động"""
        conv = await db.get(Conversation, conversation_id)
        if not conv or conv.deleted_at is not None or conv.type != ConversationType.GROUP.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy nhóm trò chuyện",
            )

        # Kiểm tra người gọi có phải ADMIN không
        my_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user.user_id,
            ConversationMember.left_at.is_(None),
        )
        my_res = await db.execute(my_stmt)
        my_membership = my_res.scalars().first()

        if not my_membership or my_membership.role != MemberRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Quản trị nhóm mới có quyền chuyển giao quyền quản trị",
            )

        # Kiểm tra target user
        target_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == new_admin_user_id,
            ConversationMember.left_at.is_(None),
        )
        t_res = await db.execute(target_stmt)
        target_member = t_res.scalars().first()

        if not target_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thành viên nhận quyền quản trị không tồn tại hoặc đã rời nhóm",
            )

        target_member.role = MemberRole.ADMIN.value
        await db.commit()

        return {
            "success": True,
            "message": "Đã chuyển quyền quản trị nhóm thành công",
        }

    # =========================================================================
    # 12. DANH SÁCH THÀNH VIÊN ONLINE TRONG PHÒNG CHAT QUẬN
    # =========================================================================

    async def get_online_members_in_conversation(
        self, db: AsyncSession, user: User, conversation_id: uuid.UUID
    ) -> List[OnlineMemberItemResponse]:
        """
        Lấy danh sách các thành viên đang online trong phòng chat quận
        (hoặc nhóm chat) phục vụ hiển thị cột bên phải theo SRS.
        """
        stmt = (
            select(ConversationMember)
            .options(selectinload(ConversationMember.user))
            .where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.left_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        members = res.scalars().all()

        online_list: List[OnlineMemberItemResponse] = []
        for m in members:
            if m.user and chat_manager.is_user_online(m.user.user_id):
                online_list.append(
                    OnlineMemberItemResponse(
                        user_id=m.user.user_id,
                        full_name=m.user.full_name,
                        avatar_url=m.user.avatar_url,
                        role=m.role,
                        is_online=True,
                    )
                )

        return online_list

    async def get_all_members_in_conversation(
        self, db: AsyncSession, user: User, conversation_id: uuid.UUID
    ) -> List[OnlineMemberItemResponse]:
        """
        Lấy danh sách tất cả thành viên đang hoạt động trong cuộc trò chuyện
        (phục vụ hiển thị và chuyển giao quyền Quản trị nhóm khi rời nhóm).
        """
        stmt = (
            select(ConversationMember)
            .options(selectinload(ConversationMember.user))
            .where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.left_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        members = res.scalars().all()

        member_list: List[OnlineMemberItemResponse] = []
        for m in members:
            if m.user:
                member_list.append(
                    OnlineMemberItemResponse(
                        user_id=m.user.user_id,
                        full_name=m.user.full_name,
                        avatar_url=m.user.avatar_url,
                        role=m.role,
                        is_online=chat_manager.is_user_online(m.user.user_id),
                    )
                )
        return member_list

    # =========================================================================
    # 13. CHẶN VÀ BỎ CHẶN NGƯỜI DÙNG (Phục vụ Màn 2: Bạn không thể nhắn tin...)
    # =========================================================================

    async def block_user(
        self, db: AsyncSession, current_user: User, target_user_id: uuid.UUID
    ) -> dict:
        """Chặn người dùng"""
        if current_user.user_id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể chặn chính mình",
            )

        stmt = select(UserBlock).where(
            UserBlock.blocker_id == current_user.user_id,
            UserBlock.blocked_id == target_user_id,
        )
        res = await db.execute(stmt)
        if not res.scalars().first():
            block_obj = UserBlock(
                block_id=uuid.uuid4(),
                blocker_id=current_user.user_id,
                blocked_id=target_user_id,
            )
            db.add(block_obj)
            await db.commit()

        return {"success": True, "message": "Đã chặn người dùng"}

    async def unblock_user(
        self, db: AsyncSession, current_user: User, target_user_id: uuid.UUID
    ) -> dict:
        """Bỏ chặn người dùng"""
        stmt = select(UserBlock).where(
            UserBlock.blocker_id == current_user.user_id,
            UserBlock.blocked_id == target_user_id,
        )
        res = await db.execute(stmt)
        block_obj = res.scalars().first()
        if block_obj:
            await db.delete(block_obj)
            await db.commit()

        return {"success": True, "message": "Đã bỏ chặn người dùng"}
