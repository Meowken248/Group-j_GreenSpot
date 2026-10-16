"""
FastAPI Router & WebSocket Endpoint cho Chức năng 15:
Nhắn tin riêng 1-1 và chat nhóm, chat quận thời gian thực (EcoReport Real-time Chat)
"""

import json
import logging
import uuid
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import get_current_active_user
from app.database import AsyncSessionLocal, get_db
from app.models.chat import ConversationMember
from app.models.rbac import User
from app.schemas.chat import (
    ConversationItemResponse,
    ConversationListResponse,
    CreateDirectConversationRequest,
    CreateGroupConversationRequest,
    MessageItemResponse,
    MessageListResponse,
    OnlineMemberItemResponse,
    SendMessageRequest,
    TransferAdminRequest,
)
from app.services.chat_service import ChatService
from app.utils.security import decode_access_token
from app.websocket.chat_manager import chat_manager

logger = logging.getLogger("chat_api")

router = APIRouter(prefix="/chat", tags=["Chat & Nhắn tin thời gian thực (Feature STT 15)"])
chat_service = ChatService()


# =============================================================================
# 1. MÀN 1: DANH SÁCH HỘI THOẠI
# =============================================================================

@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="Lấy danh sách hội thoại theo tab (1-1, Nhóm, Quận) - Màn 1",
)
async def get_conversations_endpoint(
    tab: str = Query("direct", description="Tab hội thoại: 'direct' | 'group' | 'district'"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo tên"),
    page: int = Query(1, ge=1, description="Số trang (20 hội thoại/lần)"),
    limit: int = Query(20, ge=1, le=50, description="Số lượng mục mỗi trang"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 1: Cột trái danh sách hội thoại
    - Tab 1-1, Nhóm, Quận
    - Tab Quận chỉ hiển thị phòng chat của quận người dùng thuộc về
    - Sắp xếp tin mới nhất lên đầu, phân trang 20 items
    - Chấm xanh online cho bạn bè 1-1
    """
    return await chat_service.get_user_conversations(
        db=db,
        user=current_user,
        tab=tab,
        search=search,
        page=page,
        limit=limit,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationItemResponse,
    summary="Lấy chi tiết 1 cuộc trò chuyện",
)
async def get_conversation_detail_endpoint(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin chi tiết của 1 cuộc trò chuyện"""
    return await chat_service.get_conversation_detail(db, current_user, conversation_id)


# =============================================================================
# 2. KHỞI TẠO CUỘC TRÒ CHUYỆN 1-1
# =============================================================================

@router.post(
    "/conversations/direct",
    response_model=ConversationItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khởi tạo hoặc tìm cuộc trò chuyện 1-1 với một người bạn",
)
async def create_direct_conversation_endpoint(
    payload: CreateDirectConversationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mở hoặc tạo cuộc trò chuyện 1-1:
    - Kiểm tra có phải bạn bè không
    - Kiểm tra có bị chặn không
    - Trả về thông tin cuộc trò chuyện
    """
    return await chat_service.get_or_create_direct_conversation(
        db, current_user, payload.target_user_id
    )


# =============================================================================
# 3. MÀN 3: TẠO CHAT NHÓM
# =============================================================================

@router.post(
    "/conversations/group",
    response_model=ConversationItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo nhóm trò chuyện mới (Màn 3)",
)
async def create_group_conversation_endpoint(
    payload: CreateGroupConversationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3: Popup Tạo chat nhóm
    - Tên nhóm tối đa 50 ký tự
    - Chọn tối thiểu 2 và tối đa 50 thành viên bạn bè
    - Người tạo tự động trở thành 'Quản trị nhóm'
    """
    return await chat_service.create_group_conversation(db, current_user, payload)


# =============================================================================
# 4. MÀN 2: LẤY VÀ GỬI TIN NHẮN
# =============================================================================

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    summary="Lấy danh sách tin nhắn trong cuộc trò chuyện (Màn 2)",
)
async def get_messages_endpoint(
    conversation_id: uuid.UUID,
    before_message_id: Optional[uuid.UUID] = Query(None, description="ID tin nhắn mốc để cuộn lên tải tin cũ"),
    limit: int = Query(30, ge=1, le=100, description="Số lượng tin nhắn tải về (mặc định 30)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 2: Tải 30 tin nhắn gần nhất.
    Cuộn lên đầu thì truyền before_message_id để tải thêm 30 tin cũ hơn.
    """
    return await chat_service.get_conversation_messages(
        db=db,
        user=current_user,
        conversation_id=conversation_id,
        before_message_id=before_message_id,
        limit=limit,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Gửi tin nhắn trong cuộc trò chuyện (Màn 2)",
)
async def send_message_endpoint(
    conversation_id: uuid.UUID,
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 2: Gửi tin nhắn
    - Tối đa 1000 ký tự
    - Đính kèm ảnh JPG/PNG/WEBP <= 5MB
    - Chống spam chat quận (3 giây cooldown)
    - Kiểm tra chặn/hủy bạn (1-1) hoặc đã rời nhóm (nhóm)
    """
    return await chat_service.send_message(
        db=db,
        user=current_user,
        conversation_id=conversation_id,
        payload=payload,
    )


@router.post(
    "/conversations/{conversation_id}/read",
    summary="Đánh dấu đã đọc cuộc trò chuyện",
)
async def mark_read_endpoint(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Đánh dấu đã xem toàn bộ tin nhắn trong hội thoại, xóa badge tin chưa đọc"""
    return await chat_service.mark_conversation_as_read(db, current_user, conversation_id)


# =============================================================================
# 5. MÀN 4: XOÁ CUỘC TRÒ CHUYỆN (1-1) & RỜI NHÓM (GROUP)
# =============================================================================

@router.post(
    "/conversations/{conversation_id}/clear",
    summary="Xóa cuộc trò chuyện phía người dùng (Chat 1-1 - Màn 4)",
)
async def clear_direct_chat_endpoint(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 4: Xoá cuộc trò chuyện 1-1.
    Chỉ xóa lịch sử phía người gọi, đối phương vẫn giữ nguyên lịch sử trò chuyện.
    """
    return await chat_service.clear_direct_conversation(db, current_user, conversation_id)


@router.post(
    "/conversations/{conversation_id}/leave",
    summary="Rời khỏi nhóm trò chuyện (Chat nhóm - Màn 4)",
)
async def leave_group_endpoint(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 4: Rời nhóm chat.
    Nếu người dùng là Quản trị nhóm duy nhất, chặn không cho rời và yêu cầu chuyển quyền trước.
    """
    return await chat_service.leave_group_conversation(db, current_user, conversation_id)


@router.post(
    "/conversations/{conversation_id}/transfer-admin",
    summary="Chuyển quyền Quản trị nhóm cho thành viên khác",
)
async def transfer_admin_endpoint(
    conversation_id: uuid.UUID,
    payload: TransferAdminRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Chuyển giao quyền Quản trị nhóm"""
    return await chat_service.transfer_group_admin(
        db, current_user, conversation_id, payload.new_admin_user_id
    )


# =============================================================================
# 6. THÀNH VIÊN ONLINE TRONG PHÒNG CHAT QUẬN (MÀN 2)
# =============================================================================

@router.get(
    "/conversations/{conversation_id}/online-members",
    response_model=List[OnlineMemberItemResponse],
    summary="Lấy danh sách thành viên đang online trong phòng chat (Màn 2 - Chat Quận)",
)
async def get_online_members_endpoint(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cung cấp danh sách thành viên đang online ở cột bên phải phòng chat quận"""
    return await chat_service.get_online_members_in_conversation(db, current_user, conversation_id)


# =============================================================================
# 7. CHẶN & BỎ CHẶN NGƯỜI DÙNG (Phục vụ Màn 2)
# =============================================================================

@router.post(
    "/blocks/{target_user_id}",
    summary="Chặn người dùng (không cho nhắn tin 1-1)",
)
async def block_user_endpoint(
    target_user_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Chặn tin nhắn từ một người dùng"""
    return await chat_service.block_user(db, current_user, target_user_id)


@router.delete(
    "/blocks/{target_user_id}",
    summary="Bỏ chặn người dùng",
)
async def unblock_user_endpoint(
    target_user_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Bỏ chặn tin nhắn người dùng"""
    return await chat_service.unblock_user(db, current_user, target_user_id)


# =============================================================================
# 8. WEBSOCKET REAL-TIME ENGINE (/chat/ws)
# =============================================================================

@router.websocket("/ws")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint thời gian thực cho Chức năng 15:
    - URL: /api/v1/chat/ws?token=<jwt_access_token>
    - Xác thực token JWT, tự động ngắt kết nối nếu không hợp lệ hoặc hết hạn
    - Hỗ trợ các action:
        + PING -> PONG
        + SEND_MESSAGE -> Gửi tin nhắn và broadcast tới các bên liên quan
        + TYPING -> Đang nhập tin nhắn
        + MARK_READ -> Đánh dấu đã đọc
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_uuid = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Xác thực người dùng trong DB
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_uuid)
        if not user or user.deleted_at is not None or user.status != "ACTIVE":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # Kết nối thành công
    await chat_manager.connect(user_uuid, websocket)
    try:
        await websocket.send_json({
            "event": "CONNECTED",
            "user_id": str(user_uuid),
            "message": "Kết nối phòng chat thời gian thực thành công",
        })

        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                continue

            action = data.get("action")

            if action == "PING":
                await websocket.send_json({"event": "PONG"})

            elif action == "SEND_MESSAGE":
                conv_id_str = data.get("conversation_id")
                content = data.get("content")
                media_url = data.get("media_url")

                if not conv_id_str:
                    await websocket.send_json({
                        "event": "ERROR",
                        "message": "Thiếu conversation_id",
                    })
                    continue

                try:
                    conv_uuid = uuid.UUID(conv_id_str)
                    send_req = SendMessageRequest(content=content, media_url=media_url)
                    async with AsyncSessionLocal() as session:
                        db_user = await session.get(User, user_uuid)
                        msg_res = await chat_service.send_message(
                            db=session,
                            user=db_user,
                            conversation_id=conv_uuid,
                            payload=send_req,
                        )
                        # Phản hồi lại người gửi xác nhận đã gửi
                        await websocket.send_json({
                            "event": "MESSAGE_SENT",
                            "conversation_id": str(conv_uuid),
                            "message": msg_res.model_dump(mode="json"),
                        })
                except HTTPException as he:
                    await websocket.send_json({
                        "event": "ERROR",
                        "status_code": he.status_code,
                        "message": he.detail,
                    })
                except Exception as ex:
                    logger.exception(f"Lỗi gửi tin qua WS: {ex}")
                    await websocket.send_json({
                        "event": "ERROR",
                        "message": "Gửi không thành công",
                    })

            elif action == "TYPING":
                conv_id_str = data.get("conversation_id")
                is_typing = bool(data.get("is_typing", True))

                if conv_id_str:
                    try:
                        conv_uuid = uuid.UUID(conv_id_str)
                        async with AsyncSessionLocal() as session:
                            db_user = await session.get(User, user_uuid)
                            m_stmt = select(ConversationMember.user_id).where(
                                ConversationMember.conversation_id == conv_uuid,
                                ConversationMember.user_id != user_uuid,
                                ConversationMember.left_at.is_(None),
                            )
                            m_res = await session.execute(m_stmt)
                            recipient_ids = m_res.scalars().all()

                            await chat_manager.broadcast_to_users(
                                recipient_ids,
                                {
                                    "event": "USER_TYPING",
                                    "conversation_id": str(conv_uuid),
                                    "user_id": str(user_uuid),
                                    "full_name": db_user.full_name if db_user else "Người dùng",
                                    "is_typing": is_typing,
                                },
                            )
                    except Exception as ex:
                        logger.warning(f"Lỗi xử lý TYPING: {ex}")

            elif action == "MARK_READ":
                conv_id_str = data.get("conversation_id")
                if conv_id_str:
                    try:
                        conv_uuid = uuid.UUID(conv_id_str)
                        async with AsyncSessionLocal() as session:
                            db_user = await session.get(User, user_uuid)
                            await chat_service.mark_conversation_as_read(
                                session, db_user, conv_uuid
                            )
                    except Exception as ex:
                        logger.warning(f"Lỗi xử lý MARK_READ: {ex}")

    except WebSocketDisconnect:
        await chat_manager.disconnect(user_uuid, websocket)
    except Exception as e:
        logger.warning(f"WebSocket closed unexpectedly for user {user_uuid}: {e}")
        await chat_manager.disconnect(user_uuid, websocket)
