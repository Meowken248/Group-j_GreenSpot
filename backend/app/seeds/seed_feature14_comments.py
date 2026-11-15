"""
Seed dữ liệu mẫu cho Chức năng 14: Bình luận, Trả lời bình luận 1 cấp và Chia sẻ
"""

import sys
from pathlib import Path
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.post import Post
from app.models.comment import Comment
from app.models.rbac import User


SAMPLE_COMMENTS = [
    "Tuyệt vời quá bạn ơi! Hoạt động này tổ chức định kỳ vào thứ mấy hàng tuần vậy?",
    "Mô hình này rất thiết thực, mong thành phố nhân rộng thêm nhiều điểm như thế này.",
    "Mình đã thực hiện phân loại rác theo cách bạn chia sẻ, kết quả rất ưng ý luôn!",
    "Ủng hộ tinh thần sống xanh của các bạn trẻ! Chúc dự án ngày càng lan tỏa.",
    "Khu vực này trước đây nhiều rác lắm, nay sạch đẹp hẳn ra. Cảm ơn đội ngũ tình nguyện viên!",
]

SAMPLE_REPLIES = [
    "Dạ bên mình tổ chức vào sáng Chủ nhật từ 7h30 đến 10h30 bạn nha!",
    "Cảm ơn bạn đã đồng hành và lan tỏa cùng cộng đồng GreenSpot 🌱",
    "Đúng rồi bạn, nếu cần tài liệu hướng dẫn chi tiết thì cứ nhắn mình nhé.",
    "Rất vui vì đã truyền được cảm hứng cho mọi người!",
]


async def seed_comments_and_shares():
    print("=" * 60)
    print("🚀 [GreenSpot Seeder] Khởi tạo dữ liệu mẫu Bình luận & Trả lời...")
    async with AsyncSessionLocal() as session:
        # 1. Lấy danh sách users
        users_res = await session.execute(select(User).limit(5))
        users = users_res.scalars().all()
        if not users:
            print("❌ Không tìm thấy user nào để tạo bình luận.")
            return

        # 2. Lấy các bài viết
        posts_res = await session.execute(
            select(Post).where(Post.deleted_at.is_(None)).limit(3)
        )
        posts = posts_res.scalars().all()
        if not posts:
            print("❌ Không tìm thấy bài viết nào.")
            return

        for p_idx, post in enumerate(posts):
            # Kiểm tra xem bài viết đã có comment chưa
            existing_count = await session.execute(
                select(func.count(Comment.comment_id)).where(Comment.post_id == post.post_id)
            )
            if existing_count.scalar_one() > 0:
                print(f"ℹ️ Bài viết {post.post_id} đã có bình luận, bỏ qua.")
                continue

            print(f"📝 Đang tạo bình luận cho bài viết: {post.content[:40]}...")
            created_comments_count = 0

            for c_idx, comment_text in enumerate(SAMPLE_COMMENTS):
                author = users[c_idx % len(users)]
                created_time = datetime.now(timezone.utc) - timedelta(minutes=(30 - c_idx * 5))

                parent_comment = Comment(
                    comment_id=uuid.uuid4(),
                    post_id=post.post_id,
                    user_id=author.user_id,
                    parent_id=None,
                    reply_to_user_id=None,
                    content=comment_text,
                    replies_count=0,
                    likes_count=(c_idx + 1) * 3,
                    version=1,
                    deleted_at=None,
                    created_at=created_time,
                )
                session.add(parent_comment)
                created_comments_count += 1

                # Tạo 1-2 câu trả lời cho 2 bình luận đầu tiên
                if c_idx < 2:
                    for r_idx in range(2):
                        reply_author = users[(c_idx + r_idx + 1) % len(users)]
                        reply_time = created_time + timedelta(minutes=(r_idx + 1) * 3)
                        reply = Comment(
                            comment_id=uuid.uuid4(),
                            post_id=post.post_id,
                            user_id=reply_author.user_id,
                            parent_id=parent_comment.comment_id,
                            reply_to_user_id=author.user_id,
                            content=SAMPLE_REPLIES[r_idx],
                            replies_count=0,
                            likes_count=r_idx + 1,
                            version=1,
                            deleted_at=None,
                            created_at=reply_time,
                        )
                        session.add(reply)
                        parent_comment.replies_count += 1
                        created_comments_count += 1

            post.comments_count = created_comments_count
            post.shares_count = (p_idx + 1) * 2

        await session.commit()
        print("✅ Hoàn tất nạp dữ liệu mẫu bình luận & phản hồi thành công!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_comments_and_shares())

