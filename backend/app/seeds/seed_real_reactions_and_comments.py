"""
seed_real_reactions_and_comments.py
Đồng bộ hóa và nạp dữ liệu thật 100% cho Bảng tin Geo-Feed:
- Nạp các lượt bày tỏ cảm xúc thực tế (post_reactions) cho từng bài viết từ các người dùng thật
- Nạp các bình luận và phản hồi thực tế (comments) cho các bài viết chưa có bình luận
- Cập nhật chính xác cột reactions_count và comments_count trong bảng posts
"""

import sys
from pathlib import Path
import asyncio
import uuid
import random
from datetime import datetime, timezone, timedelta

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func, text, update
from app.database import AsyncSessionLocal
from app.models.post import Post, PostReaction
from app.models.comment import Comment
from app.models.rbac import User

ENVIRONMENT_COMMENTS = [
    "Tuyệt vời quá! Hoạt động này tổ chức định kỳ vào thứ mấy hàng tuần vậy mọi người?",
    "Mình đã thử áp dụng cách này tại nhà, kết quả thực sự rất hiệu quả và giảm được bao bì ni-lông đáng kể.",
    "Khu vực này trước đây nhiều rác lắm, nhờ cộng đồng chung tay mà nay sạch đẹp hẳn ra 🌱",
    "Cho mình hỏi có thể gom pin cũ và rác điện tử mang tới điểm nào gần nhất để tái chế ạ?",
    "Mô hình phân loại rác tại nguồn này rất thiết thực, hy vọng được nhân rộng sang các phường lân cận.",
    "Đã chia sẻ bài viết này vào nhóm khu phố của mình để cùng nhau thực hiện!",
    "Cảm ơn bạn đã chia sẻ kinh nghiệm quý báu cho cộng đồng GreenSpot 👏",
    "Sáng nay mình vừa đi ngang qua đoạn này, thấy các bạn tình nguyện viên dọn dẹp rất nhiệt tình!",
    "Một hành động nhỏ nhưng mang lại giá trị rất lớn cho môi trường sống của chúng ta.",
    "Bên mình cũng đang có chiến dịch đổi rác lấy cây xanh, hoan nghênh mọi người cùng tham gia nha."
]

SAMPLE_REPLIES = [
    "Dạ bên mình tổ chức vào sáng Chủ nhật từ 7h30 đến 10h30 bạn nha!",
    "Cảm ơn bạn đã đồng hành và lan tỏa lối sống xanh cùng cộng đồng 🌱",
    "Bạn có thể mang pin cũ tới trạm tái chế của Phường hoặc thùng thu gom tại trường học gần nhất nhé!",
    "Đúng rồi bạn ơi, nếu cần thêm tài liệu phân loại rác thì cứ nhắn cho nhóm nhé."
]

REACTION_TYPES = ["TREE", "EARTH", "RECYCLE", "CLAP", "CONCERN"]

