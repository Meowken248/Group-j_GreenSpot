"""
GreenSpot Domain Seeder: Miền Kết bạn và Theo dõi (Feature STT 6)
Khởi tạo dữ liệu mẫu phong phú phục vụ kiểm thử và giao diện:
- Lời mời kết bạn (Friend Requests - PENDING)
- Quan hệ Bạn bè chính thức (Friendships)
- Danh sách Đang theo dõi (User Follows)
- Tài khoản bạn bè có trạng thái bình thường và tài khoản bị tạm khóa (SUSPENDED)
- Dữ liệu gợi ý kết bạn kèm quận/huyện và số bạn chung
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta
import asyncpg
from app.core.config import settings


# Định nghĩa danh sách người dùng mẫu chuyên biệt cho module Kết bạn
SAMPLE_FRIEND_USERS = [
    # 1. Người gửi lời mời kết bạn (Pending Requests)
    {
        "user_id": uuid.UUID("66666666-0001-0000-0000-000000000001"),
        "email": "req_an@ecoreport.gov.vn",
        "phone_number": "0909000001",
        "full_name": "Nguyễn Văn An",
        "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        "bio": "Tình nguyện viên dọn rác kênh Nhiêu Lộc",
        "status": "ACTIVE",
        "total_green_points": 340,
        "friends_count": 12,
        "role_id": 4,
        "district": "Quận 1",
    },
    {
        "user_id": uuid.UUID("66666666-0002-0000-0000-000000000002"),
        "email": "req_mai@ecoreport.gov.vn",
        "phone_number": "0909000002",
        "full_name": "Trần Thị Mai",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
        "bio": "Đại sứ xanh TP. Thủ Đức, yêu thích lối sống Zero-waste",
        "status": "ACTIVE",
        "total_green_points": 580,
        "friends_count": 45,
        "role_id": 4,
        "district": "TP. Thủ Đức",
    },
    {
        "user_id": uuid.UUID("66666666-0003-0000-0000-000000000003"),
        "email": "req_phuc@ecoreport.gov.vn",
        "phone_number": "0909000003",
        "full_name": "Lê Hoàng Phúc",
        "avatar_url": None, # Kiểm thử fallback avatar không ảnh
        "bio": "Thành viên CLB Tái chế nhựa Bình Thạnh",
        "status": "ACTIVE",
        "total_green_points": 120,
        "friends_count": 5,
        "role_id": 4,
        "district": "Quận Bình Thạnh",
    },

    # 2. Bạn bè hiện tại (Active Friends)
    {
        "user_id": uuid.UUID("66666666-0004-0000-0000-000000000004"),
        "email": "friend_tuan@ecoreport.gov.vn",
        "phone_number": "0909000004",
        "full_name": "Hoàng Văn Tuấn",
        "avatar_url": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
        "bio": "Chuyên gia giám sát trạm IoT chất lượng không khí",
        "status": "ACTIVE",
        "total_green_points": 820,
        "friends_count": 78,
        "role_id": 4,
        "district": "TP. Thủ Đức",
    },
    {
        "user_id": uuid.UUID("66666666-0005-0000-0000-000000000005"),
        "email": "friend_ngan@ecoreport.gov.vn",
        "phone_number": "0909000005",
        "full_name": "Đỗ Bích Ngân",
        "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
        "bio": "Thành viên tích cực chương trình Đổi rác lấy quà",
        "status": "ACTIVE",
        "total_green_points": 460,
        "friends_count": 32,
        "role_id": 4,
        "district": "Quận 1",
    },
    {
        "user_id": uuid.UUID("66666666-0006-0000-0000-000000000006"),
        "email": "friend_tri@ecoreport.gov.vn",
        "phone_number": "0909000006",
        "full_name": "Nguyễn Công Trí",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "bio": "Tình nguyện viên điều phối trạm thu gom rác điện tử",
        "status": "ACTIVE",
        "total_green_points": 610,
        "friends_count": 50,
        "role_id": 4,
        "district": "Quận Bình Thạnh",
    },
    {
        "user_id": uuid.UUID("66666666-0007-0000-0000-000000000007"),
        "email": "friend_dung_locked@ecoreport.gov.vn",
        "phone_number": "0909000007",
        "full_name": "Bùi Tiến Dũng (Tài khoản bị khóa)",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        "bio": "Tài khoản đang bị tạm ngưng do vi phạm tiêu chuẩn cộng đồng",
        "status": "SUSPENDED", # Test trạng thái tài khoản bị khóa theo đặc tả
        "total_green_points": 90,
        "friends_count": 10,
        "role_id": 4,
        "district": "Huyện Bình Chánh",
    },

    # 3. Gợi ý công dân xanh & Đang theo dõi (Suggestions & Following)
    {
        "user_id": uuid.UUID("66666666-0008-0000-0000-000000000008"),
        "email": "sug_duc@ecoreport.gov.vn",
        "phone_number": "0909000008",
        "full_name": "Phạm Minh Đức",
        "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80",
        "bio": "Khảo sát viên đo đạc triều cường và ngập úng",
        "status": "ACTIVE",
        "total_green_points": 450,
        "friends_count": 22,
        "role_id": 4,
        "district": "Quận 7",
    },
    {
        "user_id": uuid.UUID("66666666-0009-0000-0000-000000000009"),
        "email": "sug_nam_followed@ecoreport.gov.vn",
        "phone_number": "0909000009",
        "full_name": "Võ Hoàng Nam",
        "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
        "bio": "Nhiếp ảnh gia môi trường đô thị Sài Gòn",
        "status": "ACTIVE",
        "total_green_points": 320,
        "friends_count": 19,
        "role_id": 4,
        "district": "Quận 3",
    },
    {
        "user_id": uuid.UUID("66666666-0010-0000-0000-000000000010"),
        "email": "sug_yen@ecoreport.gov.vn",
        "phone_number": "0909000010",
        "full_name": "Đặng Hải Yến",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        "bio": "Sáng lập viên dự án Mầm Xanh Ban Công",
        "status": "ACTIVE",
        "total_green_points": 580,
        "friends_count": 64,
        "role_id": 4,
        "district": "Quận Tân Bình",
    },
]


async def seed_friends_data():
    """Hàm nạp dữ liệu mẫu miền Kết bạn và Theo dõi (Feature STT 6)"""
    print("🤝 Bắt đầu nạp dữ liệu mẫu miền Kết bạn và Theo dõi (Feature STT 6)...")
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    try:
        # Đảm bảo các tài khoản kiểm thử chính tồn tại
        default_pwd_hash = "$2b$12$J8u6e1W2p.6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6"
        citizen_uuid = uuid.UUID("44444444-4444-4444-4444-444444444444")
        test_uuid = uuid.UUID("55555555-5555-5555-5555-555555555555")

        await conn.execute("""
            INSERT INTO users (
                user_id, email, phone_number, password_hash, full_name, role_id, status, reputation_score, total_green_points, friends_count, version, activated_at
            ) VALUES ($1, 'citizen@ecoreport.gov.vn', '0901000004', $2, 'Nguyễn Thành Đạt (Công dân)', 4, 'ACTIVE', 100, 720, 0, 1, now())
            ON CONFLICT (email) DO NOTHING;
        """, citizen_uuid, default_pwd_hash)

        await conn.execute("""
            INSERT INTO users (
                user_id, email, phone_number, password_hash, full_name, role_id, status, reputation_score, total_green_points, friends_count, version, activated_at
            ) VALUES ($1, 'ddatmguyen2023+test@gmail.com', '0901000005', $2, 'Nguyễn Thành Đạt', 1, 'ACTIVE', 100, 720, 0, 1, now())
            ON CONFLICT (email) DO NOTHING;
        """, test_uuid, default_pwd_hash)

        # 1. Tìm hoặc xác định danh sách các tài khoản người dùng chính (để tạo quan hệ bạn bè)
        target_emails = [
            "citizen@ecoreport.gov.vn",
            "ddatmguyen2023+test@gmail.com"
        ]
        
        main_user_uuids = []
        for em in target_emails:
            row = await conn.fetchrow("SELECT user_id FROM users WHERE email = $1", em)
            if row:
                main_user_uuids.append(row["user_id"])

        # 2. Đảm bảo các SAMPLE_FRIEND_USERS tồn tại trong bảng users
        print(" 👤 [1/4] Đảm bảo 10 tài khoản mẫu tồn tại...")
        default_pwd_hash = "$2b$12$J8u6e1W2p.6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6"

        for u in SAMPLE_FRIEND_USERS:
            await conn.execute("""
                INSERT INTO users (
                    user_id, email, phone_number, password_hash, full_name, avatar_url,
                    bio, status, total_green_points, friends_count, role_id, reputation_score, version, activated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 100, 1, now())
                ON CONFLICT (email) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    avatar_url = EXCLUDED.avatar_url,
                    bio = EXCLUDED.bio,
                    status = EXCLUDED.status,
                    total_green_points = EXCLUDED.total_green_points,
                    friends_count = EXCLUDED.friends_count;
            """, u["user_id"], u["email"], u["phone_number"], default_pwd_hash,
                 u["full_name"], u["avatar_url"], u["bio"], u["status"],
                 u["total_green_points"], u["friends_count"], u["role_id"])

        # 3. Nạp Lời mời kết bạn (Friend Requests - PENDING)
        print(" 📩 [2/4] Nạp các lời mời kết bạn PENDING...")
        # Người 1, 2, 3 gửi lời mời kết bạn tới các main user
        request_senders = [
            SAMPLE_FRIEND_USERS[0]["user_id"], # Nguyễn Văn An
            SAMPLE_FRIEND_USERS[1]["user_id"], # Trần Thị Mai
            SAMPLE_FRIEND_USERS[2]["user_id"], # Lê Hoàng Phúc
        ]

        for target_u in main_user_uuids:
            for sender_u in request_senders:
                if target_u == sender_u:
                    continue
                # Xóa request cũ nếu có để tránh trùng
                await conn.execute("""
                    DELETE FROM friend_requests
                    WHERE sender_id = $1 AND receiver_id = $2;
                """, sender_u, target_u)

                await conn.execute("""
                    INSERT INTO friend_requests (
                        request_id, sender_id, receiver_id, status, created_at, updated_at
                    ) VALUES ($1, $2, $3, 'PENDING', now() - INTERVAL '2 hours', now());
                """, uuid.uuid4(), sender_u, target_u)

        # 4. Nạp Danh sách Bạn bè chính thức (Friendships)
        print(" 👫 [3/4] Nạp danh sách bạn bè 2 chiều...")
        # Người 4, 5, 6, 7 là bạn của main user
        friend_uuids = [
            SAMPLE_FRIEND_USERS[3]["user_id"], # Hoàng Văn Tuấn
            SAMPLE_FRIEND_USERS[4]["user_id"], # Đỗ Bích Ngân
            SAMPLE_FRIEND_USERS[5]["user_id"], # Nguyễn Công Trí
            SAMPLE_FRIEND_USERS[6]["user_id"], # Bùi Tiến Dũng (SUSPENDED)
        ]

        for target_u in main_user_uuids:
            for fr_u in friend_uuids:
                if target_u == fr_u:
                    continue
                # Chuẩn hóa thứ tự canonical: u1 < u2
                u1 = min(target_u, fr_u)
                u2 = max(target_u, fr_u)

                await conn.execute("""
                    DELETE FROM friendships
                    WHERE user_id_1 = $1 AND user_id_2 = $2;
                """, u1, u2)

                await conn.execute("""
                    INSERT INTO friendships (
                        friendship_id, user_id_1, user_id_2, created_at
                    ) VALUES ($1, $2, $3, now() - INTERVAL '10 days');
                """, uuid.uuid4(), u1, u2)

            # Cập nhật số lượng bạn bè cho main user
            actual_count = await conn.fetchval("""
                SELECT COUNT(*) FROM friendships
                WHERE (user_id_1 = $1 OR user_id_2 = $1) AND deleted_at IS NULL;
            """, target_u)
            await conn.execute("UPDATE users SET friends_count = $1 WHERE user_id = $2", actual_count, target_u)

        # 5. Nạp Danh sách Theo dõi một chiều (User Follows)
        print(" 👁️ [4/4] Nạp danh sách Đang theo dõi...")
        # Main user đang theo dõi người 8, 9
        following_uuids = [
            SAMPLE_FRIEND_USERS[7]["user_id"], # Phạm Minh Đức
            SAMPLE_FRIEND_USERS[8]["user_id"], # Võ Hoàng Nam
        ]

        for target_u in main_user_uuids:
            for fol_u in following_uuids:
                if target_u == fol_u:
                    continue
                await conn.execute("""
                    DELETE FROM user_follows
                    WHERE follower_id = $1 AND following_id = $2;
                """, target_u, fol_u)

                await conn.execute("""
                    INSERT INTO user_follows (
                        follow_id, follower_id, following_id, created_at
                    ) VALUES ($1, $2, $3, now() - INTERVAL '3 days');
                """, uuid.uuid4(), target_u, fol_u)

        print("✅ Nạp dữ liệu mẫu miền Kết bạn và Theo dõi (Feature STT 6) THÀNH CÔNG!")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_friends_data())
