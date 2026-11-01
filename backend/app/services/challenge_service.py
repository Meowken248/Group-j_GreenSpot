import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.challenge import GreenChallenge, UserChallenge
from app.models.reward import RewardTransaction
from app.models.rbac import User
from app.schemas.challenge import (
    ChallengeItemResponse,
    WeeklyChallengesResponse,
    ChallengeSubmitRequest,
    ChallengeCompletionResponse,
)

def get_current_week_str() -> str:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"

def get_week_time_left() -> tuple[int, int, str]:
    now = datetime.now(timezone.utc)
    # Next Monday 00:00:00 UTC
    days_ahead = 7 - now.weekday()
    if days_ahead == 7 and now.hour == 0 and now.minute == 0:
        days_ahead = 0
    next_monday = (now + timedelta(days=days_ahead)).replace(hour=0, minute=0, second=0, microsecond=0)
    diff = next_monday - now
    days = diff.days
    hours = diff.seconds // 3600
    return days, hours, f"Còn {days} ngày {hours} giờ"

class ChallengeService:
    @staticmethod
    async def get_weekly_challenges(
        db: AsyncSession,
        current_user_id: Optional[uuid.UUID] = None
    ) -> WeeklyChallengesResponse:
        week_year = get_current_week_str()
        days_left, hours_left, time_left_str = get_week_time_left()

        # 1. Fetch active challenges
        q = select(GreenChallenge).where(GreenChallenge.is_active == True).order_by(GreenChallenge.order_index)
        res = await db.execute(q)
        challenges = res.scalars().all()

        user_participations: dict[str, UserChallenge] = {}
        if current_user_id:
            part_q = select(UserChallenge).where(
                and_(
                    UserChallenge.user_id == current_user_id,
                    UserChallenge.week_year == week_year
                )
            )
            part_res = await db.execute(part_q)
            for part in part_res.scalars().all():
                user_participations[part.challenge_id] = part

        items: list[ChallengeItemResponse] = []
        completed_count = 0

        for ch in challenges:
            part = user_participations.get(ch.challenge_id)
            c_status = part.status if part else "NOT_STARTED"
            if c_status == "COMPLETED":
                completed_count += 1

            items.append(
                ChallengeItemResponse(
                    challenge_id=ch.challenge_id,
                    title=ch.title,
                    description=ch.description,
                    points_reward=ch.points_reward,
                    category=ch.category,
                    icon=ch.icon,
                    requirements=ch.requirements,
                    is_auto_verify=ch.is_auto_verify,
                    status=c_status,
                    evidence_image_url=part.evidence_image_url if part else None,
                    evidence_note=part.evidence_note if part else None,
                    completed_at=part.completed_at if part else None,
                )
            )

        total_count = len(items)
        progress_percentage = int((completed_count / total_count * 100)) if total_count > 0 else 0
        is_all_completed = completed_count >= total_count and total_count > 0

        return WeeklyChallengesResponse(
            week_year=week_year,
            days_left=days_left,
            hours_left=hours_left,
            time_left_str=time_left_str,
            completed_count=completed_count,
            total_count=total_count,
            progress_percentage=progress_percentage,
            combo_reward_points=100,
            is_all_completed=is_all_completed,
            challenges=items
        )

    @staticmethod
    async def submit_challenge(
        db: AsyncSession,
        challenge_id: str,
        user_id: uuid.UUID,
        payload: ChallengeSubmitRequest
    ) -> ChallengeCompletionResponse:
        week_year = get_current_week_str()

        # 1. Check challenge exists
        ch_q = select(GreenChallenge).where(GreenChallenge.challenge_id == challenge_id, GreenChallenge.is_active == True)
        ch_res = await db.execute(ch_q)
        challenge = ch_res.scalar_one_or_none()
        if not challenge:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thử thách không tồn tại hoặc đã kết thúc")

        # 2. Check user participation
        part_q = select(UserChallenge).where(
            and_(
                UserChallenge.user_id == user_id,
                UserChallenge.challenge_id == challenge_id,
                UserChallenge.week_year == week_year
            )
        )
        part_res = await db.execute(part_q)
        part = part_res.scalar_one_or_none()

        if part and part.status == "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã hoàn thành nhiệm vụ này rồi"
            )

        # 3. Create or update user challenge
        now = datetime.now(timezone.utc)
        if not part:
            part = UserChallenge(
                user_id=user_id,
                challenge_id=challenge_id,
                week_year=week_year,
                status="NOT_STARTED",
                created_at=now
            )
            db.add(part)

        part.evidence_image_url = payload.evidence_image_url
        part.evidence_note = payload.evidence_note

        points_awarded = 0
        combo_awarded = 0
        result_status = "PENDING"
        msg = "Đã nộp minh chứng. Kết quả sẽ được duyệt trong vòng 24h"

        if challenge.is_auto_verify:
            part.status = "COMPLETED"
            part.completed_at = now
            part.claimed_at = now
            points_awarded = challenge.points_reward
            result_status = "COMPLETED"
            msg = f"+{points_awarded} điểm xanh đã được cộng vào tài khoản của bạn"

            # Cập nhật điểm người dùng
            user = await db.get(User, user_id)
            if user:
                user.green_points += points_awarded
                user.lifetime_points += points_awarded

                # Check if all challenges completed this week
                total_active_q = select(func.count(GreenChallenge.challenge_id)).where(GreenChallenge.is_active == True)
                total_active = (await db.execute(total_active_q)).scalar() or 0

                completed_count_q = select(func.count(UserChallenge.id)).where(
                    and_(
                        UserChallenge.user_id == user_id,
                        UserChallenge.week_year == week_year,
                        UserChallenge.status == "COMPLETED"
                    )
                )
                already_completed_count = (await db.execute(completed_count_q)).scalar() or 0
                if (already_completed_count + 1) >= total_active and total_active > 0:
                    combo_awarded = 100
                    user.green_points += combo_awarded
                    user.lifetime_points += combo_awarded
                    msg = f"Chúc mừng bạn đã hoàn thành tất cả thử thách tuần! Nhận +{points_awarded}đ và combo +{combo_awarded} điểm thưởng"

                # Record RewardTransaction
                tx = RewardTransaction(
                    user_id=user_id,
                    points_amount=points_awarded + combo_awarded,
                    balance_after=user.green_points,
                    transaction_type="CHALLENGE",
                    description=f"Hoàn thành thử thách xanh: {challenge.title}" + (f" (kèm combo +{combo_awarded}đ)" if combo_awarded else "")
                )
                db.add(tx)
                new_balance = user.green_points
            else:
                new_balance = 0
        else:
            part.status = "PENDING"
            user = await db.get(User, user_id)
            new_balance = user.green_points if user else 0

        await db.commit()

        return ChallengeCompletionResponse(
            challenge_id=challenge_id,
            title=challenge.title,
            points_awarded=points_awarded,
            combo_awarded=combo_awarded,
            new_balance=new_balance,
            status=result_status,
            message=msg
        )
