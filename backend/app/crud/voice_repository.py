"""
Repository Pattern Implementation: Voice Assistant Repository
Thực hiện các thao tác CRUD và truy vấn tối ưu trên CSDL cho Trợ lý giọng nói.
"""

from typing import List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.voice_interface import IVoiceAssistantRepository
from app.models.voice import VoiceInteractionLog, VoiceSampleCommand


class VoiceAssistantRepository(IVoiceAssistantRepository):
    """Lớp triển khai cụ thể của IVoiceAssistantRepository sử dụng SQLAlchemy 2.0 Async"""

    async def get_active_sample_commands(
        self,
        db: AsyncSession,
        limit: int = 10,
        category: Optional[str] = None,
    ) -> List[VoiceSampleCommand]:
        """Lấy danh sách các câu lệnh mẫu đang kích hoạt theo thứ tự hiển thị"""
        stmt = (
            select(VoiceSampleCommand)
            .where(VoiceSampleCommand.is_active == True)
            .order_by(VoiceSampleCommand.display_order.asc(), VoiceSampleCommand.created_at.asc())
        )
        if category:
            stmt = stmt.where(VoiceSampleCommand.category == category.upper())
        if limit > 0:
            stmt = stmt.limit(limit)

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_sample_commands(
        self,
        db: AsyncSession,
    ) -> List[VoiceSampleCommand]:
        """Lấy toàn bộ câu lệnh mẫu đang hoạt động để AI NLU phân tích ngữ nghĩa"""
        stmt = (
            select(VoiceSampleCommand)
            .where(VoiceSampleCommand.is_active == True)
            .order_by(VoiceSampleCommand.display_order.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_command_by_text(
        self,
        db: AsyncSession,
        command_text: str,
    ) -> Optional[VoiceSampleCommand]:
        """Tìm câu lệnh mẫu theo văn bản chính xác (không phân biệt hoa thường)"""
        clean_text = command_text.strip().lower()
        stmt = select(VoiceSampleCommand).where(
            func.lower(VoiceSampleCommand.command_text) == clean_text,
            VoiceSampleCommand.is_active == True,
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create_interaction_log(
        self,
        db: AsyncSession,
        log: VoiceInteractionLog,
    ) -> VoiceInteractionLog:
        """Ghi nhận lịch sử tương tác giọng nói vào database"""
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return log

    async def get_recent_logs(
        self,
        db: AsyncSession,
        limit: int = 20,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[VoiceInteractionLog]:
        """Truy xuất nhật ký tương tác giọng nói gần nhất"""
        stmt = select(VoiceInteractionLog).order_by(VoiceInteractionLog.created_at.desc())
        if user_id:
            stmt = stmt.where(VoiceInteractionLog.user_id == user_id)
        if limit > 0:
            stmt = stmt.limit(limit)

        result = await db.execute(stmt)
        return list(result.scalars().all())


# Singleton instance sẵn sàng inject vào Router & Service
voice_repository = VoiceAssistantRepository()
