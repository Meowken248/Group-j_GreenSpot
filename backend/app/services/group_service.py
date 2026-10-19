import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.group import (
    Group,
    GroupMember,
    GroupInvitation,
    GroupType,
    GroupPrivacy,
    GroupMemberRole,
    GroupMemberStatus,
    GroupStatus,
)
from app.models.rbac import User
from app.schemas.group import GroupCreate, GroupUpdate


VIETNAM_PROVINCES = [
    "Thành phố Hồ Chí Minh",
    "Thành phố Hà Nội",
    "Thành phố Đà Nẵng",
    "Thành phố Hải Phòng",
    "Thành phố Cần Thơ",
    "Tỉnh Bình Dương",
    "Tỉnh Đồng Nai",
    "Tỉnh Bà Rịa - Vũng Tàu",
    "Tỉnh Long An",
    "Tỉnh Tiền Giang",
    "Tỉnh Lâm Đồng",
    "Tỉnh Khánh Hòa",
    "Tỉnh Thừa Thiên Huế",
    "Tỉnh Quảng Nam",
    "Tỉnh Quảng Ninh",
    "Tỉnh Thanh Hóa",
    "Tỉnh Nghệ An",
]

HANOI_DISTRICTS = [
    "Quận Ba Đình",
    "Quận Hoàn Kiếm",
    "Quận Cầu Giấy",
    "Quận Đống Đa",
    "Quận Hai Bà Trưng",
    "Quận Tây Hồ",
    "Quận Thanh Xuân",
    "Quận Hoàng Mai",
    "Quận Long Biên",
    "Quận Nam Từ Liêm",
    "Quận Bắc Từ Liêm",
    "Quận Hà Đông",
    "Thị xã Sơn Tây",
    "Huyện Đông Anh",
    "Huyện Gia Lâm",
    "Huyện Sóc Sơn",
    "Huyện Thanh Trì",
]

DANANG_DISTRICTS = [
    "Quận Hải Châu",
    "Quận Sơn Trà",
    "Quận Thanh Khê",
    "Quận Ngũ Hành Sơn",
    "Quận Liên Chiểu",
    "Quận Cẩm Lệ",
    "Huyện Hòa Vang",
]

CANTHO_DISTRICTS = [
    "Quận Ninh Kiều",
    "Quận Bình Thủy",
    "Quận Cái Răng",
    "Quận Ô Môn",
    "Quận Thốt Nốt",
    "Huyện Phong Điền",
]

HAIPHONG_DISTRICTS = [
    "Quận Hồng Bàng",
    "Quận Ngô Quyền",
    "Quận Lê Chân",
    "Quận Hải An",
    "Quận Kiến An",
    "Quận Đồ Sơn",
    "Huyện Thủy Nguyên",
]

BINHDUONG_DISTRICTS = [
    "TP. Thủ Dầu Một",
    "TP. Dĩ An",
    "TP. Thuận An",
    "TP. Tân Uyên",
    "TP. Bến Cát",
    "Huyện Bàu Bàng",
]

DONGNAI_DISTRICTS = [
    "TP. Biên Hòa",
    "TP. Long Khánh",
    "Huyện Long Thành",
    "Huyện Nhơn Trạch",
    "Huyện Trảng Bom",
]

BARIA_VUNGTAU_DISTRICTS = [
    "TP. Vũng Tàu",
    "TP. Bà Rịa",
    "Thị xã Phú Mỹ",
    "Huyện Côn Đảo",
    "Huyện Long Điền",
]

HCMC_DISTRICTS = [
    "TP. Thủ Đức",
    "Quận 1",
    "Quận 3",
    "Quận 4",
    "Quận 5",
    "Quận 6",
    "Quận 7",
    "Quận 8",
    "Quận 10",
    "Quận 11",
    "Quận 12",
    "Quận Bình Thạnh",
    "Quận Gò Vấp",
    "Quận Phú Nhuận",
    "Quận Tân Bình",
    "Quận Tân Phú",
    "Quận Bình Tân",
    "Huyện Cần Giờ",
    "Huyện Củ Chi",
    "Huyện Hóc Môn",
    "Huyện Nhà Bè",
    "Huyện Bình Chánh",
]

