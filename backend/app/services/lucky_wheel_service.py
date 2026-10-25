import random
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.models.reward import RewardTransaction
from app.models.qr_lucky import LuckyWheelSpin
from app.schemas.lucky_wheel import (
    WheelSlotItem,
    WheelStatusResponse,
    SpinResultResponse,
    SpinHistoryItem,
    SpinHistoryResponse,
)

WHEEL_SLOTS: List[WheelSlotItem] = [
    WheelSlotItem(slot_index=0, reward_type="POINTS", reward_name="+5 Điểm Xanh", points_won=5, icon="🌱", color="#10b981"),
    WheelSlotItem(slot_index=1, reward_type="POINTS", reward_name="+10 Điểm Xanh", points_won=10, icon="🌿", color="#059669"),
    WheelSlotItem(slot_index=2, reward_type="POINTS", reward_name="+15 Điểm Xanh", points_won=15, icon="⭐", color="#047857"),
    WheelSlotItem(slot_index=3, reward_type="POINTS", reward_name="+50 Điểm Xanh đặc biệt", points_won=50, icon="💎", color="#0284c7"),
    WheelSlotItem(slot_index=4, reward_type="BADGE", reward_name="Huy hiệu Người gieo mầm", points_won=10, badge_won="Người gieo mầm", icon="🎖️", color="#f59e0b"),
    WheelSlotItem(slot_index=5, reward_type="BADGE", reward_name="Huy hiệu Trái tim xanh", points_won=20, badge_won="Trái tim xanh", icon="💚", color="#ec4899"),
    WheelSlotItem(slot_index=6, reward_type="VOUCHER", reward_name="Voucher ưu đãi sinh thái", points_won=5, voucher_code="ECO-LUCKY-20", icon="🎟️", color="#8b5cf6"),
    WheelSlotItem(slot_index=7, reward_type="LUCK", reward_name="Chúc may mắn lần sau", points_won=2, icon="🍀", color="#64748b"),
]

# Tỷ trọng xác suất quay (tổng = 100)
SLOT_WEIGHTS = [25, 20, 15, 5, 8, 7, 10, 10]

