"""
Interfaces: Voice Assistant Repository & AI NLU Engine
Tuân thủ nguyên tắc SOLID, Dependency Inversion Principle (DIP) và Repository Pattern.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.voice import VoiceSampleCommand, VoiceInteractionLog
from app.schemas.voice import VoiceProcessRequest, VoiceProcessResponse


class IVoiceAssistantRepository(ABC):
    """Giao diện Repository quản lý dữ liệu Trợ lý giọng nói"""

    @abstractmethod
    async def get_active_sample_commands(
        self,
        db: AsyncSession,
        limit: int = 10,
        category: Optional[str] = None,
    ) -> List[VoiceSampleCommand]:
        """Lấy danh sách các câu lệnh mẫu đang kích hoạt"""
        pass

    @abstractmethod
    async def get_all_sample_commands(
        self,
        db: AsyncSession,
    ) -> List[VoiceSampleCommand]:
        """Lấy toàn bộ câu lệnh mẫu để AI NLU sử dụng tra cứu tri thức"""
        pass

    @abstractmethod
    async def get_command_by_text(
        self,
        db: AsyncSession,
        command_text: str,
    ) -> Optional[VoiceSampleCommand]:
        """Tìm câu lệnh mẫu theo văn bản chính xác"""
        pass

    @abstractmethod
    async def create_interaction_log(
        self,
        db: AsyncSession,
        log: VoiceInteractionLog,
    ) -> VoiceInteractionLog:
        """Lưu vết một phiên xử lý câu lệnh giọng nói"""
        pass

    @abstractmethod
    async def get_recent_logs(
        self,
        db: AsyncSession,
        limit: int = 20,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[VoiceInteractionLog]:
        """Lấy danh sách lịch sử tương tác gần nhất"""
        pass


class IVoiceNluService(ABC):
    """Giao diện Động cơ AI NLU phân tích ngữ âm, chuẩn hóa chính tả và phân loại Intent"""

    @abstractmethod
    def normalize_text(self, raw_text: str) -> str:
        """
        Chuẩn hóa văn bản tiếng Việt:
        - Chuẩn hóa viết hoa đầu câu, dấu chấm kết câu
        - Khắc phục lỗi phát âm, lỗi gõ tắt, chuẩn hóa số và địa danh
        """
        pass

    @abstractmethod
    async def process_voice_command(
        self,
        db: AsyncSession,
        request: VoiceProcessRequest,
    ) -> VoiceProcessResponse:
        """
        Xử lý toàn diện yêu cầu giọng nói:
        1. Chuẩn hóa câu nói
        2. Nhận diện Intent & trích xuất tham số (slots)
        3. Thực thi nghiệp vụ tương ứng (tra cứu AQI thật, sinh form báo cáo, điều hướng...)
        4. Ghi log tương tác vào database
        5. Trả về kết quả cho Màn 3
        """
        pass