HCMC_WARDS_BY_DISTRICT = {
    "Quận 1": [
        "Phường Bến Nghé",
        "Phường Bến Thành",
        "Phường Cầu Kho",
        "Phường Cầu Ông Lãnh",
        "Phường Cô Giang",
        "Phường Đa Kao",
        "Phường Nguyễn Cư Trinh",
        "Phường Nguyễn Thái Bình",
        "Phường Phạm Ngũ Lão",
        "Phường Tân Định",
    ],
    "Quận 3": [
        "Phường Võ Thị Sáu",
        "Phường 1",
        "Phường 2",
        "Phường 3",
        "Phường 4",
        "Phường 5",
        "Phường 9",
        "Phường 11",
        "Phường 12",
        "Phường 14",
    ],
    "Quận 7": [
        "Phường Tân Thuận Đông",
        "Phường Tân Thuận Tây",
        "Phường Tân Kiểng",
        "Phường Tân Hưng",
        "Phường Bình Thuận",
        "Phường Tân Quy",
        "Phường Phú Thuận",
        "Phường Tân Phú",
        "Phường Tân Phong",
        "Phường Phú Mỹ",
    ],
    "Quận Bình Thạnh": [
        "Phường 1",
        "Phường 2",
        "Phường 3",
        "Phường 5",
        "Phường 6",
        "Phường 7",
        "Phường 11",
        "Phường 12",
        "Phường 13",
        "Phường 14",
        "Phường 15",
        "Phường 17",
        "Phường 19",
        "Phường 21",
        "Phường 22",
        "Phường 24",
        "Phường 25",
        "Phường 26",
        "Phường 27",
        "Phường 28",
    ],
    "TP. Thủ Đức": [
        "Phường Thảo Điền",
        "Phường An Phú",
        "Phường Thủ Thiêm",
        "Phường Hiệp Bình Chánh",
        "Phường Linh Trung",
        "Phường Tăng Nhơn Phú A",
        "Phường Trường Thọ",
    ],
    "Huyện Cần Giờ": [
        "Thị trấn Cần Thạnh",
        "Xã An Thới Đông",
        "Xã Bình Khánh",
        "Xã Long Hòa",
        "Xã Lý Nhơn",
        "Xã Tam Thôn Hiệp",
        "Xã Thạnh An",
    ],
    "Quận Ba Đình": [
        "Phường Cống Vị",
        "Phường Điện Biên",
        "Phường Đội Cấn",
        "Phường Kim Mã",
        "Phường Liễu Giai",
        "Phường Quán Thánh",
    ],
    "Quận Hoàn Kiếm": [
        "Phường Hàng Bạc",
        "Phường Hàng Bài",
        "Phường Hàng Bồ",
        "Phường Hàng Gai",
        "Phường Tràng Tiền",
    ],
    "Quận Hải Châu": [
        "Phường Hải Châu I",
        "Phường Hải Châu II",
        "Phường Thạch Thang",
        "Phường Thanh Bình",
    ],
}

DISTRICTS_BY_PROVINCE = {
    "Thành phố Hồ Chí Minh": HCMC_DISTRICTS,
    "Thành phố Hà Nội": HANOI_DISTRICTS,
    "Thành phố Đà Nẵng": DANANG_DISTRICTS,
    "Thành phố Cần Thơ": CANTHO_DISTRICTS,
    "Thành phố Hải Phòng": HAIPHONG_DISTRICTS,
    "Tỉnh Bình Dương": BINHDUONG_DISTRICTS,
    "Tỉnh Đồng Nai": DONGNAI_DISTRICTS,
    "Tỉnh Bà Rịa - Vũng Tàu": BARIA_VUNGTAU_DISTRICTS,
}

