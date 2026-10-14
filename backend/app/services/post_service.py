import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select, update, delete, and_, or_, func, desc, asc, case, literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import UPLOAD_DIR
from app.models.post import Post, PostTaggedFriend, PostReaction
from app.models.comment import Comment
from app.models.friends import Friendship, FriendRequest, UserFollow
from app.models.rbac import User, Role
from app.schemas.post import (
    CreatePostRequest,
    UpdatePostRequest,
    PostDetailResponse,
    MediaItemInput,
    MediaTypeEnum,
    AuthorSummary,
    TaggedFriendInfo,
    MediaUploadResponse,
    PostReactionUser,
    PostReactionsSummaryResponse,
)
from app.schemas.feed import FeedPostItem, FeedListResponse



class PostService:
    """Service xử lý nghiệp vụ Đăng bài cộng đồng (Feature STT 9)"""

    def __init__(self):
        self.upload_dir = os.path.join(UPLOAD_DIR, "posts")
        os.makedirs(self.upload_dir, exist_ok=True)

    async def create_post(
        self,
        db: AsyncSession,
        author_id: uuid.UUID,
        request: CreatePostRequest,
    ) -> Post:
        """
        Tạo bài đăng mới:
        - Chuẩn hóa media_urls sang định dạng JSON string
        - Khởi tạo version = 1 cho Optimistic Locking
        - Lưu các bạn bè được gắn thẻ vào bảng post_tagged_friends
        """
        # Serialize media_urls nếu có
        media_json = None
        if request.media_urls and len(request.media_urls) > 0:
            media_json = json.dumps([m.model_dump() for m in request.media_urls])

        post = Post(
            post_id=uuid.uuid4(),
            user_id=author_id,
            content=request.content or "",
            media_urls=media_json,
            group_id=request.group_id,
            visibility=request.visibility or "PUBLIC",
            is_hidden=False,
            reactions_count=0,
            comments_count=0,
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address,
            version=1,
            deleted_at=None,
        )
        db.add(post)
        await db.flush()

        # Lưu danh sách bạn bè được gắn thẻ (lọc an toàn chỉ các user thật sự tồn tại)
        if request.tagged_friend_ids:
            valid_users_stmt = select(User.user_id).where(
                User.user_id.in_(request.tagged_friend_ids),
                User.deleted_at.is_(None)
            )
            valid_users_res = await db.execute(valid_users_stmt)
            valid_user_ids = set(valid_users_res.scalars().all())

            for friend_id in request.tagged_friend_ids:
                if friend_id in valid_user_ids:
                    tag = PostTaggedFriend(
                        tag_id=uuid.uuid4(),
                        post_id=post.post_id,
                        friend_user_id=friend_id,
                        deleted_at=None,
                    )
                    db.add(tag)

        await db.commit()

        # Tải lại bài viết kèm relationship
        stmt = (
            select(Post)
            .options(
                selectinload(Post.tagged_friends).selectinload(PostTaggedFriend.friend),
                selectinload(Post.user),
            )
            .where(Post.post_id == post.post_id)
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def get_post_by_id(self, db: AsyncSession, post_id: uuid.UUID) -> Post:
        """Lấy bài viết theo ID (chỉ lấy bài chưa bị xóa mềm)"""
        stmt = (
            select(Post)
            .options(
                selectinload(Post.tagged_friends).selectinload(PostTaggedFriend.friend),
                selectinload(Post.user),
            )
            .where(
                and_(
                    Post.post_id == post_id,
                    Post.deleted_at.is_(None),
                )
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại hoặc đã bị xóa"}
            )
        return post

    async def update_post(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        request: UpdatePostRequest,
    ) -> Post:
        """
        Cập nhật bài viết với Optimistic Locking (Rule 7):
        - Kiểm tra quyền tác giả
        - Kiểm tra version hiện tại, nếu không khớp trả về HTTP 409 Conflict
        - Tự động tăng version + 1
        """
        stmt = select(Post).where(
            and_(
                Post.post_id == post_id,
                Post.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại"}
            )

        if post.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền sửa bài viết này"}
            )

        # Kiểm tra Optimistic Locking OCC
        if post.version != request.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error_code": "DATA_CONFLICT",
                    "message": "Dữ liệu bài viết đã được cập nhật bởi thao tác khác. Vui lòng tải lại trang.",
                    "current_version": post.version,
                }
            )

        # Cập nhật các trường
        if request.content is not None:
            post.content = request.content
        if request.media_urls is not None:
            post.media_urls = json.dumps([m.model_dump() for m in request.media_urls])
        
        # Cập nhật hoặc gỡ bỏ vị trí
        if request.clear_location:
            post.latitude = None
            post.longitude = None
            post.address = None
        else:
            if request.latitude is not None:
                post.latitude = request.latitude
            if request.longitude is not None:
                post.longitude = request.longitude
            if request.address is not None:
                post.address = request.address

        if request.group_id is not None:
            post.group_id = request.group_id
        if request.visibility is not None:
            post.visibility = request.visibility

        # Cập nhật danh sách bạn bè được gắn thẻ nếu có gửi lên (lọc an toàn chỉ các user thật sự tồn tại)
        if request.tagged_friend_ids is not None:
            await db.execute(
                delete(PostTaggedFriend).where(PostTaggedFriend.post_id == post.post_id)
            )
            if request.tagged_friend_ids:
                valid_users_stmt = select(User.user_id).where(
                    User.user_id.in_(request.tagged_friend_ids),
                    User.deleted_at.is_(None)
                )
                valid_users_res = await db.execute(valid_users_stmt)
                valid_user_ids = set(valid_users_res.scalars().all())

                for friend_id in request.tagged_friend_ids:
                    if friend_id in valid_user_ids:
                        tag = PostTaggedFriend(
                            tag_id=uuid.uuid4(),
                            post_id=post.post_id,
                            friend_user_id=friend_id,
                            deleted_at=None,
                        )
                        db.add(tag)

        post.updated_at = datetime.now(timezone.utc)
        post.version += 1
        await db.commit()
        await db.refresh(post)
        return await self.get_post_by_id(db, post.post_id)

    async def toggle_hide_post(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        is_hidden: bool,
    ) -> Post:
        """Ẩn hoặc hiện lại bài viết của chính mình (Feature STT 13 Màn 5/5)"""
        stmt = select(Post).where(
            and_(
                Post.post_id == post_id,
                Post.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại hoặc đã bị xóa"}
            )

        if post.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền ẩn/hiện bài viết này"}
            )

        post.is_hidden = is_hidden
        post.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(post)
        return await self.get_post_by_id(db, post.post_id)

    async def soft_delete_post(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Xóa mềm bài viết (Rule 6: deleted_at, Feature STT 13 Màn 3/5 & 4/5)"""
        stmt = select(Post).where(
            and_(
                Post.post_id == post_id,
                Post.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        post = res.scalars().first()

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "POST_NOT_FOUND", "message": "Bài viết không tồn tại hoặc đã bị xóa"}
            )

        if post.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền xóa bài viết này"}
            )

        now = datetime.now(timezone.utc)
        post.deleted_at = now

        # Soft delete các lượt gắn thẻ liên quan
        await db.execute(
            update(PostTaggedFriend)
            .where(PostTaggedFriend.post_id == post_id)
            .values(deleted_at=now)
        )

        await db.commit()
        return True

    async def save_uploaded_media(self, file: UploadFile) -> MediaUploadResponse:
        """
        Xử lý tải lên tệp ảnh hoặc video từ thiết bị:
        - Giới hạn: Ảnh tối đa 10MB (JPG/PNG), Video MP4 tối đa 50MB
        - Lưu vào thư mục uploads/posts/
        """
        filename = file.filename or "unknown"
        ext = os.path.splitext(filename)[1].lower()

        ALLOWED_IMG = {".jpg", ".jpeg", ".png", ".webp"}
        ALLOWED_VID = {".mp4", ".mov"}

        if ext in ALLOWED_IMG:
            media_type = MediaTypeEnum.IMAGE
            max_size = 10 * 1024 * 1024 # 10MB
        elif ext in ALLOWED_VID:
            media_type = MediaTypeEnum.VIDEO
            max_size = 50 * 1024 * 1024 # 50MB
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_FILE_TYPE", "message": "Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)"}
            )

        content = await file.read()
        file_size = len(content)

        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "FILE_TOO_LARGE", "message": "Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)"}
            )

        # Lưu file với UUID duy nhất
        unique_name = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.upload_dir, unique_name)

        with open(filepath, "wb") as out_file:
            out_file.write(content)


        # Trả về URL tương đối phục vụ qua endpoint /uploads
        relative_url = f"/uploads/posts/{unique_name}"

        return MediaUploadResponse(
            url=relative_url,
            media_type=media_type,
            file_name=filename,
            size_bytes=file_size,
        )

    def format_post_response(self, post: Post) -> PostDetailResponse:
        """Chuyển đổi ORM Model Post sang PostDetailResponse Schema"""
        parsed_media = []
        if post.media_urls:
            try:
                raw_items = json.loads(post.media_urls)
                parsed_media = [MediaItemInput(**item) for item in raw_items]
            except Exception:
                parsed_media = []

        tagged_list = []
        if hasattr(post, "tagged_friends") and post.tagged_friends:
            for tf in post.tagged_friends:
                if tf.deleted_at is None and tf.friend:
                    tagged_list.append(
                        TaggedFriendInfo(
                            user_id=tf.friend.user_id,
                            full_name=tf.friend.full_name or "Người dùng",
                            avatar_url=tf.friend.avatar_url,
                            email=tf.friend.email,
                        )
                    )

        author_info = None
        if hasattr(post, "user") and post.user:
            author_info = AuthorSummary(
                user_id=post.user.user_id,
                email=post.user.email,
                full_name=post.user.full_name or "Công dân sinh thái",
                avatar_url=post.user.avatar_url,
            )

        # Tính toán cờ is_edited nếu bài viết đã được cập nhật
        is_edited = False
        if post.updated_at and post.created_at:
            try:
                diff_sec = abs((post.updated_at - post.created_at).total_seconds())
                is_edited = diff_sec > 2
            except Exception:
                is_edited = False

        return PostDetailResponse(
            post_id=post.post_id,
            user_id=post.user_id,
            author=author_info,
            content=post.content,
            media_urls=parsed_media,
            latitude=post.latitude,
            longitude=post.longitude,
            address=post.address,
            group_id=post.group_id,
            visibility=post.visibility,
            is_hidden=post.is_hidden,
            is_edited=is_edited,
            reactions_count=post.reactions_count,
            comments_count=post.comments_count,
            shares_count=getattr(post, "shares_count", 0),
            shared_post_id=getattr(post, "shared_post_id", None),
            version=post.version,
            created_at=post.created_at,
            updated_at=post.updated_at,
            tagged_friends=tagged_list,
        )

    async def get_geo_feed(
        self,
        db: AsyncSession,
        current_user: Optional[User] = None,
        tab: str = "nearby",
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
        radius_km: float = 2.0,
        district: Optional[str] = None,
        category: Optional[str] = None,
        sort_by: str = "newest",
        page: int = 1,
        limit: int = 10,
    ) -> FeedListResponse:
        """
        Truy vấn Bảng tin Geo-Feed theo đặc tả STT 08:
        - tab "nearby": Lọc theo bán kính GPS (PostGIS ST_DistanceSphere)
        - tab "district": Lọc theo quận của người dùng
        - tab "friends": Lọc bài viết từ bạn bè (bảng friendships)
        - tab "groups": Lọc bài viết từ các nhóm tình nguyện
        - Hỗ trợ bộ lọc chủ đề môi trường và sắp xếp (newest / popular / nearest)
        """
        page = max(1, page)
        limit = min(50, max(1, limit))
        radius_km = min(10.0, max(0.5, radius_km))
        offset = (page - 1) * limit

        conditions = [
            Post.deleted_at.is_(None),
            Post.is_hidden.is_(False),
        ]

        friend_subquery = None
        if current_user:
            friend_subquery = select(
                case(
                    (Friendship.user_id_1 == current_user.user_id, Friendship.user_id_2),
                    else_=Friendship.user_id_1
                )
            ).where(
                and_(
                    or_(
                        Friendship.user_id_1 == current_user.user_id,
                        Friendship.user_id_2 == current_user.user_id
                    ),
                    Friendship.deleted_at.is_(None)
                )
            )
            # Người dùng xem được bài viết:
            # - PUBLIC, COMMUNITY, GROUP
            # - Bài FRIENDS nếu chính mình là tác giả hoặc tác giả là bạn bè
            # - Bài PRIVATE nếu chính mình là tác giả
            conditions.append(
                or_(
                    Post.visibility.in_(["PUBLIC", "COMMUNITY", "GROUP"]),
                    and_(
                        Post.visibility == "FRIENDS",
                        or_(
                            Post.user_id == current_user.user_id,
                            Post.user_id.in_(friend_subquery),
                        )
                    ),
                    and_(
                        Post.visibility.in_(["PRIVATE", "ONLY_ME"]),
                        Post.user_id == current_user.user_id,
                    )
                )
            )
        else:
            # Khách vãng lai chỉ xem được bài công khai
            conditions.append(Post.visibility.in_(["PUBLIC", "COMMUNITY"]))

        has_user_coords = (user_lat is not None and user_lon is not None)
        if has_user_coords:
            distance_expr = func.ST_DistanceSphere(
                func.ST_MakePoint(Post.longitude, Post.latitude),
                func.ST_MakePoint(user_lon, user_lat)
            )
        else:
            distance_expr = None

        if tab == "nearby":
            if has_user_coords:
                # Ưu tiên các bài viết trong bán kính GPS.
                # Đồng thời luôn hiển thị:
                # - Bài viết của chính người dùng (để tác giả luôn thấy bài viết mình vừa đăng)
                # - Bài viết không gắn GPS (chia sẻ chung toàn thành phố / cộng đồng)
                if current_user:
                    conditions.append(
                        or_(
                            and_(
                                Post.latitude.is_not(None),
                                Post.longitude.is_not(None),
                                distance_expr <= (radius_km * 1000.0)
                            ),
                            Post.latitude.is_(None),
                            Post.user_id == current_user.user_id
                        )
                    )
                else:
                    conditions.append(
                        or_(
                            and_(
                                Post.latitude.is_not(None),
                                Post.longitude.is_not(None),
                                distance_expr <= (radius_km * 1000.0)
                            ),
                            Post.latitude.is_(None)
                        )
                    )
        elif tab == "district":
            target_district = (district or "").strip()
            if target_district:
                conditions.append(Post.address.ilike(f"%{target_district}%"))
        elif tab == "friends":
            if not current_user:
                return FeedListResponse(
                    items=[],
                    total=0,
                    has_more=False,
                    page=page,
                    limit=limit,
                    tab=tab,
                    radius_km=radius_km,
                    user_lat=user_lat,
                    user_lon=user_lon,
                    district=district,
                    category=category,
                    sort_by=sort_by,
                )
            # Người dùng xem được bài của bạn bè VÀ bài của chính mình
            conditions.append(
                or_(
                    Post.user_id == current_user.user_id,
                    Post.user_id.in_(friend_subquery)
                )
            )
        elif tab == "groups":
            if not current_user:
                return FeedListResponse(
                    items=[],
                    total=0,
                    has_more=False,
                    page=page,
                    limit=limit,
                    tab=tab,
                    radius_km=radius_km,
                    user_lat=user_lat,
                    user_lon=user_lon,
                    district=district,
                    category=category,
                    sort_by=sort_by,
                )
            conditions.append(Post.group_id.is_not(None))

        if category and category.lower() != "all":
            conditions.append(Post.content.ilike(f"%{category}%"))

        count_stmt = select(func.count(Post.post_id)).where(and_(*conditions))
        total_res = await db.execute(count_stmt)
        total_count = total_res.scalar() or 0

        # Truy vấn đếm số lượng cảm xúc & bình luận thực tế trực tiếp từ bảng dữ liệu
        real_rx_subquery = (
            select(func.count(PostReaction.reaction_id))
            .where(PostReaction.post_id == Post.post_id)
            .scalar_subquery()
            .label("real_reactions_count")
        )
        real_cm_subquery = (
            select(func.count(Comment.comment_id))
            .where(Comment.post_id == Post.post_id, Comment.deleted_at.is_(None))
            .scalar_subquery()
            .label("real_comments_count")
        )

        if sort_by == "nearest" and distance_expr is not None:
            order_clauses = [asc(distance_expr)]
        elif sort_by == "popular":
            order_clauses = [desc(real_rx_subquery + real_cm_subquery), desc(Post.created_at)]
        else:
            if tab == "nearby" and distance_expr is not None and sort_by != "newest":
                order_clauses = [asc(distance_expr), desc(Post.created_at)]
            else:
                order_clauses = [desc(Post.created_at)]

        select_cols = [
            Post,
            real_rx_subquery,
            real_cm_subquery,
        ]
        if distance_expr is not None:
            select_cols.append(distance_expr.label("dist_meters"))
        else:
            select_cols.append(literal(None).label("dist_meters"))

        feed_stmt = (
            select(*select_cols)
            .where(and_(*conditions))
            .options(
                selectinload(Post.user),
                selectinload(Post.tagged_friends).selectinload(PostTaggedFriend.friend)
            )
            .order_by(*order_clauses)
            .offset(offset)
            .limit(limit)
        )
        feed_res = await db.execute(feed_stmt)
        rows = feed_res.all()

        user_rx_map = {}
        if current_user and rows:
            post_ids = [row[0].post_id for row in rows]
            urx_stmt = select(PostReaction.post_id, PostReaction.reaction_type).where(
                PostReaction.user_id == current_user.user_id,
                PostReaction.post_id.in_(post_ids)
            )
            urx_res = await db.execute(urx_stmt)
            user_rx_map = {r[0]: r[1] for r in urx_res.fetchall()}

        items: List[FeedPostItem] = []
        for row in rows:
            post_obj: Post = row[0]
            real_rx_count = int(row[1] or 0)
            real_cm_count = int(row[2] or 0)
            dist_val = row[3]

            parsed_media: List[MediaItemInput] = []
            thumb_url: Optional[str] = None
            if post_obj.media_urls:
                try:
                    raw_items = json.loads(post_obj.media_urls)
                    if isinstance(raw_items, list):
                        for m in raw_items:
                            if isinstance(m, dict):
                                parsed_media.append(MediaItemInput(**m))
                            elif isinstance(m, str):
                                parsed_media.append(MediaItemInput(url=m, media_type=MediaTypeEnum.IMAGE))
                    elif isinstance(raw_items, str):
                        parsed_media.append(MediaItemInput(url=raw_items, media_type=MediaTypeEnum.IMAGE))
                    if parsed_media:
                        thumb_url = parsed_media[0].url
                except Exception:
                    parsed_media = []

            tagged_list: List[TaggedFriendInfo] = []
            if hasattr(post_obj, "tagged_friends") and post_obj.tagged_friends:
                for tf in post_obj.tagged_friends:
                    if tf.deleted_at is None and tf.friend:
                        tagged_list.append(
                            TaggedFriendInfo(
                                user_id=tf.friend.user_id,
                                full_name=tf.friend.full_name or "Bạn bè",
                                avatar_url=tf.friend.avatar_url,
                                email=tf.friend.email or "",
                            )
                        )

            author_info = None
            if hasattr(post_obj, "user") and post_obj.user:
                author_info = AuthorSummary(
                    user_id=post_obj.user.user_id,
                    email=post_obj.user.email,
                    full_name=post_obj.user.full_name or "Công dân sinh thái",
                    avatar_url=post_obj.user.avatar_url,
                )

            dist_meters = None
            dist_text = None
            if dist_val is not None:
                try:
                    dist_meters = round(float(dist_val), 1)
                    if dist_meters < 1000:
                        dist_text = f"Cách bạn {int(round(dist_meters))}m"
                    else:
                        dist_text = f"Cách bạn {round(dist_meters / 1000.0, 1)}km"
                except Exception:
                    dist_meters = None
                    dist_text = None

            is_edited = False
            if post_obj.updated_at and post_obj.created_at:
                try:
                    is_edited = abs((post_obj.updated_at - post_obj.created_at).total_seconds()) > 2
                except Exception:
                    is_edited = False

            items.append(
                FeedPostItem(
                    post_id=post_obj.post_id,
                    user_id=post_obj.user_id,
                    author=author_info,
                    content=post_obj.content,
                    media_urls=parsed_media,
                    thumbnail_url=thumb_url,
                    latitude=post_obj.latitude,
                    longitude=post_obj.longitude,
                    address=post_obj.address,
                    group_id=post_obj.group_id,
                    visibility=post_obj.visibility,
                    is_hidden=post_obj.is_hidden,
                    is_edited=is_edited,
                    reactions_count=real_rx_count,
                    comments_count=real_cm_count,
                    shares_count=getattr(post_obj, "shares_count", 0),
                    shared_post_id=getattr(post_obj, "shared_post_id", None),
                    version=post_obj.version,
                    created_at=post_obj.created_at,
                    updated_at=post_obj.updated_at,
                    tagged_friends=tagged_list,
                    distance_meters=dist_meters,
                    distance_text=dist_text,
                    user_reaction=user_rx_map.get(post_obj.post_id),
                )
            )

        has_more = (offset + len(items)) < total_count
        return FeedListResponse(
            items=items,
            total=total_count,
            has_more=has_more,
            page=page,
            limit=limit,
            tab=tab,
            radius_km=radius_km,
            user_lat=user_lat,
            user_lon=user_lon,
            district=district,
            category=category,
            sort_by=sort_by,
        )

    async def react_to_post(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        reaction_type: str,
    ) -> dict:
        """
        Thả hoặc cập nhật cảm xúc sinh thái cho bài viết (Feature STT 10):
        - Nếu thả cảm xúc cùng loại -> huỷ cảm xúc (toggle off), giảm reactions_count
        - Nếu đổi loại cảm xúc -> cập nhật reaction_type
        - Nếu chưa thả -> tạo mới PostReaction, tăng reactions_count
        """
        valid_types = {"TREE", "EARTH", "RECYCLE", "CLAP", "CONCERN"}
        clean_type = reaction_type.upper().strip()
        if clean_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loại cảm xúc không hợp lệ. Hỗ trợ: {', '.join(valid_types)}"
            )

        stmt = select(Post).where(Post.post_id == post_id, Post.deleted_at.is_(None))
        res = await db.execute(stmt)
        post = res.scalar_one_or_none()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài viết không tồn tại hoặc đã bị xóa"
            )

        rx_stmt = select(PostReaction).where(
            PostReaction.post_id == post_id,
            PostReaction.user_id == user_id
        )
        rx_res = await db.execute(rx_stmt)
        existing_rx = rx_res.scalar_one_or_none()

        action = "ADDED"
        current_reaction = clean_type

        if existing_rx:
            if existing_rx.reaction_type == clean_type:
                # Bấm lại lần nữa để hủy cảm xúc
                await db.delete(existing_rx)
                post.reactions_count = max(0, post.reactions_count - 1)
                action = "REMOVED"
                current_reaction = None
            else:
                # Đổi sang loại cảm xúc khác
                existing_rx.reaction_type = clean_type
                action = "UPDATED"
                current_reaction = clean_type
        else:
            new_rx = PostReaction(
                post_id=post_id,
                user_id=user_id,
                reaction_type=clean_type
            )
            db.add(new_rx)
            post.reactions_count += 1
            action = "ADDED"
            current_reaction = clean_type

        await db.commit()
        await db.refresh(post)

        return {
            "success": True,
            "action": action,
            "reaction_type": current_reaction,
            "reactions_count": post.reactions_count,
        }

    async def get_post_reactions(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        reaction_type: Optional[str] = None,
        current_user_id: Optional[uuid.UUID] = None,
    ) -> PostReactionsSummaryResponse:
        """
        Lấy danh sách người dùng bày tỏ cảm xúc theo loại (Facebook-style modal):
        - Hỗ trợ lọc theo từng reaction_type hoặc 'ALL'
        - Trả về số lượng từng loại cảm xúc
        - Kèm trạng thái bạn bè / follow để hiển thị nút hành động
        """
        post_stmt = select(Post).where(Post.post_id == post_id, Post.deleted_at.is_(None))
        post_res = await db.execute(post_stmt)
        post = post_res.scalar_one_or_none()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài viết không tồn tại hoặc đã bị xóa"
            )

        # Đếm số lượng theo từng loại
        all_rx_stmt = (
            select(PostReaction.reaction_type, func.count(PostReaction.reaction_id))
            .where(PostReaction.post_id == post_id)
            .group_by(PostReaction.reaction_type)
        )
        all_rx_res = await db.execute(all_rx_stmt)
        type_counts = {r[0]: r[1] for r in all_rx_res.fetchall()}
        total_count = sum(type_counts.values())

        # Truy vấn danh sách người dùng
        query = (
            select(PostReaction, User, Role.role_name)
            .join(User, PostReaction.user_id == User.user_id)
            .outerjoin(Role, User.role_id == Role.role_id)
            .where(PostReaction.post_id == post_id)
            .order_by(PostReaction.created_at.desc())
        )
        if reaction_type and reaction_type.upper().strip() != "ALL":
            query = query.where(PostReaction.reaction_type == reaction_type.upper().strip())

        items_res = await db.execute(query)
        rows = items_res.all()
        user_ids = [u.user_id for _, u, _ in rows]

        friend_ids = set()
        sent_req_ids = set()
        received_req_ids = set()
        following_ids = set()

        if current_user_id and user_ids:
            f_stmt = select(Friendship.friend_id).where(
                Friendship.user_id == current_user_id,
                Friendship.friend_id.in_(user_ids)
            )
            f_res = await db.execute(f_stmt)
            friend_ids = {r[0] for r in f_res.fetchall()}

            req_sent_stmt = select(FriendRequest.receiver_id).where(
                FriendRequest.sender_id == current_user_id,
                FriendRequest.receiver_id.in_(user_ids),
                FriendRequest.status == "PENDING"
            )
            req_sent_res = await db.execute(req_sent_stmt)
            sent_req_ids = {r[0] for r in req_sent_res.fetchall()}

            req_recv_stmt = select(FriendRequest.sender_id).where(
                FriendRequest.receiver_id == current_user_id,
                FriendRequest.sender_id.in_(user_ids),
                FriendRequest.status == "PENDING"
            )
            req_recv_res = await db.execute(req_recv_stmt)
            received_req_ids = {r[0] for r in req_recv_res.fetchall()}

            fol_stmt = select(UserFollow.following_id).where(
                UserFollow.follower_id == current_user_id,
                UserFollow.following_id.in_(user_ids)
            )
            fol_res = await db.execute(fol_stmt)
            following_ids = {r[0] for r in fol_res.fetchall()}

        result_items: List[PostReactionUser] = []
        for rx, u, role_name in rows:
            if current_user_id and u.user_id == current_user_id:
                f_status = "SELF"
            elif u.user_id in friend_ids:
                f_status = "FRIENDS"
            elif u.user_id in sent_req_ids:
                f_status = "REQUEST_SENT"
            elif u.user_id in received_req_ids:
                f_status = "REQUEST_RECEIVED"
            else:
                f_status = "NONE"

            result_items.append(
                PostReactionUser(
                    user_id=u.user_id,
                    full_name=u.full_name or "Người dùng",
                    avatar_url=getattr(u, "avatar_url", None),
                    role=role_name or "Công dân",
                    reaction_type=rx.reaction_type,
                    created_at=rx.created_at,
                    friendship_status=f_status,
                    is_following=u.user_id in following_ids,
                )
            )

        return PostReactionsSummaryResponse(
            post_id=post_id,
            total_count=total_count,
            counts_by_type=type_counts,
            items=result_items,
        )

