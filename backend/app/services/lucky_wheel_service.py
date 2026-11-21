"""
Lucky Wheel Service (STT 35: Vòng quay may mắn) - Mock/Stub Mode
Đã chuyển sang chế độ Mock/Stub an toàn để sẵn sàng triển khai lại từ đầu.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.lucky_wheel import (
    WheelSlotItem,
    WheelStatusResponse,
    SpinResultResponse,
    SpinHistoryResponse,
)

WHEEL_SLOTS: List[WheelSlotItem] = [
    WheelSlotItem(slot_index=0, reward_type="POINTS", reward_name="+5 Điểm Xanh", points_won=5, icon="🌱", color="#10b981"),
    WheelSlotItem(slot_index=1, reward_type="LUCK", reward_name="Chúc may mắn", points_won=0, icon="🍀", color="#64748b"),
]

class LuckyWheelService:
    @staticmethod
    async def get_wheel_status(
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
    ) -> WheelStatusResponse:
        return WheelStatusResponse(
            spins_left_today=1,
            has_spins_today=True,
            next_reset_seconds=3600,
            next_reset_time="00:00",
            total_points_won=0,
            total_badges_won=0,
            slots=WHEEL_SLOTS,
        )

    @staticmethod
    async def spin_wheel(db: AsyncSession, user_id: uuid.UUID) -> SpinResultResponse:
        return SpinResultResponse(
            slot_index=0,
            reward_type="POINTS",
            reward_name="+5 Điểm Xanh",
            points_won=5,
            badge_won=None,
            voucher_code=None,
            message="Quay thưởng thành công (Chế độ Mock/Stub)"
        )

    @staticmethod
    async def get_spin_history(db: AsyncSession, user_id: uuid.UUID) -> SpinHistoryResponse:
        return SpinHistoryResponse(history=[], total_spins=0)
