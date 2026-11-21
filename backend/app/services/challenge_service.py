"""
Challenge Service (STT 25: Thử thách xanh trong tuần) - Mock/Stub Mode
Đã chuyển sang chế độ Mock/Stub an toàn để sẵn sàng triển khai lại từ đầu qua TDD.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.challenge import (
    WeeklyChallengesResponse,
    ChallengeSubmitRequest,
    ChallengeCompletionResponse,
)


def get_current_week_str() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def get_week_time_left() -> tuple[int, int, str]:
    return 7, 0, "Chế độ Mock/Stub"


class ChallengeService:
    @staticmethod
    async def get_weekly_challenges(
        db: AsyncSession,
        current_user_id: Optional[uuid.UUID] = None
    ) -> WeeklyChallengesResponse:
        return WeeklyChallengesResponse(
            week_year=get_current_week_str(),
            days_left=7,
            hours_left=0,
            time_left_str="Còn 7 ngày (Chế độ Mock/Stub)",
            completed_count=0,
            total_count=0,
            progress_percentage=0,
            combo_reward_points=100,
            is_all_completed=False,
            challenges=[],
        )

    @staticmethod
    async def submit_challenge(
        db: AsyncSession,
        challenge_id: str,
        user_id: uuid.UUID,
        req: ChallengeSubmitRequest
    ) -> ChallengeCompletionResponse:
        return ChallengeCompletionResponse(
            challenge_id=challenge_id,
            title="Thử thách xanh mẫu",
            points_awarded=0,
            combo_awarded=0,
            new_balance=100,
            status="COMPLETED",
            message="Nộp minh chứng thành công (Chế độ Mock/Stub)",
        )
