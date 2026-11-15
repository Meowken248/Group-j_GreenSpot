import uuid
from typing import Optional, List
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rbac import User
from app.models.leaderboard import CommunityGroup, DistrictEnvironmentalStat
from app.services.reward_service import calculate_tier_details
from app.schemas.leaderboard import (
    IndividualLeaderboardItem,
    MyRankResponse,
    IndividualLeaderboardResponse,
    GroupLeaderboardItem,
    GroupLeaderboardResponse,
    DistrictLeaderboardItem,
    DistrictLeaderboardResponse,
)

class LeaderboardService:
    @staticmethod
    async def get_individual_leaderboard(
        db: AsyncSession,
        current_user_id: Optional[uuid.UUID] = None
    ) -> IndividualLeaderboardResponse:
        # Top 10 citizens by green_points
        q = select(User).where(User.status == "ACTIVE").order_by(desc(User.green_points)).limit(10)
        res = await db.execute(q)
        top_users = res.scalars().all()

        top_10: List[IndividualLeaderboardItem] = []
        for rank_idx, u in enumerate(top_users, start=1):
            tier, _, _, _ = calculate_tier_details(u.green_points)
            badge_icon = "🥇" if rank_idx == 1 else "🥈" if rank_idx == 2 else "🥉" if rank_idx == 3 else "🎖️"
            top_10.append(
                IndividualLeaderboardItem(
                    rank=rank_idx,
                    user_id=u.user_id,
                    full_name=u.full_name,
                    avatar_url=u.avatar_url,
                    green_points=u.green_points,
                    tier_name=tier.tier_name,
                    tier_code=tier.tier_code,
                    badge_icon=badge_icon
                )
            )

        my_rank_info: Optional[MyRankResponse] = None
        if current_user_id:
            me = await db.get(User, current_user_id)
            if me:
                # Count total active citizens
                total_q = select(func.count(User.user_id)).where(User.status == "ACTIVE")
                total_citizens = (await db.execute(total_q)).scalar() or 1

                # Calculate my rank: users with strictly more points + 1
                rank_q = select(func.count(User.user_id)).where(
                    User.status == "ACTIVE",
                    User.green_points > me.green_points
                )
                my_rank = ((await db.execute(rank_q)).scalar() or 0) + 1

                tier, _, _, _ = calculate_tier_details(me.green_points)
                is_top_10 = my_rank <= 10

                # 100th user points
                top_100_q = select(User.green_points).where(User.status == "ACTIVE").order_by(desc(User.green_points)).offset(99).limit(1)
                p_100 = (await db.execute(top_100_q)).scalar() or 0
                points_to_top_100 = max(0, p_100 - me.green_points + 10) if my_rank > 100 else 0

                msg = "Chúc mừng bạn đang nằm trong Top 10 Công dân Xanh xuất sắc!" if is_top_10 else None

                my_rank_info = MyRankResponse(
                    is_logged_in=True,
                    rank=my_rank,
                    total_citizens=total_citizens,
                    green_points=me.green_points,
                    points_to_top_100=points_to_top_100,
                    is_top_10=is_top_10,
                    tier_name=tier.tier_name,
                    message=msg
                )

        return IndividualLeaderboardResponse(
            top_10=top_10,
            my_rank=my_rank_info
        )

    @staticmethod
    async def get_group_leaderboard(
        db: AsyncSession,
        cycle: str = "WEEK"
    ) -> GroupLeaderboardResponse:
        norm_cycle = cycle.upper()
        if norm_cycle not in ["WEEK", "MONTH", "ALL"]:
            norm_cycle = "WEEK"

        q = select(CommunityGroup).where(CommunityGroup.is_active == True)
        if norm_cycle == "WEEK":
            q = q.order_by(desc(CommunityGroup.weekly_points))
        elif norm_cycle == "MONTH":
            q = q.order_by(desc(CommunityGroup.monthly_points))
        else:
            q = q.order_by(desc(CommunityGroup.total_points))

        res = await db.execute(q)
        groups = res.scalars().all()

        items: List[GroupLeaderboardItem] = []
        for idx, g in enumerate(groups, start=1):
            pts = g.weekly_points if norm_cycle == "WEEK" else g.monthly_points if norm_cycle == "MONTH" else g.total_points
            items.append(
                GroupLeaderboardItem(
                    rank=idx,
                    group_id=g.group_id,
                    name=g.name,
                    avatar_url=g.avatar_url,
                    description=g.description,
                    member_count=g.member_count,
                    points=pts,
                    is_user_group=(idx == 1) # Demo highlighting
                )
            )

        return GroupLeaderboardResponse(
            cycle=norm_cycle,
            groups=items
        )

    @staticmethod
    async def get_district_leaderboard(
        db: AsyncSession,
        cycle: str = "WEEK"
    ) -> DistrictLeaderboardResponse:
        norm_cycle = cycle.upper()
        if norm_cycle not in ["WEEK", "MONTH", "ALL"]:
            norm_cycle = "WEEK"

        q = select(DistrictEnvironmentalStat).order_by(desc(DistrictEnvironmentalStat.green_index))
        res = await db.execute(q)
        districts = res.scalars().all()

        items: List[DistrictLeaderboardItem] = []
        for idx, d in enumerate(districts, start=1):
            items.append(
                DistrictLeaderboardItem(
                    rank=idx,
                    district_code=d.district_code,
                    district_name=d.district_name,
                    green_index=d.green_index,
                    cleanup_rate=d.cleanup_rate,
                    resolved_incidents=d.resolved_incidents,
                    is_user_district=(d.district_code == "BINH_THANH") # Demo user district highlighting
                )
            )

        return DistrictLeaderboardResponse(
            cycle=norm_cycle,
            districts=items
        )