DEFAULT_THEME_TOPICS = [
    "Phân loại rác",
    "Cây xanh",
    "Chống ngập",
    "Tái chế & Zero-waste",
    "Năng lượng sạch",
    "Bảo vệ động vật",
    "Thu gom pin cũ",
    "Làm sạch kênh rạch",
]


class GroupService:
    @staticmethod
    def get_metadata():
        """Lấy danh mục tỉnh thành, quận huyện, phường xã và chủ đề môi trường chuẩn hóa."""
        return {
            "provinces": VIETNAM_PROVINCES,
            "districts_by_province": DISTRICTS_BY_PROVINCE,
            "districts": HCMC_DISTRICTS,
            "wards_by_district": HCMC_WARDS_BY_DISTRICT,
            "theme_topics": DEFAULT_THEME_TOPICS,
        }

    @staticmethod
    async def count_admin_groups(db: AsyncSession, user_id: uuid.UUID) -> int:
        """Đếm số lượng nhóm do người dùng làm Quản trị viên (ADMIN)."""
        stmt = select(func.count(GroupMember.id)).select_from(GroupMember).join(Group).where(
            GroupMember.user_id == user_id,
            GroupMember.role == GroupMemberRole.ADMIN.value,
            GroupMember.status == GroupMemberStatus.ACTIVE.value,
            Group.status == GroupStatus.ACTIVE.value,
            Group.deleted_at.is_(None),
        )
        res = await db.execute(stmt)
        return res.scalar() or 0

    @staticmethod
    async def create_group(
        db: AsyncSession, creator: User, payload: GroupCreate
    ) -> Group:
        """
        Nghiệp vụ tạo nhóm mới theo SRS pp. 137-140:
        1. Giới hạn tối đa 5 nhóm làm Admin.
        2. Ràng buộc hồ sơ địa chỉ đối với nhóm theo khu vực (Quận / Phường).
        3. Kiểm tra tính hợp lệ của phạm vi.
        4. Kiểm tra trùng lặp tên nhóm trong cùng phạm vi.
        5. Tạo nhóm, gán creator làm ADMIN.
        """
        # 1. Kiểm tra giới hạn 5 nhóm
        admin_count = await GroupService.count_admin_groups(db, creator.user_id)
        if admin_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã tạo tối đa 5 nhóm. Hãy giải tán một nhóm để tạo nhóm mới",
            )

        # 2. Ràng buộc cập nhật hồ sơ khi chọn Theo quận / Theo phường
        if payload.group_type in (GroupType.DISTRICT, GroupType.WARD):
            if not creator.district or not creator.district.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng cập nhật địa chỉ trong hồ sơ để tạo nhóm theo khu vực",
                )

        # 3. Kiểm tra trường phạm vi bắt buộc
        if payload.group_type == GroupType.DISTRICT:
            if not payload.district or not payload.district.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn phạm vi cho nhóm",
                )
        elif payload.group_type == GroupType.WARD:
            if not payload.district or not payload.ward:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn phạm vi cho nhóm",
                )
        elif payload.group_type == GroupType.THEME:
            if not payload.theme_topic or not payload.theme_topic.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn phạm vi cho nhóm",
                )

        # Xác định Tỉnh / Thành phố
        province_val = payload.province.strip() if payload.province and payload.province.strip() else None
        if payload.group_type in (GroupType.DISTRICT, GroupType.WARD) and not province_val:
            province_val = "Thành phố Hồ Chí Minh"

        # 4. Kiểm tra trùng tên nhóm trong cùng phạm vi
        dup_query = select(Group).where(
            Group.status == GroupStatus.ACTIVE.value,
            Group.deleted_at.is_(None),
            func.lower(Group.name) == payload.name.strip().lower(),
            Group.group_type == payload.group_type.value,
        )
        if payload.group_type == GroupType.DISTRICT:
            dup_query = dup_query.where(func.lower(Group.district) == payload.district.strip().lower())
            if province_val:
                dup_query = dup_query.where(func.lower(Group.province) == province_val.lower())
        elif payload.group_type == GroupType.WARD:
            dup_query = dup_query.where(
                func.lower(Group.district) == payload.district.strip().lower(),
                func.lower(Group.ward) == payload.ward.strip().lower(),
            )
            if province_val:
                dup_query = dup_query.where(func.lower(Group.province) == province_val.lower())
        elif payload.group_type == GroupType.THEME:
            dup_query = dup_query.where(func.lower(Group.theme_topic) == payload.theme_topic.strip().lower())

        existing_dup = (await db.execute(dup_query)).scalars().first()
        if existing_dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên nhóm đã tồn tại. Vui lòng chọn tên khác",
            )

        # 5. Lưu nhóm mới vào DB
        new_group = Group(
            name=payload.name.strip(),
            description=payload.description,
            cover_image_url=payload.cover_image_url,
            avatar_url=payload.avatar_url,
            group_type=payload.group_type.value,
            province=province_val,
            district=payload.district.strip() if payload.district else None,
            ward=payload.ward.strip() if payload.ward else None,
            theme_topic=payload.theme_topic.strip() if payload.theme_topic else None,
            privacy=payload.privacy.value,
            creator_id=creator.user_id,
            members_count=1,
            posts_count=0,
            status=GroupStatus.ACTIVE.value,
            version=1,
        )
        db.add(new_group)
        await db.flush()

        # Tự động gán người tạo làm Quản trị nhóm (ADMIN)
        admin_member = GroupMember(
            group_id=new_group.group_id,
            user_id=creator.user_id,
            role=GroupMemberRole.ADMIN.value,
            status=GroupMemberStatus.ACTIVE.value,
        )
        db.add(admin_member)
        await db.commit()
        await db.refresh(new_group)
        return new_group

    @staticmethod
    async def get_my_groups(db: AsyncSession, user_id: uuid.UUID) -> Tuple[List[dict], int, int]:
        """Lấy danh sách các nhóm mà người dùng đã tham gia hoặc quản lý."""
        stmt = (
            select(Group, GroupMember.role)
            .join(GroupMember, Group.group_id == GroupMember.group_id)
            .where(
                GroupMember.user_id == user_id,
                GroupMember.status == GroupMemberStatus.ACTIVE.value,
                Group.status == GroupStatus.ACTIVE.value,
                Group.deleted_at.is_(None),
            )
            .options(selectinload(Group.creator))
            .order_by(Group.created_at.desc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        items = []
        admin_count = 0
        for group, role in rows:
            if role == GroupMemberRole.ADMIN.value:
                admin_count += 1
            items.append({
                "group_id": group.group_id,
                "name": group.name,
                "description": group.description,
                "cover_image_url": group.cover_image_url,
                "avatar_url": group.avatar_url,
                "group_type": group.group_type,
                "province": group.province,
                "district": group.district,
                "ward": group.ward,
                "theme_topic": group.theme_topic,
                "privacy": group.privacy,
                "creator_id": group.creator_id,
                "creator_name": group.creator.full_name if group.creator else None,
                "members_count": group.members_count,
                "posts_count": group.posts_count,
                "status": group.status,
                "version": group.version,
                "created_at": group.created_at,
                "is_member": True,
                "my_role": role,
            })

        return items, len(items), admin_count

    @staticmethod
    async def explore_groups(
        db: AsyncSession,
        user_id: uuid.UUID,
        group_type: Optional[str] = None,
        province: Optional[str] = None,
        district: Optional[str] = None,
        ward: Optional[str] = None,
        theme_topic: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[dict], int]:
        """Khám phá các nhóm cộng đồng hoạt động theo bộ lọc."""
        stmt = (
            select(Group)
            .where(
                Group.status == GroupStatus.ACTIVE.value,
                Group.deleted_at.is_(None),
            )
            .options(selectinload(Group.creator))
        )

        if group_type:
            stmt = stmt.where(Group.group_type == group_type)
        if province:
            stmt = stmt.where(Group.province == province)
        if district:
            stmt = stmt.where(Group.district == district)
        if ward:
            stmt = stmt.where(Group.ward == ward)
        if theme_topic:
            stmt = stmt.where(Group.theme_topic == theme_topic)
        if query and query.strip():
            stmt = stmt.where(Group.name.ilike(f"%{query.strip()}%"))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(Group.members_count.desc(), Group.created_at.desc()).limit(limit).offset(offset)
        groups = (await db.execute(stmt)).scalars().all()

        # Kiểm tra xem user có phải là member của nhóm nào không
        group_ids = [g.group_id for g in groups]
        user_memberships = {}
        if group_ids:
            mem_stmt = select(GroupMember.group_id, GroupMember.role).where(
                GroupMember.user_id == user_id,
                GroupMember.group_id.in_(group_ids),
                GroupMember.status == GroupMemberStatus.ACTIVE.value,
            )
            mem_rows = (await db.execute(mem_stmt)).all()
            user_memberships = {row[0]: row[1] for row in mem_rows}

        items = []
        for g in groups:
            my_role = user_memberships.get(g.group_id)
            items.append({
                "group_id": g.group_id,
                "name": g.name,
                "description": g.description,
                "cover_image_url": g.cover_image_url,
                "avatar_url": g.avatar_url,
                "group_type": g.group_type,
                "province": g.province,
                "district": g.district,
                "ward": g.ward,
                "theme_topic": g.theme_topic,
                "privacy": g.privacy,
                "creator_id": g.creator_id,
                "creator_name": g.creator.full_name if g.creator else None,
                "members_count": g.members_count,
                "posts_count": g.posts_count,
                "status": g.status,
                "version": g.version,
                "created_at": g.created_at,
                "is_member": my_role is not None,
                "my_role": my_role,
            })

        return items, total

    @staticmethod
    async def get_group_detail(
        db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
    ) -> dict:
        """Chi tiết một nhóm cộng đồng."""
        stmt = (
            select(Group)
            .where(Group.group_id == group_id, Group.deleted_at.is_(None))
            .options(selectinload(Group.creator))
        )
        group = (await db.execute(stmt)).scalars().first()
        if not group or group.status == GroupStatus.DISBANDED.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Nhóm không còn tồn tại"
            )

        # Lấy trạng thái của current user
        mem_stmt = select(GroupMember.role, GroupMember.status).where(
            GroupMember.group_id == group_id, GroupMember.user_id == user_id
        )
        mem = (await db.execute(mem_stmt)).first()

        return {
            "group_id": group.group_id,
            "name": group.name,
            "description": group.description,
            "cover_image_url": group.cover_image_url,
            "avatar_url": group.avatar_url,
            "group_type": group.group_type,
            "province": group.province,
            "district": group.district,
            "ward": group.ward,
            "theme_topic": group.theme_topic,
            "privacy": group.privacy,
            "creator_id": group.creator_id,
            "creator_name": group.creator.full_name if group.creator else None,
            "members_count": group.members_count,
            "posts_count": group.posts_count,
            "status": group.status,
            "version": group.version,
            "created_at": group.created_at,
            "is_member": mem is not None and mem[1] == GroupMemberStatus.ACTIVE.value,
            "my_role": mem[0] if mem else None,
        }

    @staticmethod
    async def disband_group(
        db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID, confirmation_name: str
    ):
        """
        Nghiệp vụ Giải tán nhóm theo SRS pp. 140-141:
        1. Nhóm phải tồn tại và chưa bị giải tán trước đó.
        2. Người thực hiện phải là Quản trị nhóm (ADMIN).
        3. Tên xác nhận phải khớp hoàn toàn với tên nhóm.
        4. Soft delete nhóm, set status = DISBANDED, xóa thành viên.
        """
        group = await db.get(Group, group_id)
        if not group or group.deleted_at is not None or group.status == GroupStatus.DISBANDED.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Nhóm không còn tồn tại"
            )

        # Kiểm tra quyền ADMIN
        mem_stmt = select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == user_id
        )
        member = (await db.execute(mem_stmt)).scalars().first()
        if not member or member.role != GroupMemberRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền giải tán nhóm này",
            )

        # Kiểm tra tên nhóm xác nhận
        if confirmation_name.strip() != group.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên nhóm không khớp",
            )

        # Thực hiện soft delete nhóm và thành viên
        group.status = GroupStatus.DISBANDED.value
        group.deleted_at = datetime.now(timezone.utc)
        group.version += 1

        # Cập nhật soft delete cho các thành viên
        await db.execute(
            text("UPDATE group_members SET deleted_at = NOW() WHERE group_id = :gid"),
            {"gid": group_id},
        )
        await db.commit()
        return {"message": "Đã giải tán nhóm"}

    @staticmethod
    async def invite_friends(
        db: AsyncSession, group_id: uuid.UUID, inviter_id: uuid.UUID, friend_ids: List[uuid.UUID]
    ):
        """Mời bạn bè vào nhóm (Màn 3 sau khi tạo nhóm)."""
        group = await db.get(Group, group_id)
        if not group or group.deleted_at is not None or group.status == GroupStatus.DISBANDED.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Nhóm không còn tồn tại"
            )

        count = 0
        for fid in friend_ids:
            # Kiểm tra xem đã là member hoặc đã có invitation chưa
            existing = (await db.execute(
                select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == fid)
            )).first()
            if not existing:
                inv = GroupInvitation(
                    group_id=group_id,
                    inviter_id=inviter_id,
                    invitee_id=fid,
                    status="PENDING",
                )
                db.add(inv)
                count += 1

        await db.commit()
        return {"message": f"Đã gửi lời mời cho {count} người bạn"}

    @staticmethod
    async def join_group(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID):
        """Tham gia nhóm."""
        group = await db.get(Group, group_id)
        if not group or group.deleted_at is not None or group.status == GroupStatus.DISBANDED.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Nhóm không còn tồn tại"
            )

        existing = (await db.execute(
            select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        )).scalars().first()

        if existing:
            if existing.status == GroupMemberStatus.ACTIVE.value:
                return {"message": "Bạn đã là thành viên của nhóm này"}
            existing.status = GroupMemberStatus.ACTIVE.value
            group.members_count += 1
        else:
            new_mem = GroupMember(
                group_id=group_id,
                user_id=user_id,
                role=GroupMemberRole.MEMBER.value,
                status=GroupMemberStatus.ACTIVE.value,
            )
            db.add(new_mem)
            group.members_count += 1

        await db.commit()
        return {"message": "Tham gia nhóm thành công"}

    @staticmethod
    async def leave_group(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID):
        """Rời nhóm (ngăn cản nếu là ADMIN duy nhất)."""
        group = await db.get(Group, group_id)
        if not group or group.deleted_at is not None or group.status == GroupStatus.DISBANDED.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Nhóm không còn tồn tại"
            )

        mem = (await db.execute(
            select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        )).scalars().first()

        if not mem:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Bạn không phải là thành viên của nhóm này"
            )

        if mem.role == GroupMemberRole.ADMIN.value:
            # Kiểm tra xem có admin nào khác không
            other_admin = (await db.execute(
                select(GroupMember).where(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id != user_id,
                    GroupMember.role == GroupMemberRole.ADMIN.value,
                    GroupMember.status == GroupMemberStatus.ACTIVE.value,
                )
            )).first()
            if not other_admin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bạn là quản trị nhóm duy nhất. Hãy chuyển quyền quản trị cho thành viên khác trước khi rời",
                )

        await db.delete(mem)
        group.members_count = max(0, group.members_count - 1)
        await db.commit()
        return {"message": "Đã rời nhóm thành công"}
