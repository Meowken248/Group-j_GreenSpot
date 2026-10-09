import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, UserSession
from app.models.friends import (
    FriendRequest,
    Friendship,
    UserFollow,
    FriendRequestStatus,
)
from app.schemas.friends import (
    SendFriendRequest,
    RespondFriendRequest,
    FriendRequestResponse,
    FriendItemResponse,
    UnfriendRequest,
    FollowRequest,
    FollowItemResponse,
    GreenCitizenSuggestionResponse,
    GenericFriendsActionResponse,
)
from app.api.v1.auth import get_current_user_and_session

router = APIRouter(prefix="/friends", tags=["Friends & Follows"])

MAX_FRIENDS_LIMIT = 5000


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def get_canonical_pair(u1: uuid.UUID, u2: uuid.UUID) -> Tuple[uuid.UUID, uuid.UUID]:
    """Chuẩn hóa cặp user_id theo thứ tự tăng dần canonical"""
    return min(u1, u2), max(u1, u2)


async def count_mutual_friends(user_a: uuid.UUID, user_b: uuid.UUID, db: AsyncSession) -> int:
    """Tính số lượng bạn chung giữa 2 người dùng"""
    # Bạn bè của A (chưa bị xóa)
    q_a = select(
        func.case(
            (Friendship.user_id_1 == user_a, Friendship.user_id_2),
            else_=Friendship.user_id_1
        )
    ).where(
        or_(Friendship.user_id_1 == user_a, Friendship.user_id_2 == user_a),
        Friendship.deleted_at.is_(None)
    )

    # Bạn bè của B (chưa bị xóa)
    q_b = select(
        func.case(
            (Friendship.user_id_1 == user_b, Friendship.user_id_2),
            else_=Friendship.user_id_1
        )
    ).where(
        or_(Friendship.user_id_1 == user_b, Friendship.user_id_2 == user_b),
        Friendship.deleted_at.is_(None)
    )

    mutual_q = select(func.count()).select_from(
        q_a.intersect(q_b).subquery()
    )
    res = await db.execute(mutual_q)
    return res.scalar() or 0


# =========================================================================
# ENDPOINTS MÀN 1: LỜI MỜI KẾT BẠN & GỢI Ý CÔNG DÂN XANH
# =========================================================================

