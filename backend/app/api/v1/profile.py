import re
import math
import uuid
from datetime import datetime, date, timezone, time
from typing import Optional, List, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy import select, update, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image
import io

from app.database import get_db
from app.core.config import UPLOAD_DIR
from app.models.rbac import User, UserSession
from app.models.profile import CitizenLevel, Badge, UserBadge, UserActivity, Post
from app.api.v1.auth import get_current_user_and_session
from app.schemas.profile import (
    UserProfileResponse,
    CitizenLevelInfo,
    BadgeHighlightInfo,
    PostListResponse,
    PostItemResponse,
    GreenPassportResponse,
    UserBadgesResponse,
    BadgeEarnedItem,
    BadgeLockedItem,
    ActivityListResponse,
    ActivityItemResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
)

router = APIRouter(prefix="/profile", tags=["Profile & Timeline"])


def generate_passport_code(user_id: uuid.UUID) -> str:
    """Tạo mã hộ chiếu xanh chuẩn GP-xxxxxx từ user_id"""
    num_part = abs(hash(str(user_id))) % 1000000
    return f"GP-{str(num_part).zfill(6)}"


async def get_active_user_or_404(user_id: uuid.UUID, db: AsyncSession) -> User:
    """Truy vấn người dùng hợp lệ, kiểm tra tồn tại và trạng thái ACTIVE"""
    res = await db.execute(
        select(User).where(
            User.user_id == user_id,
            User.deleted_at.is_(None)
        )
    )
    user = res.scalars().first()
    if not user or user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại"}
        )
    return user


async def build_profile_response(target_user: User, current_user: User, db: AsyncSession) -> UserProfileResponse:
    """Xây dựng dữ liệu thông tin hồ sơ (Cột trái và Cột phải ở Màn 1)"""
    is_own = (target_user.user_id == current_user.user_id)

    # 1. Lấy cấp bậc hiện tại theo số điểm tích lũy
    lvl_res = await db.execute(
        select(CitizenLevel)
        .where(
            CitizenLevel.min_points <= target_user.total_green_points,
            CitizenLevel.deleted_at.is_(None)
        )
        .order_by(desc(CitizenLevel.min_points))
        .limit(1)
    )
    lvl = lvl_res.scalars().first()
    current_level_info = None
    if lvl:
        current_level_info = CitizenLevelInfo(
            level_id=lvl.level_id,
            level_name=lvl.level_name,
            min_points=lvl.min_points,
            badge_icon_url=lvl.badge_icon_url,
            sort_order=lvl.sort_order
        )

    # 2. Lấy tối đa 3 huy hiệu mới nhận gần nhất (earned_at desc)
    badge_res = await db.execute(
        select(UserBadge, Badge)
        .join(Badge, UserBadge.badge_id == Badge.badge_id)
        .where(
            UserBadge.user_id == target_user.user_id,
            Badge.deleted_at.is_(None)
        )
        .order_by(desc(UserBadge.earned_at))
    )
    user_badges_rows = badge_res.all()
    total_badges_count = len(user_badges_rows)

    highlight_badges: List[BadgeHighlightInfo] = []
    for ub, b in user_badges_rows[:3]:
        highlight_badges.append(
            BadgeHighlightInfo(
                badge_id=b.badge_id,
                badge_code=b.badge_code,
                name=b.name,
                icon_url=b.icon_url,
                earned_at=ub.earned_at
            )
        )

    return UserProfileResponse(
        user_id=target_user.user_id,
        email=target_user.email,
        full_name=target_user.full_name,
        avatar_url=target_user.avatar_url,
        cover_image_url=target_user.cover_image_url,
        bio=target_user.bio,
        friends_count=target_user.friends_count,
        activated_at=target_user.activated_at,
        current_level=current_level_info,
        highlight_badges=highlight_badges,
        total_badges_count=total_badges_count,
        is_own_profile=is_own,
        total_green_points=target_user.total_green_points,
        date_of_birth=target_user.date_of_birth if is_own else None,
        version=target_user.version
    )