class LuckyWheelService:
    @staticmethod
    async def get_wheel_status(
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
    ) -> WheelStatusResponse:
        now = datetime.now()
        tomorrow_midnight = datetime.combine(now.date() + timedelta(days=1), datetime.min.time())
        next_reset_seconds = max(0, int((tomorrow_midnight - now).total_seconds()))

        if not user_id:
            return WheelStatusResponse(
                spins_left_today=1,
                has_spins_today=True,
                next_reset_seconds=next_reset_seconds,
                next_reset_time="00:00",
                total_points_won=0,
                total_badges_won=0,
                slots=WHEEL_SLOTS,
            )

        # Kiểm tra đã quay hôm nay chưa
        today = date.today()
        stmt = select(LuckyWheelSpin).where(
            LuckyWheelSpin.user_id == user_id,
            LuckyWheelSpin.spin_date == today,
        )
        res = await db.execute(stmt)
        today_spin = res.scalar_one_or_none()

        spins_left = 0 if today_spin else 1

        # Tổng hợp số liệu lịch sử
        pts_q = select(func.coalesce(func.sum(LuckyWheelSpin.points_won), 0)).where(LuckyWheelSpin.user_id == user_id)
        total_pts = (await db.execute(pts_q)).scalar() or 0

        badge_q = select(func.count(LuckyWheelSpin.spin_id)).where(
            LuckyWheelSpin.user_id == user_id,
            LuckyWheelSpin.badge_won != None,
        )
        total_badges = (await db.execute(badge_q)).scalar() or 0

        return WheelStatusResponse(
            spins_left_today=spins_left,
            has_spins_today=(spins_left > 0),
            next_reset_seconds=next_reset_seconds,
            next_reset_time="00:00",
            total_points_won=total_pts,
            total_badges_won=total_badges,
            slots=WHEEL_SLOTS,
        )

    @staticmethod
    async def spin_wheel(db: AsyncSession, user: User) -> SpinResultResponse:
        today = date.today()

        # 1. Kiểm tra giới hạn 01 lượt quay mỗi ngày
        chk_stmt = select(LuckyWheelSpin).where(
            LuckyWheelSpin.user_id == user.user_id,
            LuckyWheelSpin.spin_date == today,
        )
        res = await db.execute(chk_stmt)
        if res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hôm nay bạn đã hết lượt quay",
            )

        # 2. Quay ngẫu nhiên dựa trên trọng số
        chosen_slot_idx = random.choices(range(len(WHEEL_SLOTS)), weights=SLOT_WEIGHTS, k=1)[0]
        slot = WHEEL_SLOTS[chosen_slot_idx]

        # 3. Ghi nhận lượt quay
        spin_record = LuckyWheelSpin(
            spin_id=uuid.uuid4(),
            user_id=user.user_id,
            spin_date=today,
            slot_index=slot.slot_index,
            reward_type=slot.reward_type,
            reward_name=slot.reward_name,
            points_won=slot.points_won,
            badge_won=slot.badge_won,
            voucher_code=slot.voucher_code,
            created_at=datetime.now(timezone.utc),
        )
        db.add(spin_record)

        # 4. Cộng điểm vào tài khoản nếu có
        if slot.points_won > 0:
            user.green_points += slot.points_won
            tx = RewardTransaction(
                transaction_id=uuid.uuid4(),
                user_id=user.user_id,
                points_amount=slot.points_won,
                balance_after=user.green_points,
                transaction_type="EARN",
                description=f"Quay thưởng may mắn: {slot.reward_name}",
                created_at=datetime.now(timezone.utc),
            )
            db.add(tx)

        await db.commit()
        await db.refresh(user)

        # Tạo thông báo theo đúng quy chuẩn Table 146
        if slot.reward_type == "BADGE":
            msg = f"Chúc mừng bạn nhận được huy hiệu '{slot.badge_won}'!"
        elif slot.points_won > 0:
            msg = f"Chúc mừng bạn nhận được +{slot.points_won} điểm xanh!"
        else:
            msg = "Chúc bạn ngày mới tràn đầy niềm vui và lối sống xanh!"

        return SpinResultResponse(
            success=True,
            slot_index=slot.slot_index,
            reward_type=slot.reward_type,
            reward_name=slot.reward_name,
            points_won=slot.points_won,
            badge_won=slot.badge_won,
            voucher_code=slot.voucher_code,
            message=msg,
            new_total_points=user.green_points,
            spins_left_today=0,
        )

    @staticmethod
    async def get_spin_history(db: AsyncSession, user_id: uuid.UUID) -> SpinHistoryResponse:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        stmt = select(LuckyWheelSpin).where(
            LuckyWheelSpin.user_id == user_id,
            LuckyWheelSpin.created_at >= thirty_days_ago,
        ).order_by(desc(LuckyWheelSpin.created_at)).limit(50)

        res = await db.execute(stmt)
        spins = res.scalars().all()

        pts_q = select(func.coalesce(func.sum(LuckyWheelSpin.points_won), 0)).where(LuckyWheelSpin.user_id == user_id)
        total_pts = (await db.execute(pts_q)).scalar() or 0

        badge_q = select(func.count(LuckyWheelSpin.spin_id)).where(
            LuckyWheelSpin.user_id == user_id,
            LuckyWheelSpin.badge_won != None,
        )
        total_badges = (await db.execute(badge_q)).scalar() or 0

        items: List[SpinHistoryItem] = []
        for s in spins:
            created_utc = s.created_at
            items.append(
                SpinHistoryItem(
                    spin_id=s.spin_id,
                    spin_date=s.spin_date.strftime("%d/%m/%Y"),
                    formatted_time=created_utc.strftime("%H:%M %d/%m"),
                    reward_type=s.reward_type,
                    reward_name=s.reward_name,
                    points_won=s.points_won,
                    badge_won=s.badge_won,
                )
            )

        empty_msg = "Bạn chưa có lượt quay nào. Hãy thử vận may hôm nay!" if len(items) == 0 else None

        return SpinHistoryResponse(
            total_spins=len(items),
            total_points_won=total_pts,
            total_badges_won=total_badges,
            history=items,
            empty_message=empty_msg,
        )
