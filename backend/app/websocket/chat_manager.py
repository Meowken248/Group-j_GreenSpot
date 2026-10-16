import json
import logging
import uuid
from typing import Dict, Iterable, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger("chat_manager")


class ChatConnectionManager:
    """
    Quản lý kết nối WebSocket tập trung cho Chức năng 15 (EcoReport Real-time Chat):
    - Quản lý các WebSocket client theo từng user_id (hỗ trợ 1 user mở nhiều tab).
    - Phát hiện trạng thái Online / Offline tức thời.
    - Phát tin nhắn mới, thông báo đang nhập (typing), đã xem (seen), cập nhật unread count.
    """

    def __init__(self):
        # user_id -> Set[WebSocket]
        self.active_connections: Dict[uuid.UUID, Set[WebSocket]] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket):
        """Chấp nhận kết nối và ghi nhận user online"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket. Total online: {len(self.active_connections)}")

    async def disconnect(self, user_id: uuid.UUID, websocket: WebSocket):
        """Ngắt kết nối websocket và dọn dẹp khi user offline"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected. Remaining online: {len(self.active_connections)}")

    def is_user_online(self, user_id: uuid.UUID) -> bool:
        """Kiểm tra một user có đang online hay không (phục vụ chấm xanh)"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_user_ids(self) -> Set[uuid.UUID]:
        """Lấy danh sách toàn bộ user_id đang online"""
        return set(self.active_connections.keys())

    async def send_personal_message(self, user_id: uuid.UUID, payload: dict):
        """Gửi thông điệp JSON tới tất cả các tab của một user"""
        sockets = self.active_connections.get(user_id)
        if not sockets:
            return

        dead_sockets = set()
        text_data = json.dumps(payload, default=str)
        for ws in sockets:
            try:
                await ws.send_text(text_data)
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {e}")
                dead_sockets.add(ws)

        for ws in dead_sockets:
            sockets.discard(ws)
        if not sockets and user_id in self.active_connections:
            del self.active_connections[user_id]

    async def broadcast_to_users(self, user_ids: Iterable[uuid.UUID], payload: dict):
        """Phát thông điệp JSON tới danh sách các user chỉ định"""
        for uid in user_ids:
            await self.send_personal_message(uid, payload)


# Singleton instance dùng chung trong toàn backend
chat_manager = ChatConnectionManager()