# =========================================================================
# ENDPOINTS MÀN 1: PROFILE VÀ TIMELINE
# =========================================================================

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """Lấy thông tin hồ sơ của chính mình"""
    current_user, _ = auth_data
    return await build_profile_response(current_user, current_user, db)


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: uuid.UUID,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """Lấy thông tin hồ sơ của một người dùng theo mã định danh"""
    current_user, _ = auth_data
    target_user = await get_active_user_or_404(user_id, db)
    return await build_profile_response(target_user, current_user, db)


@router.get("/{user_id}/posts", response_model=PostListResponse)
async def get_user_posts(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    limit: int = Query(10, ge=1, le=50, description="Số bài mỗi lần tải"),
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách bài viết trên dòng thời gian:
    - Chủ trang: Xem được cả bài công khai và bài ẩn (is_hidden = True).
    - Người khác: Chỉ xem được bài công khai (is_hidden = False), N không tính bài ẩn.
    - Soft delete: Mặc định lọc bỏ bài deleted_at IS NOT NULL.
    """
    if hasattr(page, "default"):
        page = page.default if page.default is not None else 1
    if hasattr(limit, "default"):
        limit = limit.default if limit.default is not None else 10

    current_user, _ = auth_data
    target_user = await get_active_user_or_404(user_id, db)
    is_own = (target_user.user_id == current_user.user_id)

    conditions = [
        Post.user_id == target_user.user_id,
        Post.deleted_at.is_(None)
    ]
    if not is_own:
        conditions.append(Post.is_hidden.is_(False))

    # Đếm tổng số bài được phép thấy
    count_stmt = select(func.count(Post.post_id)).where(and_(*conditions))
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Lấy danh sách bài phân trang
    offset = (page - 1) * limit
    post_stmt = (
        select(Post)
        .where(and_(*conditions))
        .order_by(desc(Post.created_at))
        .offset(offset)
        .limit(limit)
    )
    posts_res = await db.execute(post_stmt)
    posts = posts_res.scalars().all()

    items: List[PostItemResponse] = []
    for p in posts:
        media_list = None
        thumb = None
        if p.media_urls:
            import json
            try:
                media_list = json.loads(p.media_urls)
                if isinstance(media_list, list) and len(media_list) > 0:
                    thumb = media_list[0]
            except Exception:
                media_list = [p.media_urls]
                thumb = p.media_urls

        items.append(
            PostItemResponse(
                post_id=p.post_id,
                user_id=p.user_id,
                content=p.content,
                media_urls=media_list,
                thumbnail_url=thumb,
                reactions_count=p.reactions_count,
                comments_count=p.comments_count,
                is_hidden=p.is_hidden,
                created_at=p.created_at
            )
        )

    has_more = (offset + len(items)) < total_count
    return PostListResponse(
        items=items,
        total=total_count,
        has_more=has_more,
        page=page,
        limit=limit
    )


# =========================================================================
# ENDPOINTS MÀN 2: GREEN PASSPORT & HUY HIỆU
# =========================================================================

@router.get("/{user_id}/green-passport", response_model=GreenPassportResponse)
async def get_green_passport(
    user_id: uuid.UUID,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """Lấy thông tin Hộ chiếu Xanh, cấp bậc và thanh tiến độ chuẩn xác"""
    target_user = await get_active_user_or_404(user_id, db)
    points = target_user.total_green_points

    # Lấy toàn bộ danh sách cấp sắp xếp theo min_points
    levels_res = await db.execute(
        select(CitizenLevel)
        .where(CitizenLevel.deleted_at.is_(None))
        .order_by(asc(CitizenLevel.min_points))
    )
    levels = levels_res.scalars().all()

    current_lvl = levels[0] if levels else None
    next_lvl = None
    for i, lvl in enumerate(levels):
        if points >= lvl.min_points:
            current_lvl = lvl
            if i + 1 < len(levels):
                next_lvl = levels[i + 1]
            else:
                next_lvl = None

    if next_lvl is None:
        # Đã đạt cấp cao nhất
        is_max = True
        progress_pct = 100
        points_to_next = 0
        next_lvl_name = None
    else:
        is_max = False
        min_cur = current_lvl.min_points if current_lvl else 0
        min_next = next_lvl.min_points
        calc = math.floor(((points - min_cur) / (min_next - min_cur)) * 100)
        progress_pct = max(0, min(100, calc))
        points_to_next = max(0, min_next - points)
        next_lvl_name = next_lvl.level_name

    return GreenPassportResponse(
        user_id=target_user.user_id,
        full_name=target_user.full_name,
        avatar_url=target_user.avatar_url,
        passport_code=generate_passport_code(target_user.user_id),
        current_level=current_lvl.level_name if current_lvl else "Mầm Xanh",
        total_green_points=points,
        progress_percentage=progress_pct,
        points_to_next_level=points_to_next,
        next_level_name=next_lvl_name,
        is_max_level=is_max,
        activated_at=target_user.activated_at
    )


@router.get("/{user_id}/badges", response_model=UserBadgesResponse)
async def get_user_badges(
    user_id: uuid.UUID,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách huy hiệu:
    - 'Đã nhận': Huy hiệu đã mở khóa, sắp xếp theo earned_at mới nhất.
    - 'Chưa mở khóa': Chỉ hiển thị ở trang của chính mình, sắp theo sort_order.
    """
    current_user, _ = auth_data
    target_user = await get_active_user_or_404(user_id, db)
    is_own = (target_user.user_id == current_user.user_id)

    # 1. Huy hiệu đã nhận
    earned_res = await db.execute(
        select(UserBadge, Badge)
        .join(Badge, UserBadge.badge_id == Badge.badge_id)
        .where(
            UserBadge.user_id == target_user.user_id,
            Badge.deleted_at.is_(None)
        )
        .order_by(desc(UserBadge.earned_at))
    )
    earned_rows = earned_res.all()
    earned_badges: List[BadgeEarnedItem] = []
    earned_ids = set()
    for ub, b in earned_rows:
        earned_ids.add(b.badge_id)
        earned_badges.append(
            BadgeEarnedItem(
                badge_id=b.badge_id,
                badge_code=b.badge_code,
                name=b.name,
                description=b.description,
                icon_url=b.icon_url,
                earned_at=ub.earned_at
            )
        )

    # 2. Huy hiệu chưa mở khóa (chỉ ở trang của mình)
    locked_badges: Optional[List[BadgeLockedItem]] = None
    if is_own:
        locked_badges = []
        locked_res = await db.execute(
            select(Badge)
            .where(
                Badge.is_active.is_(True),
                Badge.deleted_at.is_(None),
                Badge.badge_id.not_in(earned_ids) if earned_ids else True
            )
            .order_by(asc(Badge.sort_order))
        )
        for b in locked_res.scalars().all():
            locked_badges.append(
                BadgeLockedItem(
                    badge_id=b.badge_id,
                    badge_code=b.badge_code,
                    name=b.name,
                    description=b.description,
                    icon_url=b.icon_url,
                    unlock_condition=b.unlock_condition,
                    sort_order=b.sort_order
                )
            )

    return UserBadgesResponse(
        earned_badges=earned_badges,
        locked_badges=locked_badges,
        is_own_profile=is_own
    )


# =========================================================================
# ENDPOINTS MÀN 3: LỊCH SỬ ĐÓNG GÓP
# =========================================================================

@router.get("/{user_id}/activities", response_model=ActivityListResponse)
async def get_user_activities(
    user_id: uuid.UUID,
    activity_type: Optional[str] = Query(None, description="Lọc theo loại hoạt động"),
    from_date: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    limit: int = Query(20, ge=1, le=100, description="Số lượng mỗi trang"),
    offset: int = Query(0, ge=0, description="Vị trí bắt đầu tải"),
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách nhật ký đóng góp có bộ lọc theo loại và theo thời gian.
    Kiểm tra ràng buộc ngày:
    - from_date không sau to_date
    - Không chọn ngày trong tương lai
    """
    if hasattr(from_date, "default"):
        from_date = from_date.default
    if hasattr(to_date, "default"):
        to_date = to_date.default
    if hasattr(activity_type, "default"):
        activity_type = activity_type.default
    if hasattr(limit, "default"):
        limit = limit.default if limit.default is not None else 20
    if hasattr(offset, "default"):
        offset = offset.default if offset.default is not None else 0

    today = date.today()

    # Kiểm tra ràng buộc thời gian
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_DATE_RANGE", "message": "Từ ngày không được sau Đến ngày"}
        )
    if (from_date and from_date > today) or (to_date and to_date > today):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "FUTURE_DATE_NOT_ALLOWED", "message": "Không được chọn ngày trong tương lai"}
        )

    target_user = await get_active_user_or_404(user_id, db)

    conditions = [
        UserActivity.user_id == target_user.user_id,
        UserActivity.deleted_at.is_(None)
    ]
    if activity_type:
        conditions.append(UserActivity.activity_type == activity_type)
    if from_date:
        from_dt = datetime.combine(from_date, time.min).replace(tzinfo=timezone.utc)
        conditions.append(UserActivity.created_at >= from_dt)
    if to_date:
        to_dt = datetime.combine(to_date, time.max).replace(tzinfo=timezone.utc)
        conditions.append(UserActivity.created_at <= to_dt)

    # Đếm số lượng hoạt động & tổng điểm
    stats_res = await db.execute(
        select(
            func.count(UserActivity.activity_id),
            func.coalesce(func.sum(UserActivity.points), 0)
        ).where(and_(*conditions))
    )
    total_acts, total_pts = stats_res.first() or (0, 0)

    # Lấy danh sách phân trang
    act_res = await db.execute(
        select(UserActivity)
        .where(and_(*conditions))
        .order_by(desc(UserActivity.created_at))
        .offset(offset)
        .limit(limit)
    )
    acts = act_res.scalars().all()

    items = [
        ActivityItemResponse(
            activity_id=a.activity_id,
            activity_type=a.activity_type,
            title=a.title,
            description=a.description,
            points=a.points,
            created_at=a.created_at
        )
        for a in acts
    ]

    has_more = (offset + len(items)) < total_acts
    return ActivityListResponse(
        items=items,
        total_activities=total_acts,
        total_points=int(total_pts),
        has_more=has_more,
        limit=limit,
        offset=offset
    )


import base64
import os

def process_and_save_profile_image(
    image_data: Optional[str],
    user_id: uuid.UUID,
    category: str,
    old_url: Optional[str] = None
) -> Optional[str]:
    """
    Xử lý kiểm tra và lưu file ảnh người dùng (Avatar hoặc Cover) an toàn theo đặc tả:
    - Nếu là base64 Data URL:
      + Kiểm tra dung lượng <= 5MB
      + Dùng Pillow verify ảnh hợp lệ (chống file hỏng, giả mạo extension)
      + Kiểm tra kích thước pixel tối thiểu: Avatar >= 200x200, Cover >= 900x300
      + Lưu vào thư mục static uploads
      + Xóa file cũ nếu có trên ổ đĩa
      + Trả về URL tương đối /uploads/profiles/{category}/{filename}
    - Nếu là link thường: giữ nguyên
    """
    if not image_data:
        return old_url

    # Nếu không phải Data URL Base64 thì giữ nguyên
    if not image_data.startswith("data:image/"):
        return image_data

    try:
        # Tách header và base64 data
        header, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)

        # 1. Kiểm tra dung lượng tối đa 5MB
        if len(image_bytes) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "IMAGE_TOO_LARGE", "message": "Ảnh không được vượt quá 5MB"}
            )

        # 2. Đọc và kiểm tra ảnh bằng Pillow
        img_buffer = io.BytesIO(image_bytes)
        try:
            with Image.open(img_buffer) as img:
                img_format = img.format.lower() if img.format else "jpeg"
                if img_format not in ["jpeg", "jpg", "png", "webp"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={"error_code": "INVALID_IMAGE_FORMAT", "message": "Ảnh phải là định dạng JPG, PNG hoặc WebP"}
                    )
                # 3. Kiểm tra kích thước pixel tối thiểu
                w, h = img.size
                if category == "avatar" and (w < 200 or h < 200):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={"error_code": "AVATAR_TOO_SMALL", "message": "Avatar phải có kích thước tối thiểu 200×200 px"}
                    )
                if category == "cover" and (w < 900 or h < 300):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={"error_code": "COVER_TOO_SMALL", "message": "Ảnh bìa phải có kích thước tối thiểu 900×300 px"}
                    )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "CORRUPTED_IMAGE", "message": "Không xử lý được ảnh. Vui lòng chọn ảnh khác"}
            )

        # 4. Lưu ra file trên ổ đĩa
        base_dir = os.path.join(UPLOAD_DIR, "profiles", category)
        os.makedirs(base_dir, exist_ok=True)

        ext = "jpg" if img_format in ["jpeg", "jpg"] else img_format
        filename = f"{user_id}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
        filepath = os.path.join(base_dir, filename)

        with open(filepath, "wb") as f:
            f.write(image_bytes)

        # 5. Xóa ảnh cũ nếu có trong thư mục uploads
        if old_url and "/uploads/" in old_url:
            rel_path = old_url.split("/uploads/", 1)[1]
            old_full_path = os.path.join(UPLOAD_DIR, rel_path)
            if os.path.exists(old_full_path) and os.path.isfile(old_full_path):
                try:
                    os.remove(old_full_path)
                except Exception:
                    pass

        return f"http://localhost:8000/uploads/profiles/{category}/{filename}"

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "IMAGE_PROCESSING_ERROR", "message": "Không xử lý được ảnh. Vui lòng chọn ảnh khác"}
        )


# =========================================================================
# ENDPOINTS MÀN 4: CHỈNH SỬA HỒ SƠ (OCC & ATOMIC)
# =========================================================================

@router.put("/me", response_model=UpdateProfileResponse)
async def update_my_profile(
    body: UpdateProfileRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Cập nhật thông tin cá nhân với Optimistic Concurrency Control (Quy tắc 7):
    - Kiểm tra version hiện tại. Nếu lệch -> trả về HTTP 409 Conflict.
    - Transaction nguyên tử (Atomic).
    - Lưu file ảnh mới và xóa ảnh cũ nếu có.
    """
    current_user, _ = auth_data

    # Xử lý cập nhật avatar và ảnh bìa an toàn
    new_avatar_url = process_and_save_profile_image(
        body.avatar_url, current_user.user_id, "avatar", current_user.avatar_url
    )
    new_cover_url = process_and_save_profile_image(
        body.cover_image_url, current_user.user_id, "cover", current_user.cover_image_url
    )

    # Áp dụng Optimistic Locking
    update_stmt = (
        update(User)
        .where(
            User.user_id == current_user.user_id,
            User.version == body.version,
            User.deleted_at.is_(None)
        )
        .values(
            full_name=body.full_name,
            bio=body.bio,
            date_of_birth=body.date_of_birth,
            avatar_url=new_avatar_url,
            cover_image_url=new_cover_url,
            version=User.version + 1,
            updated_at=func.now()
        )
    )
    result = await db.execute(update_stmt)

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "CONCURRENCY_CONFLICT", "message": "Dữ liệu đã bị thay đổi bởi phiên khác, vui lòng tải lại"}
        )

    await db.commit()

    # Lấy lại bản ghi sau khi cập nhật
    updated_user = await get_active_user_or_404(current_user.user_id, db)
    profile_data = await build_profile_response(updated_user, updated_user, db)

    return UpdateProfileResponse(
        success=True,
        message="Đã cập nhật hồ sơ",
        new_version=updated_user.version,
        user=profile_data
    )

