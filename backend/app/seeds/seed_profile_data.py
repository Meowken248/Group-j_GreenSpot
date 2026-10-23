import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
import asyncpg
from app.core.config import settings


async def seed_profile_data():
    print("🚀 Bắt đầu nạp dữ liệu Profile Domain & Green Passport...")

    db_url = os.environ.get("DATABASE_URL", str(settings.DATABASE_URL))
    clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(clean_url)

    # 1. SEED CẤP BẬC CÔNG DÂN XANH (CITIZEN LEVELS)
    print(" 🌱 [1/6] Nạp dữ liệu citizen_levels...")
    levels = [
        (1, "Hạt Mầm", 0, "https://api.iconify.design/twemoji:seedling.svg", 1),
        (2, "Chồi Non", 100, "https://api.iconify.design/twemoji:herb.svg", 2),
        (3, "Cây Xanh", 300, "https://api.iconify.design/twemoji:deciduous-tree.svg", 3),
        (4, "Rừng Xanh", 700, "https://api.iconify.design/twemoji:evergreen-tree.svg", 4),
        (5, "Đại Ngàn", 1500, "https://api.iconify.design/twemoji:national-park.svg", 5),
    ]
    for lvl in levels:
        await conn.execute("""
            INSERT INTO citizen_levels (level_id, level_name, min_points, badge_icon_url, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (level_id) DO UPDATE
            SET level_name = EXCLUDED.level_name,
                min_points = EXCLUDED.min_points,
                badge_icon_url = EXCLUDED.badge_icon_url,
                sort_order = EXCLUDED.sort_order;
        """, lvl[0], lvl[1], lvl[2], lvl[3], lvl[4])

    # 2. SEED HUY HIỆU VINH DANH (BADGES)
    print(" 🏅 [2/6] Nạp dữ liệu badges...")
    badges = [
        (1, "CLEANUP_HERO", "Dũng sĩ làm sạch", "Tham gia 5 hoạt động thu gom và dọn rác", "https://api.iconify.design/fluent-emoji:wastebasket.svg", "Hoàn thành 5 hoạt động dọn rác", 1),
        (2, "GREEN_COMMUTER", "Chiến binh xanh", "Sử dụng phương tiện công cộng hoặc đi bộ 20km", "https://api.iconify.design/fluent-emoji:bicycle.svg", "Tích lũy 20km xanh", 2),
        (3, "RECYCLE_MASTER", "Đại sứ tái chế", "Đem rác tái chế đến các trạm thu gom 10 lần", "https://api.iconify.design/fluent-emoji:recycling-symbol.svg", "Đổi rác lấy quà 10 lần", 3),
        (4, "PLANT_CHAMPION", "Bàn tay xanh", "Trồng hoặc chăm sóc ít nhất 3 cây xanh đô thị", "https://api.iconify.design/fluent-emoji:potted-plant.svg", "Chăm sóc 3 cây xanh", 4),
        (5, "VOICE_PIONEER", "Người tiên phong", "Phản ánh môi trường đầu tiên qua GreenSpot", "https://api.iconify.design/fluent-emoji:megaphone.svg", "Gửi phản ánh môi trường đầu tiên", 5),
    ]
    for b in badges:
        await conn.execute("""
            INSERT INTO badges (badge_id, badge_code, name, description, icon_url, unlock_condition, sort_order, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            ON CONFLICT (badge_id) DO UPDATE
            SET badge_code = EXCLUDED.badge_code,
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                icon_url = EXCLUDED.icon_url,
                unlock_condition = EXCLUDED.unlock_condition,
                sort_order = EXCLUDED.sort_order;
        """, b[0], b[1], b[2], b[3], b[4], b[5], b[6])

    # 3. CẬP NHẬT THÔNG TIN HỒ SƠ NGƯỜI DÙNG (USERS PROFILE)
    print(" 👤 [3/6] Cập nhật thông tin hồ sơ cho users...")
    citizen_uuid = uuid.UUID("44444444-4444-4444-4444-444444444444")
    newbie_uuid = uuid.uuid4()

    # Cập nhật cho tài khoản Công dân mẫu citizen@ecoreport.gov.vn
    await conn.execute("""
        UPDATE users
        SET bio = 'Sống xanh mỗi ngày cùng GreenSpot! Tích cực tham gia bảo vệ môi trường TP.HCM.',
            cover_image_url = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=80',
            avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            reputation_score = 100,
            total_green_points = 450,
            friends_count = 32,
            version = 1,
            activated_at = '2024-02-15 08:30:00+07'
        WHERE email = 'citizen@ecoreport.gov.vn';
    """)

    # Cập nhật cho tài khoản Admin ddatmguyen2023+test@gmail.com
    await conn.execute("""
        UPDATE users
        SET bio = 'Quản trị viên Hệ thống GreenSpot. Lan tỏa lối sống xanh và bảo tồn đô thị sinh thái.',
            cover_image_url = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
            avatar_url = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
            reputation_score = 100,
            total_green_points = 720,
            friends_count = 56,
            version = 1,
            activated_at = '2024-01-10 09:00:00+07'
        WHERE email = 'ddatmguyen2023+test@gmail.com';
    """)

    # Đồng bộ thêm badges, activities và posts cho tài khoản ddatmguyen2023+test@gmail.com nếu tồn tại
    test_user_row = await conn.fetchrow("SELECT user_id FROM users WHERE email = 'ddatmguyen2023+test@gmail.com'")
    test_user_uuid = test_user_row["user_id"] if test_user_row else None

    # Tạo thêm 1 user mới tinh (0 điểm, chưa có bio, chưa có avatar) để kiểm thử Empty States
    await conn.execute("""
        INSERT INTO users (user_id, email, phone_number, password_hash, full_name, role_id, status, reputation_score, total_green_points, friends_count, version, activated_at)
        VALUES ($1, 'newbie@ecoreport.gov.vn', '0901000099', '$2b$12$J8u6e1W2p.6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6', 'Trần Văn Mới', 4, 'ACTIVE', 100, 0, 0, 1, '2024-09-01 10:00:00+07')
        ON CONFLICT (email) DO UPDATE
        SET total_green_points = 0, friends_count = 0, cover_image_url = NULL, bio = NULL;
    """, newbie_uuid)

    # 4. SEED HUY HIỆU NGƯỜI DÙNG (USER BADGES)
    print(" 🎖️ [4/6] Nạp dữ liệu user_badges...")
    target_users_for_badges = [citizen_uuid]
    if test_user_uuid and test_user_uuid != citizen_uuid:
        target_users_for_badges.append(test_user_uuid)

    for target_u in target_users_for_badges:
        await conn.execute("DELETE FROM user_badges WHERE user_id = $1;", target_u)
        citizen_badges = [
            (uuid.uuid4(), target_u, 1, datetime.now(timezone.utc) - timedelta(days=60)),
            (uuid.uuid4(), target_u, 2, datetime.now(timezone.utc) - timedelta(days=45)),
            (uuid.uuid4(), target_u, 3, datetime.now(timezone.utc) - timedelta(days=20)),
            (uuid.uuid4(), target_u, 4, datetime.now(timezone.utc) - timedelta(days=5)),
        ]
        for ub in citizen_badges:
            await conn.execute("""
                INSERT INTO user_badges (user_badge_id, user_id, badge_id, earned_at)
                VALUES ($1, $2, $3, $4);
            """, ub[0], ub[1], ub[2], ub[3])

    # 5. SEED NHẬT KÝ HOẠT ĐỘNG ĐÓNG GÓP (USER ACTIVITIES - 25 hoạt động)
    print(" 📝 [5/6] Nạp 25 hoạt động đóng góp user_activities...")
    for target_u in target_users_for_badges:
        await conn.execute("DELETE FROM user_activities WHERE user_id = $1;", target_u)

    activity_templates = [
        ("REPORT_INCIDENT", "Báo cáo bãi rác tự phát đường Đặng Văn Bi", "Báo cáo kèm ảnh vị trí chính xác, đã được đội thu gom xử lý", 50, 1),
        ("RECYCLING", "Thu gom và phân loại 5kg rác nhựa", "Giao nộp tại Trạm thu gom tái chế Phường Linh Trung", 30, 2),
        ("PLANT_TREE", "Tham gia trồng cây xanh công viên khu phố 4", "Trồng 2 cây sao đen và chăm sóc tưới tiêu", 40, 3),
        ("CHALLENGE", "Hoàn thành thử thách 7 ngày không dùng túi nilon", "Thực hành sử dụng túi vải đi chợ và bình nước cá nhân", 80, 5),
        ("CLEANUP", "Tham gia Chủ nhật xanh nạo vét mương thoát nước", "Đội tình nguyện thanh niên xung kích phường Linh Trung", 60, 7),
        ("COMMUNITY", "Khảo sát và xác minh tình trạng ngập đường Kha Vạn Cân", "Cung cấp tọa độ và mức nước cho bản đồ FloodLens", 25, 9),
        ("SURVEY", "Tham gia khảo sát đánh giá chất lượng không khí", "Góp ý chất lượng môi trường khu dân cư", 0, 10),
        ("REPORT_INCIDENT", "Báo cáo điểm xả nước thải chưa qua xử lý", "Gửi phản ánh khẩn cấp đến cơ quan quản lý", 50, 12),
        ("RECYCLING", "Đổi 10 vỏ pin cũ lấy cây sen đá", "Điểm đổi pin an toàn trường THPT Thủ Đức", 20, 14),
        ("PLANT_TREE", "Gieo mầm vườn rau hữu cơ tại ban công", "Chia sẻ kinh nghiệm ủ phân compost từ rác nhà bếp", 35, 16),
        ("CHALLENGE", "Thử thách 10.000 bước chân bảo vệ môi trường", "Đi bộ thay vì sử dụng xe máy cho cự ly gần", 30, 18),
        ("CLEANUP", "Dọn dẹp làm sạch tuyến hẻm 48 đường số 6", "Phối hợp cùng hội phụ nữ và thanh niên", 40, 20),
        ("COMMUNITY", "Tuyên truyền phân loại rác tại nguồn cho 5 hộ dân", "Phát cẩm nang hướng dẫn phân loại 3 loại rác", 45, 22),
        ("SURVEY", "Ghi nhận chỉ số bụi mịn từ cảm biến cá nhân", "Cập nhật dữ liệu trạm IoT khu vực Linh Tây", 0, 25),
        ("REPORT_INCIDENT", "Báo cáo cành cây gãy đổ chắn lối đi sau mưa bão", "Hỗ trợ đảm bảo an toàn giao thông đô thị", 30, 28),
        ("RECYCLING", "Tái chế thùng xốp và chai nhựa thành chậu hoa", "Làm đẹp hành lang chung cư", 25, 30),
        ("PLANT_TREE", "Trồng cây hoa chuông vàng vỉa hè", "Tạo cảnh quan xanh sạch đẹp", 35, 35),
        ("CLEANUP", "Thu gom chai nhựa trôi nổi ven rạch Linh Tây", "Giúp khơi thông dòng chảy mùa mưa lũ", 50, 40),
        ("COMMUNITY", "Chia sẻ cẩm nang sống xanh tại ngày hội đô thị", "Lan tỏa tinh thần bảo vệ môi trường", 40, 45),
        ("CHALLENGE", "Tháng hành động nói không với cốc nhựa dùng 1 lần", "Sử dụng ly cá nhân khi mua đồ uống", 50, 50),
        ("REPORT_INCIDENT", "Phản ánh xe chở phế thải làm rơi vãi bùn đất", "Đội CSGT và môi trường đã xử lý phương tiện vi phạm", 45, 55),
        ("RECYCLING", "Thu gom 20 vỏ hộp sữa giấy gửi đơn vị tái chế", "Chương trình thu gom vì trẻ em vùng cao", 25, 60),
        ("PLANT_TREE", "Chăm sóc và bảo tồn cây cổ thụ tại Đình thần", "Tỉa cành khô, phòng trừ sâu bệnh", 30, 65),
        ("CLEANUP", "Dọn sạch rác thải bãi đất trống chân cầu Bình Triệu", "Huy động 15 tình nguyện viên tham gia", 60, 70),
        ("COMMUNITY", "Đóng góp sáng kiến tiết kiệm năng lượng tòa nhà", "Được ban quản lý ứng dụng cho toàn khu", 50, 75),
    ]

    for target_u in target_users_for_badges:
        for title_info in activity_templates:
            act_type, title, desc, pts, days_ago = title_info
            act_id = uuid.uuid4()
            created_time = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=2)
            await conn.execute("""
                INSERT INTO user_activities (activity_id, user_id, activity_type, title, description, points, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, act_id, target_u, act_type, title, desc, pts, created_time)

    # 6. SEED BÀI VIẾT TIMELINE (POSTS - 15 bài)
    print(" 📰 [6/6] Nạp 15 bài viết posts cho Timeline...")
    for target_u in target_users_for_badges:
        await conn.execute("DELETE FROM posts WHERE user_id = $1;", target_u)

    post_templates = [
        (
            "Hôm nay mình vừa cùng các bạn đoàn viên tham gia dọn dẹp vệ sinh tại tuyến rạch Linh Trung. Thật vui khi thấy dòng nước trong xanh trở lại sau 3 tiếng làm việc hăng say! Mọi người cùng chung tay giữ gìn vệ sinh chung nhé! 🌱💚",
            '["https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            24, 8, 1
        ),
        (
            "Cây hoa chuông vàng trồng trước cửa nhà tháng trước nay đã đâm chồi nở hoa rực rỡ rồi cả nhà ơi. Thêm một góc xanh là bớt đi một chút khói bụi cho thành phố.",
            '["https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            45, 12, 2
        ),
        (
            "Chia sẻ mẹo phân loại rác hữu cơ tại nhà siêu đơn giản: Mình dùng thùng ủ men vi sinh Bokashi, không hề có mùi hôi và sau 2 tuần là có phân bón hữu cơ tuyệt vời cho rau sạch. Bạn nào quan tâm nhắn mình gửi tài liệu hướng dẫn nha!",
            None,
            "PUBLIC",
            False,
            38, 19, 4
        ),
        (
            "Đây là một bài viết dài hơn 3 dòng để kiểm tra tính năng cắt nội dung trên giao diện dòng thời gian của màn hình Trang cá nhân. Nội dung dòng thứ hai tiếp tục mô tả chi tiết các thử thách xanh mà thành viên đã thực hiện trong suốt tuần qua. Nội dung dòng thứ ba và các dòng kế tiếp sẽ được thu gọn lại kèm theo dấu ba chấm theo đúng yêu cầu đặc tả của hệ thống GreenSpot.",
            '["https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            15, 3, 6
        ),
        (
            "Bài viết này đã được người dùng chọn ẩn khỏi bảng tin công khai. Chỉ có chính chủ mới nhìn thấy bài viết này trên dòng thời gian cá nhân kèm nhãn 'Đã ẩn'.",
            None,
            "PUBLIC",
            True,
            5, 1, 8
        ),
        (
            "Vừa ghé qua trạm tái chế Phường Hiệp Bình Chánh để nộp pin cũ và chai nhựa. Nhận được một chậu sen đá xinh xắn! Rất thích cách làm sáng tạo và thiết thực này của phường.",
            '["https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            31, 7, 10
        ),
        (
            "Mùa mưa này mọi người nhớ theo dõi bản đồ ngập lụt trên GreenSpot trước khi ra đường nha, đặc biệt là đoạn Kha Vạn Cân và Tô Ngọc Vân ngập khá sâu lúc 17h.",
            None,
            "PUBLIC",
            False,
            52, 14, 12
        ),
        (
            "Một buổi sáng đi bộ 5km thay vì đi xe máy, vừa rèn luyện sức khỏe vừa góp phần giảm khí thải CO2. Khởi đầu ngày mới thật nhiều năng lượng!",
            '["https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            27, 4, 15
        ),
        (
            "Thử thách 30 ngày sống không đồ nhựa một lần đã đi được 1/3 chặng đường. Lúc đầu hơi bất tiện nhưng giờ đã thành thói quen không thể thiếu.",
            None,
            "PUBLIC",
            False,
            19, 5, 18
        ),
        (
            "Góc ban công xanh ngát sau cơn mưa chiều. Trồng cây không chỉ lọc không khí mà còn giúp tâm hồn an yên sau những giờ làm việc căng thẳng.",
            '["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            64, 22, 21
        ),
        (
            "Bắt đầu ngày mới với ly cà phê trong bình giữ nhiệt cá nhân. Nói không với ly nhựa mang đi!",
            None,
            "PUBLIC",
            False,
            12, 2, 25
        ),
        (
            "Chiều nay trời trong xanh, chất lượng không khí AQI ở Thủ Đức chỉ ở mức 28 (Tốt). Thời tiết lý tưởng để tập thể dục ngoài trời.",
            '["https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            41, 9, 30
        ),
        (
            "Tổng kết tháng này mình đã tích lũy được hơn 150 điểm xanh trên ứng dụng GreenSpot! Mục tiêu tháng sau là lên cấp Cây Xanh.",
            None,
            "PUBLIC",
            False,
            33, 11, 35
        ),
        (
            "Hình ảnh các em nhỏ khu phố hào hứng cùng nhau gom giấy vụn và bìa carton để tái chế. Tình yêu thiên nhiên cần được ươm mầm từ những việc nhỏ nhất.",
            '["https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80"]',
            "PUBLIC",
            False,
            58, 16, 42
        ),
        (
            "Bài viết đầu tiên của mình khi tham gia mạng xã hội GreenSpot. Xin chào cả nhà và mong được học hỏi thật nhiều kinh nghiệm sống xanh!",
            None,
            "PUBLIC",
            False,
            89, 34, 60
        ),
    ]

    for target_u in target_users_for_badges:
        for p in post_templates:
            content, media, vis, hidden, reacts, comms, days_ago = p
            p_id = uuid.uuid4()
            created_time = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=3)
            await conn.execute("""
                INSERT INTO posts (post_id, user_id, content, media_urls, visibility, is_hidden, reactions_count, comments_count, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
            """, p_id, target_u, content, media, vis, hidden, reacts, comms, created_time)

    await conn.close()
    print("✨ Hoàn tất 100% nạp dữ liệu mẫu cho Chức năng Profile & Green Passport!")


if __name__ == "__main__":
    asyncio.run(seed_profile_data())