async def seed_and_sync():
    print("=" * 65)
    print("🚀 [GreenSpot] Đang đồng bộ hóa dữ liệu cảm xúc & bình luận thật...")
    print("=" * 65)

    async with AsyncSessionLocal() as session:
        # 1. Lấy danh sách người dùng thực tế
        users_res = await session.execute(
            select(User).where(User.deleted_at.is_(None))
        )
        users = list(users_res.scalars().all())
        print(f"👥 Tìm thấy {len(users)} người dùng hợp lệ trong hệ thống.")
        if len(users) < 2:
            print("❌ Không đủ người dùng để nạp dữ liệu.")
            return

        # 2. Lấy tất cả bài viết chưa xóa
        posts_res = await session.execute(
            select(Post).where(Post.deleted_at.is_(None)).order_by(Post.created_at.desc())
        )
        posts = list(posts_res.scalars().all())
        print(f"📝 Tìm thấy {len(posts)} bài viết trên bảng tin.")

        total_reactions_added = 0
        total_comments_added = 0

        for p_idx, post in enumerate(posts):
            post_time = post.created_at or datetime.now(timezone.utc)

            # A. Kiểm tra & nạp Cảm xúc thật (post_reactions)
            existing_rx_res = await session.execute(
                select(PostReaction.user_id).where(PostReaction.post_id == post.post_id)
            )
            existing_rx_users = set(existing_rx_res.scalars().all())

            # Nếu bài viết có ít hơn 3 cảm xúc, nạp thêm cảm xúc từ người dùng thật
            if len(existing_rx_users) < 3:
                available_users = [u for u in users if u.user_id not in existing_rx_users]
                # Chọn số lượng cảm xúc từ 4 đến 9 người
                rx_count_to_pick = min(len(available_users), ((p_idx % 6) + 4))
                chosen_users = available_users[:rx_count_to_pick]

                for u_idx, u in enumerate(chosen_users):
                    rx_type = REACTION_TYPES[(p_idx + u_idx) % len(REACTION_TYPES)]
                    rx_time = post_time + timedelta(minutes=random.randint(2, 120))
                    new_rx = PostReaction(
                        post_id=post.post_id,
                        user_id=u.user_id,
                        reaction_type=rx_type,
                        created_at=rx_time
                    )
                    session.add(new_rx)
                    total_reactions_added += 1

            # B. Kiểm tra & nạp Bình luận thật (comments)
            existing_cm_res = await session.execute(
                select(func.count(Comment.comment_id)).where(
                    Comment.post_id == post.post_id,
                    Comment.deleted_at.is_(None)
                )
            )
            existing_cm_count = existing_cm_res.scalar() or 0

            # Nếu bài viết chưa có bình luận, tạo 2-4 bình luận từ các user thật
            if existing_cm_count == 0:
                num_comments = (p_idx % 3) + 2  # 2, 3 hoặc 4 bình luận
                for c_idx in range(num_comments):
                    author = users[(p_idx * 2 + c_idx) % len(users)]
                    comment_text = ENVIRONMENT_COMMENTS[(p_idx + c_idx) % len(ENVIRONMENT_COMMENTS)]
                    cm_time = post_time + timedelta(minutes=(c_idx + 1) * 8)

                    parent_comment = Comment(
                        comment_id=uuid.uuid4(),
                        post_id=post.post_id,
                        user_id=author.user_id,
                        parent_id=None,
                        reply_to_user_id=None,
                        content=comment_text,
                        replies_count=0,
                        likes_count=random.randint(1, 8),
                        version=1,
                        deleted_at=None,
                        created_at=cm_time
                    )
                    session.add(parent_comment)
                    total_comments_added += 1

                    # Bình luận đầu tiên có thêm 1 câu trả lời con
                    if c_idx == 0:
                        reply_author = users[(p_idx * 2 + c_idx + 1) % len(users)]
                        reply_text = SAMPLE_REPLIES[p_idx % len(SAMPLE_REPLIES)]
                        reply = Comment(
                            comment_id=uuid.uuid4(),
                            post_id=post.post_id,
                            user_id=reply_author.user_id,
                            parent_id=parent_comment.comment_id,
                            reply_to_user_id=author.user_id,
                            content=reply_text,
                            replies_count=0,
                            likes_count=random.randint(0, 4),
                            version=1,
                            deleted_at=None,
                            created_at=cm_time + timedelta(minutes=3)
                        )
                        session.add(reply)
                        parent_comment.replies_count += 1
                        total_comments_added += 1

        await session.commit()
        print(f"✅ Đã thêm {total_reactions_added} lượt cảm xúc mới vào bảng post_reactions.")
        print(f"✅ Đã thêm {total_comments_added} bình luận mới vào bảng comments.")

        # 3. Cập nhật chính xác reactions_count và comments_count trong bảng posts
        print("🔄 Đang đồng bộ số liệu cột posts.reactions_count và posts.comments_count...")
        for post in posts:
            rx_count = (await session.execute(
                select(func.count(PostReaction.reaction_id)).where(PostReaction.post_id == post.post_id)
            )).scalar() or 0

            cm_count = (await session.execute(
                select(func.count(Comment.comment_id)).where(
                    Comment.post_id == post.post_id,
                    Comment.deleted_at.is_(None)
                )
            )).scalar() or 0

            post.reactions_count = rx_count
            post.comments_count = cm_count

        await session.commit()
        print("✅ Hoàn tất đồng bộ 100% toàn bộ bài viết!")

        # 4. Kiểm tra lại dữ liệu mẫu
        sample_check = await session.execute(
            text("""
                SELECT 
                    p.post_id, 
                    p.content,
                    p.reactions_count,
                    (SELECT count(*) FROM post_reactions pr WHERE pr.post_id = p.post_id) AS real_rx,
                    p.comments_count,
                    (SELECT count(*) FROM comments c WHERE c.post_id = p.post_id AND c.deleted_at IS NULL) AS real_cm
                FROM posts p
                WHERE p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                LIMIT 5;
            """)
        )
        print("\n📊 Kiểm tra đối soát 5 bài viết đầu tiên trên bảng tin:")
        for row in sample_check.fetchall():
            print(f"- Post: {row[1][:35]}...")
            print(f"  + Cảm xúc: Cột={row[2]} | Bảng post_reactions={row[3]} | Khớp: {row[2] == row[3]}")
            print(f"  + Bình luận: Cột={row[4]} | Bảng comments={row[5]} | Khớp: {row[4] == row[5]}")

if __name__ == "__main__":
    asyncio.run(seed_and_sync())
