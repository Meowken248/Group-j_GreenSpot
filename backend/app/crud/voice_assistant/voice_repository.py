"""
Repository Pattern Implementation: Voice Assistant Repository
Thực hiện các thao tác CRUD và truy vấn tối ưu trên CSDL cho Trợ lý giọng nói với SQL tường minh 100%.
"""

from typing import List, Optional
import uuid
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.voice_assistant import IVoiceAssistantRepository
from app.models.voice_assistant import VoiceInteractionLog, VoiceSampleCommand


class VoiceAssistantRepository(IVoiceAssistantRepository):
    """Lớp triển khai cụ thể của IVoiceAssistantRepository sử dụng SQL tường minh hoàn toàn."""

    async def get_active_sample_commands(
        self,
        db: AsyncSession,
        limit: int = 10,
        category: Optional[str] = None,
    ) -> List[VoiceSampleCommand]:
        """Lấy danh sách các câu lệnh mẫu đang kích hoạt theo thứ tự hiển thị bằng SQL tường minh."""
        base_sql = """
            SELECT 
                c.command_id,
                c.category,
                c.command_text,
                c.intent_code,
                c.action_type,
                c.action_target,
                c.default_response,
                c.is_active,
                c.display_order,
                c.created_at,
                c.updated_at
            FROM voice_sample_commands c
            WHERE c.is_active = TRUE
        """
        params = {}
        if category:
            base_sql += " AND c.category = :category"
            params["category"] = category.upper()
        base_sql += " ORDER BY c.display_order ASC, c.created_at ASC"
        if limit > 0:
            base_sql += " LIMIT :limit"
            params["limit"] = limit

        stmt = select(VoiceSampleCommand).from_statement(text(base_sql)).params(**params)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_sample_commands(
        self,
        db: AsyncSession,
    ) -> List[VoiceSampleCommand]:
        """Lấy toàn bộ câu lệnh mẫu đang hoạt động để AI NLU phân tích ngữ nghĩa bằng SQL tường minh."""
        sql = text("""
            SELECT 
                c.command_id,
                c.category,
                c.command_text,
                c.intent_code,
                c.action_type,
                c.action_target,
                c.default_response,
                c.is_active,
                c.display_order,
                c.created_at,
                c.updated_at
            FROM voice_sample_commands c
            WHERE c.is_active = TRUE
            ORDER BY c.display_order ASC
        """)
        stmt = select(VoiceSampleCommand).from_statement(sql)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_command_by_text(
        self,
        db: AsyncSession,
        command_text: str,
    ) -> Optional[VoiceSampleCommand]:
        """Tìm câu lệnh mẫu theo văn bản chính xác (không phân biệt hoa thường) bằng SQL tường minh."""
        clean_text = command_text.strip().lower()
        sql = text("""
            SELECT 
                c.command_id,
                c.category,
                c.command_text,
                c.intent_code,
                c.action_type,
                c.action_target,
                c.default_response,
                c.is_active,
                c.display_order,
                c.created_at,
                c.updated_at
            FROM voice_sample_commands c
            WHERE LOWER(c.command_text) = :clean_text
              AND c.is_active = TRUE
            LIMIT 1
        """)
        stmt = select(VoiceSampleCommand).from_statement(sql).params(clean_text=clean_text)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create_interaction_log(
        self,
        db: AsyncSession,
        log: VoiceInteractionLog,
    ) -> VoiceInteractionLog:
        """Ghi nhận lịch sử tương tác giọng nói vào database."""
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
        """Truy xuất nhật ký tương tác giọng nói gần nhất bằng SQL tường minh."""
        base_sql = """
            SELECT 
                l.log_id,
                l.user_id,
                l.raw_transcript,
                l.normalized_text,
                l.detected_intent,
                l.confidence_score,
                l.action_type,
                l.response_text,
                l.is_success,
                l.session_source,
                l.processing_time_ms,
                l.created_at
            FROM voice_interaction_logs l
        """
        params = {}
        if user_id:
            base_sql += " WHERE l.user_id = :user_id"
            params["user_id"] = user_id
        base_sql += " ORDER BY l.created_at DESC"
        if limit > 0:
            base_sql += " LIMIT :limit"
            params["limit"] = limit

        stmt = select(VoiceInteractionLog).from_statement(text(base_sql)).params(**params)
        result = await db.execute(stmt)
        return list(result.scalars().all())


# Singleton instance sẵn sàng inject vào Router & Service
voice_repository = VoiceAssistantRepository()

