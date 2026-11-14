import random
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List
from sqlalchemy import select, func, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.models.reward import RewardTransaction, UserVoucher, CitizenReward
from app.models.qr_lucky import LuckyWheelSpin, LuckyWheelSlot
from app.models.audit import AuditLog
from app.schemas.lucky_wheel import (
    WheelSlotItem,
    WheelSlotCreate,
    WheelSlotUpdate,
    AdminSlotStatsResponse,
    WheelStatusResponse,
    SpinResultResponse,
    SpinHistoryItem,
    SpinHistoryResponse,
)

DEFAULT_SLOTS_DATA = [
    {"slot_index": 0, "reward_type": "POINTS", "reward_name": "+5 Điểm Xanh", "points_won": 5, "badge_won": None, "voucher_code": None, "icon": "🌱", "color": "#10b981", "probability_weight": 25},
    {"slot_index": 1, "reward_type": "POINTS", "reward_name": "+10 Điểm Xanh", "points_won": 10, "badge_won": None, "voucher_code": None, "icon": "🌿", "color": "#059669", "probability_weight": 20},
    {"slot_index": 2, "reward_type": "POINTS", "reward_name": "+15 Điểm Xanh", "points_won": 15, "badge_won": None, "voucher_code": None, "icon": "⭐", "color": "#047857", "probability_weight": 15},
    {"slot_index": 3, "reward_type": "POINTS", "reward_name": "+50 Điểm Xanh đặc biệt", "points_won": 50, "badge_won": None, "voucher_code": None, "icon": "💎", "color": "#0284c7", "probability_weight": 5},
    {"slot_index": 4, "reward_type": "BADGE", "reward_name": "Huy hiệu Người gieo mầm", "points_won": 10, "badge_won": "Người gieo mầm", "voucher_code": None, "icon": "🎖️", "color": "#f59e0b", "probability_weight": 8},
    {"slot_index": 5, "reward_type": "BADGE", "reward_name": "Huy hiệu Trái tim xanh", "points_won": 20, "badge_won": "Trái tim xanh", "voucher_code": None, "icon": "💚", "color": "#ec4899", "probability_weight": 7},
    {"slot_index": 6, "reward_type": "VOUCHER", "reward_name": "Voucher ưu đãi sinh thái", "points_won": 5, "badge_won": None, "voucher_code": "ECO-LUCKY-20", "icon": "🎟️", "color": "#8b5cf6", "probability_weight": 10},
    {"slot_index": 7, "reward_type": "LUCK", "reward_name": "Khích lệ sống xanh (+2đ)", "points_won": 2, "badge_won": None, "voucher_code": None, "icon": "🍀", "color": "#64748b", "probability_weight": 10},
]


