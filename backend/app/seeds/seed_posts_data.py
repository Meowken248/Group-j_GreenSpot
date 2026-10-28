"""
GreenSpot Domain Seeder: Miền Đăng bài cộng đồng kèm toạ độ và gắn thẻ (Feature STT 9)
Khởi tạo dữ liệu mẫu phong phú phục vụ kiểm thử và giao diện:
- Bài viết kèm tọa độ GPS thực tế tại TP.HCM (Quận 1, Thủ Đức, Bình Thạnh, Phú Nhuận)
- Bài viết kèm ảnh và video xem trước
- Bài viết có gắn thẻ danh sách bạn bè (PostTaggedFriend)
- Bài viết đăng công khai hoặc đăng vào nhóm
- Tuân thủ Soft delete (deleted_at) và Optimistic locking (version=1)
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
import asyncpg
from app.core.config import settings


SAMPLE_POSTS = [
    {
        "post_id": uuid.UUID("77777777-0001-0000-0000-000000000001"),
        "author_email": "citizen@ecoreport.gov.vn",
        "content": "Sáng nay cùng nhóm bạn dọn sạch bãi rác tự phát dưới chân cầu Thị Nghè. Đã thu gom được 8 bao rác nhựa và túi nilon! Mọi người cùng chung tay giữ gìn dòng kênh xanh nhé. #SaiGonXanh #ZeroWaste #ChungTayViMoiTruong",
        "media_urls": json.dumps([
            "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80"
        ]),
        "latitude": 10.7915,
        "longitude": 106.6972,
        "address": "Chân cầu Thị Nghè, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
        "visibility": "PUBLIC",
        "reactions_count": 28,
        "comments_count": 5,
        "tagged_friend_emails": ["req_an@ecoreport.gov.vn", "req_mai@ecoreport.gov.vn"],
    },
    {
        "post_id": uuid.UUID("77777777-0002-0000-0000-000000000002"),
        "author_email": "req_mai@ecoreport.gov.vn",
        "content": "Chia sẻ kinh nghiệm làm phân bón hữu cơ compost từ rác thải nhà bếp cực kỳ đơn giản và không mùi. Chỉ sau 3 tuần là có phân bón sạch cho cây trồng ban công! #SongXanh #CompostAtHome #TaiCheHuuCo",
        "media_urls": json.dumps([
            "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
        ]),
        "latitude": 10.8505,
        "longitude": 106.7719,
        "address": "Khu đô thị Vạn Phúc, Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh",
        "visibility": "PUBLIC",
        "reactions_count": 42,
        "comments_count": 11,
        "tagged_friend_emails": ["citizen@ecoreport.gov.vn"],
    },
    {
        "post_id": uuid.UUID("77777777-0003-0000-0000-000000000003"),
        "author_email": "citizen@ecoreport.gov.vn",
        "content": "Kêu gọi tình nguyện viên tham gia chiến dịch 'Chủ Nhật Xanh' tại Công viên Gia Định vào ngày mai lúc 7h30 sáng. Mang theo găng tay và bình nước cá nhân nhé cả nhà! #ChuNhatXanh #GiaDinhPark #CleanUp",
        "media_urls": None,
        "latitude": 10.8142,
        "longitude": 106.6748,
        "address": "Công viên Gia Định, Hoàng Minh Giám, Phường 3, Quận Gò Vấp, TP. Hồ Chí Minh",
        "visibility": "PUBLIC",
        "reactions_count": 15,
        "comments_count": 3,
        "tagged_friend_emails": ["req_an@ecoreport.gov.vn", "req_phuc@ecoreport.gov.vn"],
    },
]


async def seed_posts_data():
    """Nạp dữ liệu mẫu cho miền bài đăng cộng đồng (Feature STT 9)"""
    db_url = settings.DATABASE_URL
    if "+asyncpg" in db_url:
        pg_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    else:
        pg_url = db_url

    print("🌱 [1/3] Kết nối CSDL để nạp dữ liệu bài đăng...")
    conn = await asyncpg.connect(pg_url)

    try:
        # 1. Đảm bảo có ít nhất user tác giả và user bạn bè
        user_rows = await conn.fetch("SELECT user_id, email FROM users WHERE deleted_at IS NULL")
        user_map = {r["email"]: r["user_id"] for r in user_rows}

        # Nếu chưa có user citizen, lấy user đầu tiên làm tác giả mặc định
        default_author_id = user_rows[0]["user_id"] if user_rows else None
        if not default_author_id:
            print("⚠️ Chưa có user nào trong bảng users. Vui lòng chạy seed_data trước.")
            return

        print(f" 📝 [2/3] Nạp {len(SAMPLE_POSTS)} bài viết mẫu kèm toạ độ...")
        for post_data in SAMPLE_POSTS:
            author_id = user_map.get(post_data["author_email"], default_author_id)

            # Xoá bài cũ nếu có trùng ID
            await conn.execute("DELETE FROM post_tagged_friends WHERE post_id = $1", post_data["post_id"])
            await conn.execute("DELETE FROM posts WHERE post_id = $1", post_data["post_id"])

            # Thêm bài viết mới
            await conn.execute("""
                INSERT INTO posts (
                    post_id, user_id, content, media_urls, group_id, visibility,
                    is_hidden, reactions_count, comments_count,
                    latitude, longitude, address, version, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9,
                    $10, $11, $12, $13, now() - INTERVAL '2 hours', now() - INTERVAL '2 hours'
                );
            """,
                post_data["post_id"],
                author_id,
                post_data["content"],
                post_data["media_urls"],
                None, # group_id
                post_data["visibility"],
                False, # is_hidden
                post_data["reactions_count"],
                post_data["comments_count"],
                post_data["latitude"],
                post_data["longitude"],
                post_data["address"],
                1, # version (Optimistic locking)
            )

            # Gắn thẻ bạn bè
            for friend_email in post_data["tagged_friend_emails"]:
                friend_id = user_map.get(friend_email)
                if friend_id and friend_id != author_id:
                    await conn.execute("""
                        INSERT INTO post_tagged_friends (
                            tag_id, post_id, friend_user_id, created_at
                        ) VALUES ($1, $2, $3, now())
                        ON CONFLICT (post_id, friend_user_id) DO NOTHING;
                    """, uuid.uuid4(), post_data["post_id"], friend_id)

        print(" 🎯 [3/3] Kiểm tra số lượng bài viết đã nạp...")
        total_posts = await conn.fetchval("SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL")
        total_tags = await conn.fetchval("SELECT COUNT(*) FROM post_tagged_friends WHERE deleted_at IS NULL")
        print(f"✅ Nạp dữ liệu mẫu bài đăng (STT 9) THÀNH CÔNG! Hiện có: {total_posts} bài viết, {total_tags} lượt gắn thẻ.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_posts_data())