@router.get("/requests", response_model=List[FriendRequestResponse])
async def get_received_friend_requests(
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 1 (Cột trái): Lấy danh sách lời mời kết bạn gửi đến tôi (PENDING)
    """
    current_user, _ = auth_data

    stmt = (
        select(FriendRequest)
        .where(
            FriendRequest.receiver_id == current_user.user_id,
            FriendRequest.status == FriendRequestStatus.PENDING.value,
            FriendRequest.deleted_at.is_(None)
        )
        .order_by(desc(FriendRequest.created_at))
    )
    result = await db.execute(stmt)
    requests = result.scalars().all()

    response_items: List[FriendRequestResponse] = []
    for req in requests:
        sender = req.sender
        if not sender or sender.deleted_at is not None:
            continue

        mutual_count = await count_mutual_friends(current_user.user_id, sender.user_id, db)
        
        # Lấy quận huyện từ bio nếu có hoặc mặc định khu vực đô thị
        district_val = None
        if sender.bio and ("Quận" in sender.bio or "TP." in sender.bio or "Huyện" in sender.bio):
            for word in sender.bio.split(","):
                w = word.strip()
                if any(k in w for k in ["Quận", "TP.", "Huyện"]):
                    district_val = w
                    break

        response_items.append(
            FriendRequestResponse(
                request_id=req.request_id,
                sender_id=sender.user_id,
                sender_name=sender.full_name,
                sender_avatar=sender.avatar_url,
                district=district_val,
                mutual_friends_count=mutual_count,
                status=req.status,
                created_at=req.created_at,
            )
        )

    return response_items


@router.post("/requests", response_model=GenericFriendsActionResponse)
async def send_friend_request(
    payload: SendFriendRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Gửi lời mời kết bạn tới một công dân xanh khác
    """
    current_user, _ = auth_data
    target_id = payload.receiver_id

    # 1. Ràng buộc: Không gửi cho chính mình
    if current_user.user_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "CANNOT_REQUEST_SELF", "message": "Không thể gửi lời mời kết bạn cho chính mình"}
        )

    # 2. Kiểm tra target user tồn tại và hợp lệ
    t_res = await db.execute(select(User).where(User.user_id == target_id, User.deleted_at.is_(None)))
    target_user = t_res.scalars().first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại hoặc đã bị khóa"}
        )

    # 3. Kiểm tra giới hạn bạn bè tối đa
    if current_user.friends_count >= MAX_FRIENDS_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "FRIEND_LIMIT_EXCEEDED", "message": "Bạn đã đạt giới hạn 5.000 bạn bè tối đa"}
        )
    if target_user.friends_count >= MAX_FRIENDS_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "TARGET_FRIEND_LIMIT_EXCEEDED", "message": "Đối phương đã đạt giới hạn bạn bè tối đa"}
        )

    # 4. Kiểm tra đã là bạn bè chưa
    c1, c2 = get_canonical_pair(current_user.user_id, target_id)
    fr_res = await db.execute(
        select(Friendship).where(
            Friendship.user_id_1 == c1,
            Friendship.user_id_2 == c2,
            Friendship.deleted_at.is_(None)
        )
    )
    if fr_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "ALREADY_FRIENDS", "message": "Hai người đã là bạn bè"}
        )

    # 5. Kiểm tra đã có lời mời PENDING chưa
    existing_req = await db.execute(
        select(FriendRequest).where(
            or_(
                and_(FriendRequest.sender_id == current_user.user_id, FriendRequest.receiver_id == target_id),
                and_(FriendRequest.sender_id == target_id, FriendRequest.receiver_id == current_user.user_id),
            ),
            FriendRequest.status == FriendRequestStatus.PENDING.value,
            FriendRequest.deleted_at.is_(None)
        )
    )
    if existing_req.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "REQUEST_ALREADY_EXISTS", "message": "Đã có lời mời kết bạn đang chờ phản hồi giữa hai người"}
        )

    # 6. Tạo lời mời mới
    new_req = FriendRequest(
        request_id=uuid.uuid4(),
        sender_id=current_user.user_id,
        receiver_id=target_id,
        status=FriendRequestStatus.PENDING.value
    )
    db.add(new_req)
    await db.commit()

    return GenericFriendsActionResponse(
        success=True,
        message=f"Đã gửi lời mời kết bạn tới {target_user.full_name}",
        data={"request_id": str(new_req.request_id), "receiver_id": str(target_id)}
    )