class LuckyWheelService:

    @classmethod
    async def get_or_seed_slots(cls, db: AsyncSession) -> List[LuckyWheelSlot]:
        """Tự động nạp 8 ô mặc định nếu bảng cấu hình trống"""
        stmt = select(LuckyWheelSlot).order_by(LuckyWheelSlot.slot_index)
        res = await db.execute(stmt)
        slots = list(res.scalars().all())

        if not slots:
            now = datetime.now(timezone.utc)
            for item in DEFAULT_SLOTS_DATA:
                slot_obj = LuckyWheelSlot(
                    slot_id=uuid.uuid4(),
                    slot_index=item["slot_index"],
                    reward_type=item["reward_type"],
                    reward_name=item["reward_name"],
                    points_won=item["points_won"],
                    badge_won=item.get("badge_won"),
                    voucher_code=item.get("voucher_code"),
                    icon=item["icon"],
                    color=item["color"],
                    probability_weight=item["probability_weight"],
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
                db.add(slot_obj)
            await db.commit()

            res2 = await db.execute(select(LuckyWheelSlot).order_by(LuckyWheelSlot.slot_index))
            slots = list(res2.scalars().all())

        return slots

    @classmethod
    async def get_active_slots(cls, db: AsyncSession) -> List[LuckyWheelSlot]:
        """Lấy danh sách các ô đang kích hoạt (active = True) để hiển thị lên vòng quay"""
        stmt = select(LuckyWheelSlot).where(LuckyWheelSlot.is_active == True).order_by(LuckyWheelSlot.slot_index)
        res = await db.execute(stmt)
        active_slots = list(res.scalars().all())

        if not active_slots:
            # Nếu chưa có hoặc toàn bộ inactive, seed và lấy lại
            all_slots = await cls.get_or_seed_slots(db)
            active_slots = [s for s in all_slots if s.is_active]

        return active_slots

    @classmethod
    def _to_slot_item(cls, slot: LuckyWheelSlot, reindexed: Optional[int] = None) -> WheelSlotItem:
        return WheelSlotItem(
            slot_id=slot.slot_id,
            slot_index=reindexed if reindexed is not None else slot.slot_index,
            reward_type=slot.reward_type,
            reward_name=slot.reward_name,
            points_won=slot.points_won,
            badge_won=slot.badge_won,
            voucher_code=slot.voucher_code,
            icon=slot.icon,
            color=slot.color,
            probability_weight=slot.probability_weight,
            is_active=slot.is_active,
        )

    @classmethod
    async def get_wheel_status(
        cls,
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
    ) -> WheelStatusResponse:
        now = datetime.now()
        tomorrow_midnight = datetime.combine(now.date() + timedelta(days=1), datetime.min.time())
        next_reset_seconds = max(0, int((tomorrow_midnight - now).total_seconds()))

        # Lấy danh sách ô đang kích hoạt thực tế từ Database
        active_slots = await cls.get_active_slots(db)
        slot_items = [cls._to_slot_item(s, reindexed=idx) for idx, s in enumerate(active_slots)]

        if not user_id:
            return WheelStatusResponse(
                spins_left_today=1,
                has_spins_today=True,
                next_reset_seconds=next_reset_seconds,
                next_reset_time="00:00",
                total_points_won=0,
                total_badges_won=0,
                slots=slot_items,
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
            slots=slot_items,
        )

    @classmethod
    async def spin_wheel(cls, db: AsyncSession, user: User) -> SpinResultResponse:
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

        # 2. Lấy các ô đang kích hoạt thực tế từ Database
        active_slots = await cls.get_active_slots(db)
        if not active_slots:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không có ô giải thưởng khả dụng trên vòng quay",
            )

        weights = [max(1, s.probability_weight) for s in active_slots]
        chosen_idx = random.choices(range(len(active_slots)), weights=weights, k=1)[0]
        slot = active_slots[chosen_idx]

        # 3. Ghi nhận lượt quay
        spin_record = LuckyWheelSpin(
            spin_id=uuid.uuid4(),
            user_id=user.user_id,
            spin_date=today,
            slot_index=chosen_idx,
            reward_type=slot.reward_type,
            reward_name=slot.reward_name,
            points_won=slot.points_won,
            badge_won=slot.badge_won,
            voucher_code=slot.voucher_code,
            created_at=datetime.now(timezone.utc),
        )
        db.add(spin_record)

        # 4. Cộng điểm vào tài khoản nếu có (Cộng cả điểm khả dụng và điểm xét hạng trọn đời)
        if slot.points_won > 0:
            user.green_points = (user.green_points or 0) + slot.points_won
            user.lifetime_points = (user.lifetime_points or 0) + slot.points_won
            tx = RewardTransaction(
                transaction_id=uuid.uuid4(),
                user_id=user.user_id,
                points_amount=slot.points_won,
                balance_after=user.green_points,
                transaction_type="LUCKY_WHEEL_SPIN",
                description=f"Quay thưởng may mắn: {slot.reward_name}",
                created_at=datetime.now(timezone.utc),
            )
            db.add(tx)

        # [CN 26 & CN 35] Ghi nhận AuditLog nhật ký kiểm toán quay thưởng
        try:
            audit = AuditLog(
                user_id=user.user_id,
                action="LUCKY_WHEEL_SPIN",
                table_name="lucky_wheel_spins",
                record_id=str(spin_record.spin_id),
                old_data=None,
                new_data={
                    "slot_index": chosen_idx,
                    "slot_id": str(slot.slot_id),
                    "reward_name": slot.reward_name,
                    "points_won": slot.points_won,
                    "badge_won": slot.badge_won,
                },
                ip_address="127.0.0.1",
            )
            db.add(audit)
        except Exception:
            pass

        # 5. Nếu trúng Voucher, tự động phát hành UserVoucher vào ví cá nhân của công dân
        if slot.reward_type == "VOUCHER":
            rew_stmt = select(CitizenReward).limit(1)
            rew_obj = (await db.execute(rew_stmt)).scalar_one_or_none()
            reward_id = rew_obj.reward_id if rew_obj else 1

            code_prefix = slot.voucher_code or "LUCKY"
            unique_code = f"{code_prefix}-{user.user_id.hex[:4].upper()}-{uuid.uuid4().hex[:6].upper()}"
            voucher = UserVoucher(
                voucher_id=uuid.uuid4(),
                user_id=user.user_id,
                reward_id=reward_id,
                voucher_code=unique_code,
                points_spent=0,
                status="ACTIVE",
                terms_and_conditions=f"Voucher sinh thái quà tặng đặc biệt từ Vòng quay may mắn: {slot.reward_name}. Hạn dùng 30 ngày.",
                qr_data=f"GREENSPOT-VOUCHER:{unique_code}",
                redeemed_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            )
            db.add(voucher)

        await db.commit()
        await db.refresh(user)

        # Tạo thông báo theo đúng quy chuẩn
        if slot.reward_type == "BADGE":
            msg = f"Chúc mừng bạn nhận được huy hiệu '{slot.badge_won}'!"
        elif slot.reward_type == "VOUCHER":
            msg = f"Chúc mừng bạn nhận được {slot.reward_name}! Mã voucher đã được thêm vào Ví cá nhân."
        elif slot.points_won > 0:
            msg = f"Chúc mừng bạn nhận được +{slot.points_won} điểm xanh!"
        else:
            msg = "Chúc bạn ngày mới tràn đầy niềm vui và lối sống xanh!"

        return SpinResultResponse(
            success=True,
            slot_index=chosen_idx,
            reward_type=slot.reward_type,
            reward_name=slot.reward_name,
            points_won=slot.points_won,
            badge_won=slot.badge_won,
            voucher_code=slot.voucher_code,
            message=msg,
            new_total_points=user.green_points,
            spins_left_today=0,
        )

    @classmethod
    async def get_spin_history(cls, db: AsyncSession, user_id: uuid.UUID) -> SpinHistoryResponse:
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

    # =========================================================================
    # PHÂN HỆ QUẢN TRỊ ADMIN CRUD CÁC Ô GIẢI THƯỞNG VÒNG QUAY (CHỨC NĂNG 35 CRUD)
    # =========================================================================

    @classmethod
    async def get_admin_slots(cls, db: AsyncSession) -> AdminSlotStatsResponse:
        """Lấy toàn bộ danh sách ô thưởng (bao gồm cả ô đang tắt) phục vụ quản trị"""
        all_slots = await cls.get_or_seed_slots(db)
        active_count = sum(1 for s in all_slots if s.is_active)
        total_weight = sum(s.probability_weight for s in all_slots if s.is_active)

        return AdminSlotStatsResponse(
            total_slots=len(all_slots),
            active_slots=active_count,
            total_weight=total_weight,
            slots=[cls._to_slot_item(s) for s in all_slots],
        )

    @classmethod
    async def create_slot(
        cls,
        db: AsyncSession,
        data: WheelSlotCreate,
        admin_user: User,
    ) -> WheelSlotItem:
        """Thêm mới một ô giải thưởng vào vòng quay"""
        stmt = select(func.coalesce(func.max(LuckyWheelSlot.slot_index), -1))
        max_idx = (await db.execute(stmt)).scalar() or -1
        next_idx = max_idx + 1

        now = datetime.now(timezone.utc)
        new_slot = LuckyWheelSlot(
            slot_id=uuid.uuid4(),
            slot_index=next_idx,
            reward_type=data.reward_type,
            reward_name=data.reward_name.strip(),
            points_won=max(0, data.points_won),
            badge_won=data.badge_won.strip() if data.badge_won else None,
            voucher_code=data.voucher_code.strip() if data.voucher_code else None,
            icon=data.icon.strip() or "🎁",
            color=data.color.strip() or "#10b981",
            probability_weight=max(1, data.probability_weight),
            is_active=data.is_active,
            created_at=now,
            updated_at=now,
        )
        db.add(new_slot)

        # Ghi AuditLog
        try:
            audit = AuditLog(
                user_id=admin_user.user_id,
                action="CREATE_LUCKY_WHEEL_SLOT",
                table_name="lucky_wheel_slots",
                record_id=str(new_slot.slot_id),
                old_data=None,
                new_data={
                    "slot_index": next_idx,
                    "reward_name": new_slot.reward_name,
                    "reward_type": new_slot.reward_type,
                    "points_won": new_slot.points_won,
                    "probability_weight": new_slot.probability_weight,
                },
                ip_address="127.0.0.1",
            )
            db.add(audit)
        except Exception:
            pass

        await db.commit()
        await db.refresh(new_slot)
        return cls._to_slot_item(new_slot)

    @classmethod
    async def update_slot(
        cls,
        db: AsyncSession,
        slot_id: uuid.UUID,
        data: WheelSlotUpdate,
        admin_user: User,
    ) -> WheelSlotItem:
        """Cập nhật thông tin, điểm thưởng, màu sắc, xác suất của một ô giải thưởng"""
        slot = await db.get(LuckyWheelSlot, slot_id)
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy ô giải thưởng tương ứng",
            )

        old_snapshot = {
            "reward_name": slot.reward_name,
            "reward_type": slot.reward_type,
            "points_won": slot.points_won,
            "probability_weight": slot.probability_weight,
            "is_active": slot.is_active,
        }

        if data.reward_name is not None:
            slot.reward_name = data.reward_name.strip()
        if data.reward_type is not None:
            slot.reward_type = data.reward_type
        if data.points_won is not None:
            slot.points_won = max(0, data.points_won)
        if data.badge_won is not None:
            slot.badge_won = data.badge_won.strip() if data.badge_won else None
        if data.voucher_code is not None:
            slot.voucher_code = data.voucher_code.strip() if data.voucher_code else None
        if data.icon is not None:
            slot.icon = data.icon.strip() or "🎁"
        if data.color is not None:
            slot.color = data.color.strip() or "#10b981"
        if data.probability_weight is not None:
            slot.probability_weight = max(1, data.probability_weight)
        if data.is_active is not None:
            slot.is_active = data.is_active
        if data.slot_index is not None:
            slot.slot_index = data.slot_index

        slot.updated_at = datetime.now(timezone.utc)

        # Ghi AuditLog
        try:
            audit = AuditLog(
                user_id=admin_user.user_id,
                action="UPDATE_LUCKY_WHEEL_SLOT",
                table_name="lucky_wheel_slots",
                record_id=str(slot.slot_id),
                old_data=old_snapshot,
                new_data={
                    "reward_name": slot.reward_name,
                    "reward_type": slot.reward_type,
                    "points_won": slot.points_won,
                    "probability_weight": slot.probability_weight,
                    "is_active": slot.is_active,
                },
                ip_address="127.0.0.1",
            )
            db.add(audit)
        except Exception:
            pass

        await db.commit()
        await db.refresh(slot)
        return cls._to_slot_item(slot)

    @classmethod
    async def delete_slot(
        cls,
        db: AsyncSession,
        slot_id: uuid.UUID,
        admin_user: User,
    ) -> dict:
        """Xóa một ô giải thưởng và tự động đánh lại số thứ tự (index) cho các ô còn lại"""
        slot = await db.get(LuckyWheelSlot, slot_id)
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy ô giải thưởng tương ứng",
            )

        # Đảm bảo vòng quay có tối thiểu 3 ô để có thể quay được
        total_q = select(func.count(LuckyWheelSlot.slot_id))
        total_cnt = (await db.execute(total_q)).scalar() or 0
        if total_cnt <= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vòng quay phải có tối thiểu 03 ô giải thưởng. Không thể xóa thêm!",
            )

        deleted_name = slot.reward_name
        await db.delete(slot)

        # Tự động đánh lại slot_index liên tục: 0, 1, 2, ...
        remaining_stmt = select(LuckyWheelSlot).order_by(LuckyWheelSlot.slot_index)
        remaining_slots = (await db.execute(remaining_stmt)).scalars().all()
        for idx, rem_slot in enumerate(remaining_slots):
            rem_slot.slot_index = idx

        # Ghi AuditLog
        try:
            audit = AuditLog(
                user_id=admin_user.user_id,
                action="DELETE_LUCKY_WHEEL_SLOT",
                table_name="lucky_wheel_slots",
                record_id=str(slot_id),
                old_data={"reward_name": deleted_name},
                new_data=None,
                ip_address="127.0.0.1",
            )
            db.add(audit)
        except Exception:
            pass

        await db.commit()
        return {"success": True, "message": f"Đã xóa ô giải thưởng '{deleted_name}' thành công"}

    @classmethod
    async def reset_default_slots(
        cls,
        db: AsyncSession,
        admin_user: User,
    ) -> AdminSlotStatsResponse:
        """Khôi phục toàn bộ 8 ô giải thưởng mặc định chuẩn ban đầu"""
        await db.execute(delete(LuckyWheelSlot))

        now = datetime.now(timezone.utc)
        for item in DEFAULT_SLOTS_DATA:
            slot_obj = LuckyWheelSlot(
                slot_id=uuid.uuid4(),
                slot_index=item["slot_index"],
                reward_type=item["reward_type"],
                reward_name=item["reward_name"],
                points_won=item["points_won"],
                badge_won=item.get("badge_won"),
                voucher_code=item.get("voucher_code"),
                icon=item["icon"],
                color=item["color"],
                probability_weight=item["probability_weight"],
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(slot_obj)

        # Ghi AuditLog
        try:
            audit = AuditLog(
                user_id=admin_user.user_id,
                action="RESET_LUCKY_WHEEL_DEFAULT_SLOTS",
                table_name="lucky_wheel_slots",
                record_id="DEFAULT_PRESET_8_SLOTS",
                old_data=None,
                new_data={"count": len(DEFAULT_SLOTS_DATA)},
                ip_address="127.0.0.1",
            )
            db.add(audit)
        except Exception:
            pass

        await db.commit()
        return await cls.get_admin_slots(db)
