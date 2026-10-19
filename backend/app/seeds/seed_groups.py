"""
GreenSpot Domain Seeder: Nhóm Cộng Đồng Theo Quận, Phường hoặc Chủ Đề (Feature STT 16)
Khởi tạo dữ liệu mẫu phong phú phục vụ kiểm thử và giao diện:
- Nhóm theo Quận (DISTRICT): 'Cộng Đồng Sống Xanh Quận 1'
- Nhóm theo Phường (WARD): 'Khu Phố Xanh Phường Bến Nghé'
- Nhóm theo Chủ đề (THEME): 'Biệt Đội Phân Loại Rác Tái Chế'
- Gán vai trò Quản trị nhóm (ADMIN) cho người tạo, và thành viên (MEMBER) cho các tài khoản khác
- Tạo lời mời bạn bè mẫu (PENDING)
"""

import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
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


SAMPLE_GROUPS_DATA = [
    {
        "group_id": uuid.UUID("77777777-0001-0000-0000-000000000001"),
        "name": "Cộng Đồng Sống Xanh Quận 1",
        "description": "Nhóm giao lưu, chia sẻ thông tin phân loại rác và bảo vệ môi trường đô thị tại Quận 1, TP.HCM.",
        "cover_image_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
        "avatar_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=200&q=80",
        "group_type": GroupType.DISTRICT.value,
        "district": "Quận 1",
        "ward": None,
        "theme_topic": None,
        "privacy": GroupPrivacy.PUBLIC.value,
    },
    {
        "group_id": uuid.UUID("77777777-0002-0000-0000-000000000002"),
        "name": "Khu Phố Xanh Phường Bến Nghé",
        "description": "Cư dân phường Bến Nghé cùng hành động vì không gian sống xanh sạch đẹp, giảm thiểu rác thải nhựa.",
        "cover_image_url": "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80",
        "avatar_url": "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=200&q=80",
        "group_type": GroupType.WARD.value,
        "district": "Quận 1",
        "ward": "Phường Bến Nghé",
        "theme_topic": None,
        "privacy": GroupPrivacy.PUBLIC.value,
    },
    {
        "group_id": uuid.UUID("77777777-0003-0000-0000-000000000003"),
        "name": "Biệt Đội Phân Loại Rác Tái Chế",
        "description": "Tập hợp những người yêu lối sống không rác thải (Zero-waste), tái chế pin, đồ nhựa và rác điện tử.",
        "cover_image_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
        "avatar_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=200&q=80",
        "group_type": GroupType.THEME.value,
        "district": None,
        "ward": None,
        "theme_topic": "Phân loại rác",
        "privacy": GroupPrivacy.PUBLIC.value,
    },
]


async def seed_groups():
    print("🌱 Bắt đầu nạp dữ liệu mẫu cho Chức năng 16: Nhóm cộng đồng...")
    async with AsyncSessionLocal() as session:
        # 1. Tìm hoặc lấy danh sách users mẫu
        res = await session.execute(
            select(User).order_by(User.created_at.asc()).limit(10)
        )
        users = res.scalars().all()
        if not users:
            print("❌ Chưa có người dùng trong hệ thống. Vui lòng chạy seeder người dùng trước!")
            return

        admin_user = users[0]
        # Cập nhật district cho admin_user nếu chưa có
        if not admin_user.district:
            admin_user.district = "Quận 1"
            session.add(admin_user)
            await session.commit()

        # 2. Tạo các nhóm mẫu
        for item in SAMPLE_GROUPS_DATA:
            existing_group = await session.get(Group, item["group_id"])
            if not existing_group:
                group = Group(
                    group_id=item["group_id"],
                    name=item["name"],
                    description=item["description"],
                    cover_image_url=item["cover_image_url"],
                    avatar_url=item["avatar_url"],
                    group_type=item["group_type"],
                    district=item["district"],
                    ward=item["ward"],
                    theme_topic=item["theme_topic"],
                    privacy=item["privacy"],
                    creator_id=admin_user.user_id,
                    members_count=len(users[:4]),
                    posts_count=2,
                    status=GroupStatus.ACTIVE.value,
                    version=1,
                )
                session.add(group)
                await session.flush()

                # Gán người tạo làm ADMIN
                creator_member = GroupMember(
                    group_id=group.group_id,
                    user_id=admin_user.user_id,
                    role=GroupMemberRole.ADMIN.value,
                    status=GroupMemberStatus.ACTIVE.value,
                )
                session.add(creator_member)

                # Gán thêm các thành viên khác
                for other_user in users[1:4]:
                    member = GroupMember(
                        group_id=group.group_id,
                        user_id=other_user.user_id,
                        role=GroupMemberRole.MEMBER.value,
                        status=GroupMemberStatus.ACTIVE.value,
                    )
                    session.add(member)

                print(f"✅ Đã tạo nhóm mẫu: '{group.name}' ({group.group_type}) kèm thành viên.")
            else:
                print(f"ℹ️ Nhóm '{existing_group.name}' đã tồn tại, bỏ qua.")

        await session.commit()
    print("🎉 Hoàn tất nạp dữ liệu mẫu Chức năng 16!")


if __name__ == "__main__":
    asyncio.run(seed_groups())