@router.post("/requests/{request_id}/respond", response_model=GenericFriendsActionResponse)
async def respond_to_friend_request(
    request_id: uuid.UUID,
    payload: RespondFriendRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 1: Chấp nhận ("ACCEPT") hoặc Từ chối ("REJECT") lời mời kết bạn
    """
    current_user, _ = auth_data

    # 1. Tìm lời mời
    r_res = await db.execute(
        select(FriendRequest).where(
            FriendRequest.request_id == request_id,
            FriendRequest.deleted_at.is_(None)
        )
    )
    req = r_res.scalars().first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "REQUEST_NOT_FOUND", "message": "Lời mời kết bạn không tồn tại hoặc đã bị hủy"}
        )

    # 2. Quyền sở hữu: Chỉ người nhận mới được phản hồi
    if req.receiver_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FORBIDDEN", "message": "Bạn không có quyền phản hồi lời mời này"}
        )

    # 3. Phải ở trạng thái PENDING
    if req.status != FriendRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "REQUEST_ALREADY_HANDLED", "message": f"Lời mời đã được xử lý trước đó ({req.status})"}
        )

    sender_id = req.sender_id
    s_res = await db.execute(select(User).where(User.user_id == sender_id, User.deleted_at.is_(None)))
    sender_user = s_res.scalars().first()

    # 4. Xử lý hành động ACCEPT
    if payload.action == "ACCEPT":
        # Kiểm tra giới hạn bạn bè
        if current_user.friends_count >= MAX_FRIENDS_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "FRIEND_LIMIT_EXCEEDED", "message": "Bạn đã đạt giới hạn 5.000 bạn bè tối đa"}
            )
        if sender_user and sender_user.friends_count >= MAX_FRIENDS_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "SENDER_FRIEND_LIMIT_EXCEEDED", "message": "Người gửi đã đạt giới hạn bạn bè tối đa"}
            )

        c1, c2 = get_canonical_pair(current_user.user_id, sender_id)

        # Kiểm tra nếu đã có friendship (đã soft-deleted thì khôi phục, chưa có thì tạo mới)
        fs_res = await db.execute(
            select(Friendship).where(
                Friendship.user_id_1 == c1,
                Friendship.user_id_2 == c2
            )
        )
        existing_fs = fs_res.scalars().first()
        if existing_fs:
            existing_fs.deleted_at = None
            existing_fs.created_at = datetime.now(timezone.utc)
        else:
            new_fs = Friendship(
                friendship_id=uuid.uuid4(),
                user_id_1=c1,
                user_id_2=c2
            )
            db.add(new_fs)

        # Cập nhật trạng thái request
        req.status = FriendRequestStatus.ACCEPTED.value

        # Tăng friends_count của cả 2 user
        current_user.friends_count += 1
        if sender_user:
            sender_user.friends_count += 1

        await db.commit()
        return GenericFriendsActionResponse(
            success=True,
            message=f"Đã chấp nhận lời mời kết bạn từ {sender_user.full_name if sender_user else 'người dùng'}",
            data={"action": "ACCEPT", "friend_user_id": str(sender_id)}
        )

    # 5. Xử lý hành động REJECT
    else:
        req.status = FriendRequestStatus.REJECTED.value
        req.deleted_at = datetime.now(timezone.utc)
        await db.commit()

        return GenericFriendsActionResponse(
            success=True,
            message="Đã từ chối lời mời kết bạn",
            data={"action": "REJECT", "request_id": str(request_id)}
        )


@router.get("/suggestions", response_model=List[GreenCitizenSuggestionResponse])
async def get_green_citizen_suggestions(
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 1 (Cột phải): Gợi ý các công dân xanh tích cực trong khu vực
    """
    current_user, _ = auth_data

    # Lấy danh sách ID đã là bạn bè của tôi
    friends_subq = select(
        func.case(
            (Friendship.user_id_1 == current_user.user_id, Friendship.user_id_2),
            else_=Friendship.user_id_1
        )
    ).where(
        or_(Friendship.user_id_1 == current_user.user_id, Friendship.user_id_2 == current_user.user_id),
        Friendship.deleted_at.is_(None)
    )

    # Lấy danh sách ID đã gửi hoặc nhận request PENDING
    req_subq = select(
        func.case(
            (FriendRequest.sender_id == current_user.user_id, FriendRequest.receiver_id),
            else_=FriendRequest.sender_id
        )
    ).where(
        or_(FriendRequest.sender_id == current_user.user_id, FriendRequest.receiver_id == current_user.user_id),
        FriendRequest.status == FriendRequestStatus.PENDING.value,
        FriendRequest.deleted_at.is_(None)
    )

    # Lấy danh sách ID đang follow
    follow_subq = select(UserFollow.following_id).where(
        UserFollow.follower_id == current_user.user_id,
        UserFollow.deleted_at.is_(None)
    )

    # Truy vấn các user gợi ý (loại trừ chính mình, bạn bè, pending requests)
    stmt = (
        select(User)
        .where(
            User.user_id != current_user.user_id,
            User.deleted_at.is_(None),
            User.status == "ACTIVE",
            User.user_id.not_in(friends_subq),
            User.user_id.not_in(req_subq),
        )
        .order_by(desc(User.total_green_points))
        .limit(10)
    )
    result = await db.execute(stmt)
    suggested_users = result.scalars().all()

    # Lấy set ID đang theo dõi
    f_res = await db.execute(follow_subq)
    following_ids = set(f_res.scalars().all())

    suggestions: List[GreenCitizenSuggestionResponse] = []
    for u in suggested_users:
        mutual_count = await count_mutual_friends(current_user.user_id, u.user_id, db)
        
        district_val = None
        if u.bio and any(k in u.bio for k in ["Quận", "TP.", "Huyện"]):
            for word in u.bio.split(","):
                w = word.strip()
                if any(k in w for k in ["Quận", "TP.", "Huyện"]):
                    district_val = w
                    break

        suggestions.append(
            GreenCitizenSuggestionResponse(
                user_id=u.user_id,
                full_name=u.full_name,
                avatar_url=u.avatar_url,
                district=district_val,
                total_green_points=u.total_green_points,
                mutual_friends_count=mutual_count,
                is_following=u.user_id in following_ids,
                has_pending_request=False
            )
        )

    return suggestions


# =========================================================================
# ENDPOINTS MÀN 2: QUẢN LÝ BẠN BÈ & ĐANG THEO DÕI
# =========================================================================

@router.get("/list", response_model=List[FriendItemResponse])
async def get_my_friends_list(
    query: Optional[str] = Query(None, description="Tìm kiếm realtime họ tên hoặc quận/huyện"),
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 2 (Cột trái): Danh sách bạn bè hiện tại kèm tìm kiếm theo họ tên/quận huyện
    """
    current_user, _ = auth_data

    # Truy vấn các bản ghi Friendship active
    fs_stmt = (
        select(Friendship)
        .where(
            or_(Friendship.user_id_1 == current_user.user_id, Friendship.user_id_2 == current_user.user_id),
            Friendship.deleted_at.is_(None)
        )
        .order_by(desc(Friendship.created_at))
    )
    fs_res = await db.execute(fs_stmt)
    friendships = fs_res.scalars().all()

    friends_items: List[FriendItemResponse] = []
    q_clean = query.strip().lower() if query else None

    for fs in friendships:
        friend_user = fs.user_2 if fs.user_id_1 == current_user.user_id else fs.user_1
        if not friend_user or friend_user.deleted_at is not None:
            continue

        district_val = None
        if friend_user.bio and any(k in friend_user.bio for k in ["Quận", "TP.", "Huyện"]):
            for word in friend_user.bio.split(","):
                w = word.strip()
                if any(k in w for k in ["Quận", "TP.", "Huyện"]):
                    district_val = w
                    break

        # Lọc tìm kiếm nếu có query
        if q_clean:
            name_match = q_clean in friend_user.full_name.lower()
            district_match = district_val and (q_clean in district_val.lower())
            if not (name_match or district_match):
                continue

        is_susp = (friend_user.status == "SUSPENDED" or friend_user.status == "LOCKED")

        friends_items.append(
            FriendItemResponse(
                user_id=friend_user.user_id,
                full_name=friend_user.full_name,
                avatar_url=friend_user.avatar_url,
                district=district_val,
                status=friend_user.status,
                is_suspended=is_susp,
                total_green_points=friend_user.total_green_points,
                is_online=not is_susp, # Mô phỏng trạng thái online
                friends_count=friend_user.friends_count,
                friendship_created_at=fs.created_at
            )
        )

    return friends_items


@router.get("/following", response_model=List[FollowItemResponse])
async def get_my_following_list(
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 2 (Cột phải): Danh sách những người dùng tôi đang theo dõi 1 chiều
    """
    current_user, _ = auth_data

    stmt = (
        select(UserFollow)
        .where(
            UserFollow.follower_id == current_user.user_id,
            UserFollow.deleted_at.is_(None)
        )
        .order_by(desc(UserFollow.created_at))
    )
    result = await db.execute(stmt)
    follows = result.scalars().all()

    follow_items: List[FollowItemResponse] = []
    for f in follows:
        target = f.following
        if not target or target.deleted_at is not None:
            continue

        district_val = None
        if target.bio and any(k in target.bio for k in ["Quận", "TP.", "Huyện"]):
            for word in target.bio.split(","):
                w = word.strip()
                if any(k in w for k in ["Quận", "TP.", "Huyện"]):
                    district_val = w
                    break

        follow_items.append(
            FollowItemResponse(
                user_id=target.user_id,
                full_name=target.full_name,
                avatar_url=target.avatar_url,
                district=district_val,
                total_green_points=target.total_green_points,
                status=target.status,
                followed_at=f.created_at
            )
        )

    return follow_items


# =========================================================================
# ENDPOINTS MÀN 3: POPUP HỦY KẾT BẠN & THEO DÕI/BỎ THEO DÕI
# =========================================================================

@router.post("/unfriend", response_model=GenericFriendsActionResponse)
async def unfriend_user(
    payload: UnfriendRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 3: Xác nhận hủy kết bạn từ Popup Modal
    - Sử dụng soft delete (gán deleted_at = now())
    - Trừ friends_count của cả hai người
    - Xử lý ngoại lệ nếu đối phương đã hủy trước hoặc không còn là bạn
    """
    current_user, _ = auth_data
    friend_id = payload.friend_user_id

    c1, c2 = get_canonical_pair(current_user.user_id, friend_id)

    fs_res = await db.execute(
        select(Friendship).where(
            Friendship.user_id_1 == c1,
            Friendship.user_id_2 == c2,
            Friendship.deleted_at.is_(None)
        )
    )
    friendship = fs_res.scalars().first()

    # Xử lý ngoại lệ: Không tìm thấy quan hệ bạn bè (có thể đã hủy trước đó)
    if not friendship:
        return GenericFriendsActionResponse(
            success=True,
            message="Hiện hai người không còn là bạn bè.",
            data={"already_unfriended": True, "friend_user_id": str(friend_id)}
        )

    # 1. Soft delete bản ghi quan hệ bạn bè
    friendship.deleted_at = datetime.now(timezone.utc)

    # 2. Giảm friends_count không âm
    current_user.friends_count = max(0, current_user.friends_count - 1)

    f_res = await db.execute(select(User).where(User.user_id == friend_id))
    friend_user = f_res.scalars().first()
    if friend_user:
        friend_user.friends_count = max(0, friend_user.friends_count - 1)

    await db.commit()

    target_name = friend_user.full_name if friend_user else "người dùng"
    return GenericFriendsActionResponse(
        success=True,
        message=f"Đã huỷ kết bạn với {target_name}",
        data={"friend_user_id": str(friend_id)}
    )


@router.post("/follow", response_model=GenericFriendsActionResponse)
async def follow_user(
    payload: FollowRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """Theo dõi 1 chiều một công dân xanh"""
    current_user, _ = auth_data
    target_id = payload.target_user_id

    if current_user.user_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "CANNOT_FOLLOW_SELF", "message": "Không thể tự theo dõi chính mình"}
        )

    t_res = await db.execute(select(User).where(User.user_id == target_id, User.deleted_at.is_(None)))
    target_user = t_res.scalars().first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại"}
        )

    fol_res = await db.execute(
        select(UserFollow).where(
            UserFollow.follower_id == current_user.user_id,
            UserFollow.following_id == target_id
        )
    )
    existing_follow = fol_res.scalars().first()

    if existing_follow:
        existing_follow.deleted_at = None
        existing_follow.created_at = datetime.now(timezone.utc)
    else:
        new_follow = UserFollow(
            follow_id=uuid.uuid4(),
            follower_id=current_user.user_id,
            following_id=target_id
        )
        db.add(new_follow)

    await db.commit()

    return GenericFriendsActionResponse(
        success=True,
        message=f"Đang theo dõi {target_user.full_name}",
        data={"following_id": str(target_id), "is_following": True}
    )


@router.post("/unfollow", response_model=GenericFriendsActionResponse)
async def unfollow_user(
    payload: FollowRequest,
    auth_data: Tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """Bỏ theo dõi (soft delete bản ghi user_follows)"""
    current_user, _ = auth_data
    target_id = payload.target_user_id

    fol_res = await db.execute(
        select(UserFollow).where(
            UserFollow.follower_id == current_user.user_id,
            UserFollow.following_id == target_id,
            UserFollow.deleted_at.is_(None)
        )
    )
    existing_follow = fol_res.scalars().first()

    if existing_follow:
        existing_follow.deleted_at = datetime.now(timezone.utc)
        await db.commit()

    return GenericFriendsActionResponse(
        success=True,
        message="Đã bỏ theo dõi",
        data={"following_id": str(target_id), "is_following": False}
    )
