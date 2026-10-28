import uuid
import re
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import select, func, and_, desc, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.challenge import GreenChallenge, UserChallenge
from app.models.reward import RewardTransaction
from app.models.rbac import User
from app.models.audit import AuditLog
from app.schemas.challenge import (
    ChallengeItemResponse,
    WeeklyChallengesResponse,
    ChallengeSubmitRequest,
    ChallengeCompletionResponse,
    ChallengeCreateRequest,
    ChallengeUpdateRequest,
    AdminChallengeItemResponse,
    AdminChallengeListResponse,
    AdminSubmissionItemResponse,
    AdminSubmissionListResponse,
    AdminReviewSubmissionRequest,
    AdminReviewSubmissionResponse,
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
    async def _has_received_weekly_combo(
        db: AsyncSession,
        user_id: uuid.UUID,
        week_year: str
    ) -> bool:
        """Kiểm tra xem công dân đã nhận thưởng Combo +100đ trong tuần này chưa để chống cộng trùng."""
        combo_q = select(func.count(RewardTransaction.transaction_id)).where(
            and_(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type == "CHALLENGE",
                or_(
                    RewardTransaction.description.ilike(f"%[Combo {week_year}]%"),
                    RewardTransaction.description.ilike("%combo +100đ%")
                )
            )
        )
        cnt = (await db.execute(combo_q)).scalar() or 0
        return cnt > 0

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
                    rejection_reason=part.rejection_reason if part else None,
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

        # 2.5. Chống gian lận nộp trùng 1 bức ảnh minh chứng cho nhiều thử thách (SHA-256 Anti-Fraud)
        incoming_img = (payload.evidence_image_url or "").strip()
        if incoming_img:
            incoming_hash = hashlib.sha256(incoming_img.encode("utf-8")).hexdigest()
            other_subs_q = select(UserChallenge).where(
                and_(
                    UserChallenge.user_id == user_id,
                    UserChallenge.week_year == week_year,
                    UserChallenge.challenge_id != challenge_id,
                    UserChallenge.status.in_(["COMPLETED", "PENDING"]),
                )
            )
            other_subs = (await db.execute(other_subs_q)).scalars().all()
            for o_sub in other_subs:
                existing_img = (o_sub.evidence_image_url or "").strip()
                if existing_img and hashlib.sha256(existing_img.encode("utf-8")).hexdigest() == incoming_hash:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Phát hiện ảnh trùng lặp (SHA-256): Ảnh minh chứng này đã được sử dụng cho một nhiệm vụ khác trong tuần. Vui lòng chụp ảnh thực tế mới!"
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
        part.rejection_reason = None  # Reset rejection reason on resubmit

        points_awarded = 0
        combo_awarded = 0
        result_status = "PENDING"
        msg = "Đã nộp minh chứng thành công. Cán bộ sẽ kiểm tra và duyệt điểm cho bạn trong 24h!"

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
                user.green_points = (user.green_points or 0) + points_awarded
                user.lifetime_points = (user.lifetime_points or 0) + points_awarded

                # Check if all active challenges completed this week (and combo not yet claimed)
                active_ids_q = select(GreenChallenge.challenge_id).where(GreenChallenge.is_active == True)
                active_ids = list((await db.execute(active_ids_q)).scalars().all())
                total_active = len(active_ids)

                if total_active > 0:
                    completed_ids_q = select(UserChallenge.challenge_id).where(
                        and_(
                            UserChallenge.user_id == user_id,
                            UserChallenge.week_year == week_year,
                            UserChallenge.status == "COMPLETED",
                            UserChallenge.challenge_id.in_(active_ids),
                        )
                    )
                    completed_ids = set((await db.execute(completed_ids_q)).scalars().all())
                    completed_ids.add(challenge_id)

                    already_got_combo = await ChallengeService._has_received_weekly_combo(db, user_id, week_year)
                    if len(completed_ids) >= total_active and not already_got_combo:
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
                    description=f"Hoàn thành thử thách xanh: {challenge.title}" + (f" (kèm combo +{combo_awarded}đ [Combo {week_year}])" if combo_awarded else "")
                )
                db.add(tx)

                # Record AuditLog for auto-verified challenge reward
                audit = AuditLog(
                    user_id=user_id,
                    action="REWARD_POINTS",
                    table_name="user_challenges",
                    record_id=challenge_id,
                    old_data={"status": "NOT_STARTED"},
                    new_data={
                        "status": "COMPLETED",
                        "challenge_id": challenge_id,
                        "points_awarded": points_awarded,
                        "combo_awarded": combo_awarded,
                        "week_year": week_year,
                        "verification_mode": "AUTO_SHA256_VERIFIED"
                    },
                    ip_address="127.0.0.1",
                    user_agent="Citizen Challenge Portal",
                    request_uri=f"/api/v1/challenges/{challenge_id}/submit",
                    is_suspicious=False
                )
                db.add(audit)
                new_balance = user.green_points
            else:
                new_balance = 0
        else:
            part.status = "PENDING"
            user = await db.get(User, user_id)
            new_balance = user.green_points if user else 0
            audit = AuditLog(
                user_id=user_id,
                action="UPDATE_DATA",
                table_name="user_challenges",
                record_id=challenge_id,
                old_data={"status": "NOT_STARTED"},
                new_data={
                    "status": "PENDING",
                    "challenge_id": challenge_id,
                    "week_year": week_year,
                    "verification_mode": "MANUAL_REVIEW_QUEUE"
                },
                ip_address="127.0.0.1",
                user_agent="Citizen Challenge Portal",
                request_uri=f"/api/v1/challenges/{challenge_id}/submit",
                is_suspicious=False
            )
            db.add(audit)

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

    # ==========================================
    # ADMIN CRUD FOR CHALLENGES
    # ==========================================
    @staticmethod
    async def admin_get_all_challenges(db: AsyncSession) -> AdminChallengeListResponse:
        q = select(GreenChallenge).order_by(GreenChallenge.order_index, GreenChallenge.created_at.desc())
        res = await db.execute(q)
        challenges = res.scalars().all()

        items: List[AdminChallengeItemResponse] = []
        for ch in challenges:
            p_count_q = select(func.count(UserChallenge.id)).where(UserChallenge.challenge_id == ch.challenge_id)
            p_count = (await db.execute(p_count_q)).scalar() or 0

            c_count_q = select(func.count(UserChallenge.id)).where(
                and_(
                    UserChallenge.challenge_id == ch.challenge_id,
                    UserChallenge.status == "COMPLETED"
                )
            )
            c_count = (await db.execute(c_count_q)).scalar() or 0

            items.append(
                AdminChallengeItemResponse(
                    challenge_id=ch.challenge_id,
                    title=ch.title,
                    description=ch.description,
                    points_reward=ch.points_reward,
                    category=ch.category,
                    icon=ch.icon,
                    requirements=ch.requirements,
                    is_auto_verify=ch.is_auto_verify,
                    is_active=ch.is_active,
                    order_index=ch.order_index,
                    created_at=ch.created_at,
                    participants_count=p_count,
                    completed_count=c_count,
                )
            )

        return AdminChallengeListResponse(
            total=len(items),
            challenges=items
        )

    @staticmethod
    async def admin_create_challenge(
        db: AsyncSession,
        payload: ChallengeCreateRequest,
        admin_id: uuid.UUID
    ) -> GreenChallenge:
        # Generate challenge_id if omitted
        ch_id = payload.challenge_id
        if not ch_id or not ch_id.strip():
            slug = re.sub(r'[^a-zA-Z0-9]+', '_', payload.title).strip('_').upper()
            ch_id = f"CHALLENGE_{slug[:30]}_{uuid.uuid4().hex[:6].upper()}"
        else:
            ch_id = ch_id.strip()

        # Check collision
        exists = await db.get(GreenChallenge, ch_id)
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã thử thách '{ch_id}' đã tồn tại"
            )

        ch = GreenChallenge(
            challenge_id=ch_id,
            title=payload.title,
            description=payload.description,
            points_reward=payload.points_reward,
            category=payload.category,
            icon=payload.icon,
            requirements=payload.requirements,
            is_auto_verify=payload.is_auto_verify,
            is_active=payload.is_active,
            order_index=payload.order_index,
        )
        db.add(ch)

        # Audit log
        audit = AuditLog(
            user_id=admin_id,
            action="UPDATE_DATA",
            table_name="green_challenges",
            record_id=ch_id,
            old_data=None,
            new_data={
                "challenge_id": ch_id,
                "title": ch.title,
                "points_reward": ch.points_reward,
                "is_auto_verify": ch.is_auto_verify,
                "is_active": ch.is_active
            },
            ip_address="127.0.0.1",
            user_agent="Admin Portal Challenge Service",
            request_uri="/api/v1/challenges/admin",
            is_suspicious=False
        )
        db.add(audit)
        await db.commit()
        await db.refresh(ch)
        return ch

    @staticmethod
    async def admin_update_challenge(
        db: AsyncSession,
        challenge_id: str,
        payload: ChallengeUpdateRequest,
        admin_id: uuid.UUID
    ) -> GreenChallenge:
        ch = await db.get(GreenChallenge, challenge_id)
        if not ch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thử thách")

        old_snapshot = {
            "title": ch.title,
            "description": ch.description,
            "points_reward": ch.points_reward,
            "category": ch.category,
            "icon": ch.icon,
            "requirements": ch.requirements,
            "is_auto_verify": ch.is_auto_verify,
            "is_active": ch.is_active,
            "order_index": ch.order_index
        }

        if payload.title is not None:
            ch.title = payload.title
        if payload.description is not None:
            ch.description = payload.description
        if payload.points_reward is not None:
            ch.points_reward = payload.points_reward
        if payload.category is not None:
            ch.category = payload.category
        if payload.icon is not None:
            ch.icon = payload.icon
        if payload.requirements is not None:
            ch.requirements = payload.requirements
        if payload.is_auto_verify is not None:
            ch.is_auto_verify = payload.is_auto_verify
        if payload.is_active is not None:
            ch.is_active = payload.is_active
        if payload.order_index is not None:
            ch.order_index = payload.order_index

        new_snapshot = {
            "title": ch.title,
            "description": ch.description,
            "points_reward": ch.points_reward,
            "category": ch.category,
            "icon": ch.icon,
            "requirements": ch.requirements,
            "is_auto_verify": ch.is_auto_verify,
            "is_active": ch.is_active,
            "order_index": ch.order_index
        }

        audit = AuditLog(
            user_id=admin_id,
            action="UPDATE_DATA",
            table_name="green_challenges",
            record_id=challenge_id,
            old_data=old_snapshot,
            new_data=new_snapshot,
            ip_address="127.0.0.1",
            user_agent="Admin Portal Challenge Service",
            request_uri=f"/api/v1/challenges/admin/{challenge_id}",
            is_suspicious=False
        )
        db.add(audit)
        await db.commit()
        await db.refresh(ch)
        return ch

    @staticmethod
    async def admin_delete_challenge(
        db: AsyncSession,
        challenge_id: str,
        admin_id: uuid.UUID
    ):
        ch = await db.get(GreenChallenge, challenge_id)
        if not ch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thử thách")

        old_data = {"challenge_id": ch.challenge_id, "title": ch.title}
        await db.delete(ch)

        audit = AuditLog(
            user_id=admin_id,
            action="UPDATE_DATA",
            table_name="green_challenges",
            record_id=challenge_id,
            old_data=old_data,
            new_data={"status": "DELETED"},
            ip_address="127.0.0.1",
            user_agent="Admin Portal Challenge Service",
            request_uri=f"/api/v1/challenges/admin/{challenge_id}",
            is_suspicious=False
        )
        db.add(audit)
        await db.commit()

    @staticmethod
    async def admin_toggle_challenge_active(
        db: AsyncSession,
        challenge_id: str,
        admin_id: uuid.UUID
    ) -> bool:
        ch = await db.get(GreenChallenge, challenge_id)
        if not ch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thử thách")

        old_state = ch.is_active
        ch.is_active = not ch.is_active

        audit = AuditLog(
            user_id=admin_id,
            action="UPDATE_DATA",
            table_name="green_challenges",
            record_id=challenge_id,
            old_data={"is_active": old_state},
            new_data={"is_active": ch.is_active},
            ip_address="127.0.0.1",
            user_agent="Admin Portal Challenge Service",
            request_uri=f"/api/v1/challenges/admin/{challenge_id}/toggle-active",
            is_suspicious=False
        )
        db.add(audit)
        await db.commit()
        return ch.is_active

    # ==========================================
    # ADMIN VERIFICATION WORKFLOW (DUYỆT MINH CHỨNG)
    # ==========================================
    @staticmethod
    async def admin_get_submissions(
        db: AsyncSession,
        status_filter: Optional[str] = None,
        week_year: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> AdminSubmissionListResponse:
        # Build query
        q = (
            select(UserChallenge)
            .options(
                selectinload(UserChallenge.user),
                selectinload(UserChallenge.challenge)
            )
            .order_by(
                # Put PENDING on top, then newest created_at
                desc(UserChallenge.status == "PENDING"),
                desc(UserChallenge.created_at)
            )
        )

        if status_filter and status_filter.upper() not in ["ALL", "TẤT CẢ"]:
            q = q.where(UserChallenge.status == status_filter.upper())

        if week_year and week_year.strip():
            q = q.where(UserChallenge.week_year == week_year.strip())

        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.join(User, UserChallenge.user_id == User.user_id).where(
                or_(
                    User.full_name.ilike(term),
                    User.email.ilike(term)
                )
            )

        # Count total
        count_q = select(func.count()).select_from(q.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        # Count pending
        pending_q = select(func.count(UserChallenge.id)).where(UserChallenge.status == "PENDING")
        pending_count = (await db.execute(pending_q)).scalar() or 0

        # Execute page
        q = q.limit(limit).offset(offset)
        res = await db.execute(q)
        subs = res.scalars().all()

        items: List[AdminSubmissionItemResponse] = []
        for s in subs:
            u_name = s.user.full_name if s.user else "Công dân"
            u_email = s.user.email if s.user else ""
            ch_title = s.challenge.title if s.challenge else s.challenge_id
            pts = s.challenge.points_reward if s.challenge else 30

            items.append(
                AdminSubmissionItemResponse(
                    id=str(s.id),
                    user_id=str(s.user_id),
                    user_name=u_name,
                    user_email=u_email,
                    challenge_id=s.challenge_id,
                    challenge_title=ch_title,
                    points_reward=pts,
                    week_year=s.week_year,
                    status=s.status,
                    evidence_image_url=s.evidence_image_url,
                    evidence_note=s.evidence_note,
                    rejection_reason=s.rejection_reason,
                    created_at=s.created_at,
                    completed_at=s.completed_at
                )
            )

        return AdminSubmissionListResponse(
            total=total,
            pending_count=pending_count,
            submissions=items
        )

    @staticmethod
    async def admin_review_submission(
        db: AsyncSession,
        submission_id: uuid.UUID,
        payload: AdminReviewSubmissionRequest,
        admin_user: User
    ) -> AdminReviewSubmissionResponse:
        q = (
            select(UserChallenge)
            .options(
                selectinload(UserChallenge.user),
                selectinload(UserChallenge.challenge)
            )
            .where(UserChallenge.id == submission_id)
        )
        res = await db.execute(q)
        part = res.scalar_one_or_none()
        if not part:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài nộp minh chứng")

        action_norm = payload.action.upper().strip()
        now = datetime.now(timezone.utc)
        pts_awarded = 0

        if action_norm == "APPROVE":
            if part.status == "COMPLETED":
                return AdminReviewSubmissionResponse(
                    submission_id=str(submission_id),
                    action="APPROVE",
                    new_status="COMPLETED",
                    points_awarded=0,
                    message="Bài nộp này đã được duyệt trước đó rồi"
                )

            challenge = part.challenge
            pts = challenge.points_reward if challenge else 30
            part.status = "COMPLETED"
            part.completed_at = now
            part.claimed_at = now
            part.rejection_reason = None
            pts_awarded = pts

            user = part.user or await db.get(User, part.user_id)
            combo_awarded = 0
            if user:
                user.green_points = (user.green_points or 0) + pts
                user.lifetime_points = (user.lifetime_points or 0) + pts

                # Check if all active challenges completed this week (and combo not yet claimed)
                active_ids_q = select(GreenChallenge.challenge_id).where(GreenChallenge.is_active == True)
                active_ids = list((await db.execute(active_ids_q)).scalars().all())
                total_active = len(active_ids)

                if total_active > 0:
                    completed_ids_q = select(UserChallenge.challenge_id).where(
                        and_(
                            UserChallenge.user_id == user.user_id,
                            UserChallenge.week_year == part.week_year,
                            UserChallenge.status == "COMPLETED",
                            UserChallenge.challenge_id.in_(active_ids),
                        )
                    )
                    completed_ids = set((await db.execute(completed_ids_q)).scalars().all())
                    completed_ids.add(part.challenge_id)

                    already_got_combo = await ChallengeService._has_received_weekly_combo(db, user.user_id, part.week_year)
                    if len(completed_ids) >= total_active and not already_got_combo:
                        combo_awarded = 100
                        user.green_points += combo_awarded
                        user.lifetime_points += combo_awarded

                # Create RewardTransaction
                tx = RewardTransaction(
                    user_id=user.user_id,
                    points_amount=pts + combo_awarded,
                    balance_after=user.green_points,
                    transaction_type="CHALLENGE",
                    description=f"Duyệt minh chứng thử thách: {challenge.title if challenge else part.challenge_id}" + (f" (kèm combo +{combo_awarded}đ [Combo {part.week_year}])" if combo_awarded else "")
                )
                db.add(tx)

            # Audit log
            audit = AuditLog(
                user_id=admin_user.user_id,
                action="REWARD_POINTS",
                table_name="user_challenges",
                record_id=str(submission_id),
                old_data={"status": "PENDING"},
                new_data={"status": "COMPLETED", "points_awarded": pts, "combo_awarded": combo_awarded, "citizen_id": str(part.user_id)},
                ip_address="127.0.0.1",
                user_agent="Admin Portal Challenge Verification",
                request_uri=f"/api/v1/challenges/admin/submissions/{submission_id}/review",
                is_suspicious=False
            )
            db.add(audit)
            await db.commit()

            return AdminReviewSubmissionResponse(
                submission_id=str(submission_id),
                action="APPROVE",
                new_status="COMPLETED",
                points_awarded=pts_awarded + combo_awarded,
                message=f"Đã duyệt thành công minh chứng! Cộng +{pts_awarded + combo_awarded} điểm xanh cho công dân."
            )

        elif action_norm == "REJECT":
            reason = payload.rejection_reason or "Minh chứng ảnh mờ hoặc không khớp yêu cầu thử thách"
            old_status = part.status
            part.status = "REJECTED"
            part.rejection_reason = reason

            audit = AuditLog(
                user_id=admin_user.user_id,
                action="UPDATE_DATA",
                table_name="user_challenges",
                record_id=str(submission_id),
                old_data={"status": old_status},
                new_data={"status": "REJECTED", "rejection_reason": reason, "citizen_id": str(part.user_id)},
                ip_address="127.0.0.1",
                user_agent="Admin Portal Challenge Verification",
                request_uri=f"/api/v1/challenges/admin/submissions/{submission_id}/review",
                is_suspicious=False
            )
            db.add(audit)
            await db.commit()

            return AdminReviewSubmissionResponse(
                submission_id=str(submission_id),
                action="REJECT",
                new_status="REJECTED",
                points_awarded=0,
                message="Đã từ chối minh chứng và gửi lý do phản hồi cho công dân."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hành động không hợp lệ (chỉ nhận APPROVE hoặc REJECT)"
            )

