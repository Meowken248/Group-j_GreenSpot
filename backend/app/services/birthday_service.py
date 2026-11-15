"""
Service: Banner Sinh nhật bạn bè & Thiệp xanh sinh thái (Feature STT 17)
Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 147)

Nghiệp vụ chuẩn hoá:
- Chỉ lấy ngày sinh của bạn bè (Friendship chưa xoá mềm) đang hoạt động và
  đã bật "Hiển thị ngày sinh với bạn bè" (users.show_birthday = true).
- Mỗi cặp bạn bè tối đa 01 lời chúc + 01 thiệp xanh / ngày sinh nhật.
- Tặng thiệp xanh: cộng điểm thưởng nhỏ cho cả người gửi và người nhận,
  tối đa 25 điểm/ngày cho mỗi người gửi (chống lạm dụng).
- Lời chúc tối đa 200 ký tự, lọc nội dung không phù hợp.
"""

import calendar
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import and_, case, extract, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.birthday import BirthdayWish, BirthdayWishType
from app.models.friends import Friendship
from app.models.profile import CitizenLevel, UserActivity
from app.models.rbac import User

# Múi giờ Việt Nam (UTC+7, không có giờ mùa hè) - dùng để xác định "hôm nay"
VN_TZ = timezone(timedelta(hours=7))

# Điểm thưởng nhỏ khi tặng thiệp xanh (SRS trang 145)
BIRTHDAY_CARD_POINTS = 5
# Hạn mức điểm thưởng sinh nhật mỗi ngày của một người gửi (chống lạm dụng)
BIRTHDAY_DAILY_POINTS_CAP = 25
# Số bạn bè sinh nhật hiển thị mặc định trên banner Bảng tin
BIRTHDAY_BANNER_LIMIT = 3
MAX_WISH_LENGTH = 200

DEFAULT_SUGGESTION = (
    "Chúc {name} một ngày sinh nhật thật rực rỡ, nhiều sức khoẻ và luôn giữ "
    "thói quen sống xanh nhé! 🌱"
)

# Bộ lọc nội dung không phù hợp (chuẩn hoá chữ thường, không dấu câu)
BANNED_TOKENS = frozenset(
    {
        "dm", "đm", "dmm", "đmm", "dit", "địt", "deo", "đéo", "vcl", "vl",
        "cak", "cặc", "lon", "lồn", "buồi", "đĩ", "điếm", "súc vật", "óc chó",
        "mẹ mày", "chết mày", "đồ ngu", "thằng ngu", "con ngu", "đần độn",
    }
)

BIRTHDAY_CARD_TEMPLATES: List[Dict[str, str]] = [
    {
        "card_id": "TREE_OF_HOPE",
        "name": "Mầm Xanh Hy Vọng",
        "tagline": "Gieo một mầm xanh cho một năm mới bình an",
        "icon": "🌱",
        "gradient_from": "#ecfdf5",
        "gradient_to": "#bbf7d0",
        "accent_color": "#15803d",
        "suggestion": (
            "Chúc {name} tuổi mới thật nhiều sức khoẻ, vạn điều như ý và luôn giữ "
            "thói quen sống xanh nhé! 🌱"
        ),
    },
    {
        "card_id": "EARTH_GUARDIAN",
        "name": "Người Giữ Trái Đất",
        "tagline": "Cùng nhau giữ hành tinh thêm xanh",
        "icon": "🌍",
        "gradient_from": "#eff6ff",
        "gradient_to": "#bfdbfe",
        "accent_color": "#1d4ed8",
        "suggestion": (
            "Sinh nhật vui vẻ, {name} ơi! Mong năm mới bạn tràn đầy năng lượng để "
            "cùng mình lan toả lối sống xanh đến mọi người. 🌍"
        ),
    },
    {
        "card_id": "RECYCLE_HERO",
        "name": "Chiến Binh Tái Chế",
        "tagline": "Tái chế hôm nay, tương lai ngày mai",
        "icon": "♻️",
        "gradient_from": "#f0fdfa",
        "gradient_to": "#a7f3d0",
        "accent_color": "#0f766e",
        "suggestion": (
            "{name} thân mến, chúc bạn một ngày sinh nhật thật rực rỡ! Cảm ơn bạn đã "
            "luôn là một chiến binh tái chế của GreenSpot. ♻️"
        ),
    },
    {
        "card_id": "BLOOMING_FUTURE",
        "name": "Hoa Nở Tương Lai",
        "tagline": "Gieo hạt hôm nay, nở hoa ngày mai",
        "icon": "🌸",
        "gradient_from": "#fdf2f8",
        "gradient_to": "#fbcfe8",
        "accent_color": "#be185d",
        "suggestion": (
            "Happy birthday {name}! Chúc bạn một năm mới ngập tràn niềm vui, yêu thương "
            "và thật nhiều chuyến đi xanh. 🌸"
        ),
    },
]
CARD_TEMPLATE_MAP: Dict[str, Dict[str, str]] = {
    item["card_id"]: item for item in BIRTHDAY_CARD_TEMPLATES
}



# =========================================================================
# HELPERS
# =========================================================================

def today_vn() -> date:
    """Ngày hiện tại theo múi giờ Việt Nam"""
    return datetime.now(VN_TZ).date()


def get_display_name(full_name: str) -> str:
    """Lấy tên gọi ngắn (từ cuối cùng) để điền gợi ý lời chúc"""
    parts = (full_name or "").strip().split()
    return parts[-1] if parts else "bạn"


def build_suggestion(template_text: Optional[str], full_name: str) -> str:
    """Điền sẵn gợi ý lời chúc với tên người nhận"""
    return (template_text or DEFAULT_SUGGESTION).replace("{name}", get_display_name(full_name))


def contains_banned_content(message: str) -> bool:
    """Phát hiện nội dung không phù hợp trong lời chúc"""
    normalized = " ".join(re.findall(r"[\w]+", (message or "").casefold()))
    tokens = normalized.split()
    if any(token in BANNED_TOKENS for token in tokens):
        return True
    return any(phrase in normalized for phrase in BANNED_TOKENS if " " in phrase)


def calculate_age(date_of_birth: Optional[date], today: Optional[date] = None) -> int:
    """Tính tuổi hiện tại theo ngày sinh"""
    if not date_of_birth:
        return 0
    today = today or today_vn()
    passed_birthday = (today.month, today.day) >= (date_of_birth.month, date_of_birth.day)
    return max(today.year - date_of_birth.year - (0 if passed_birthday else 1), 0)


def _birthday_match_conditions(today: date):
    """
    Điều kiện so khớp ngày/tháng sinh.
    Xử lý riêng 29/02: vào ngày 28/02 của năm không nhuận vẫn chúc mừng.
    """
    base = and_(
        extract("month", User.date_of_birth) == today.month,
        extract("day", User.date_of_birth) == today.day,
    )
    if today.month == 2 and today.day == 28 and not calendar.isleap(today.year):
        return or_(
            base,
            and_(
                extract("month", User.date_of_birth) == 2,
                extract("day", User.date_of_birth) == 29,
            ),
        )
    return base


def _birthday_today(date_of_birth: Optional[date], today: date) -> bool:
    """Kiểm tra một ngày sinh có rơi vào hôm nay hay không (xử lý 29/02)"""
    if not date_of_birth:
        return False
    if (date_of_birth.month, date_of_birth.day) == (today.month, today.day):
        return True
    return (
        today.month == 2
        and today.day == 28
        and not calendar.isleap(today.year)
        and (date_of_birth.month, date_of_birth.day) == (2, 29)
    )


def _friend_ids_subquery(user_id: uuid.UUID):
    """Subquery danh sách user_id là bạn bè (chưa xoá mềm) của một người dùng"""
    return select(
        case(
            (Friendship.user_id_1 == user_id, Friendship.user_id_2),
            else_=Friendship.user_id_1,
        )
    ).where(
        or_(Friendship.user_id_1 == user_id, Friendship.user_id_2 == user_id),
        Friendship.deleted_at.is_(None),
    )


async def _are_friends(db: AsyncSession, user_a: uuid.UUID, user_b: uuid.UUID) -> bool:
    """Kiểm tra hai người dùng có phải bạn bè đang hoạt động hay không"""
    pair = (min(user_a, user_b), max(user_a, user_b))
    found = await db.scalar(
        select(Friendship.friendship_id).where(
            Friendship.user_id_1 == pair[0],
            Friendship.user_id_2 == pair[1],
            Friendship.deleted_at.is_(None),
        )
    )
    return found is not None


async def _get_citizen_level_names(db: AsyncSession, users: Sequence[User]) -> Dict[uuid.UUID, str]:
    """Ánh xạ điểm xanh hiện tại sang tên cấp bậc Công dân Xanh"""
    if not users:
        return {}
    levels = (
        await db.execute(
            select(CitizenLevel.level_name, CitizenLevel.min_points)
            .where(CitizenLevel.deleted_at.is_(None))
            .order_by(CitizenLevel.min_points.asc())
        )
    ).all()
    if not levels:
        return {}

    mapping: Dict[uuid.UUID, str] = {}
    for user in users:
        level_name = levels[0][0]
        for name, min_points in levels:
            if user.total_green_points >= min_points:
                level_name = name
        mapping[user.user_id] = level_name
    return mapping


async def _daily_points_earned(db: AsyncSession, sender_id: uuid.UUID, today: date) -> int:
    """Tổng điểm thưởng sinh nhật người gửi đã nhận trong ngày"""
    total = await db.scalar(
        select(func.coalesce(func.sum(BirthdayWish.points_awarded), 0)).where(
            BirthdayWish.sender_id == sender_id,
            BirthdayWish.birthday_date == today,
            BirthdayWish.deleted_at.is_(None),
        )
    )
    return int(total or 0)


def _error(status_code: int, error_code: str, message: str) -> HTTPException:
    """Lỗi nghiệp vụ trả về theo cấu trúc {error_code, message} thống nhất"""
    return HTTPException(
        status_code=status_code,
        detail={"error_code": error_code, "message": message},
    )


# =========================================================================
# 1. DANH SÁCH BẠN BÈ SINH NHẬT HÔM NAY
# =========================================================================

async def get_today_birthdays(
    db: AsyncSession,
    current_user: User,
    limit: int = BIRTHDAY_BANNER_LIMIT,
) -> dict:
    """Lấy danh sách bạn bè có sinh nhật hôm nay (tối đa `limit` người)"""
    today = today_vn()
    friend_ids = _friend_ids_subquery(current_user.user_id)

    base_conditions = (
        User.user_id.in_(friend_ids),
        User.deleted_at.is_(None),
        User.status == "ACTIVE",
        User.show_birthday.is_(True),
        User.date_of_birth.isnot(None),
        _birthday_match_conditions(today),
    )

    total = int(
        await db.scalar(select(func.count()).select_from(User).where(*base_conditions)) or 0
    )

    friends = (
        (
            await db.execute(
                select(User).where(*base_conditions).order_by(User.full_name.asc()).limit(limit)
            )
        )
        .scalars()
        .all()
    )

    # Trạng thái đã chúc / đã tặng thiệp trong hôm nay
    sent_rows = (
        await db.execute(
            select(BirthdayWish.recipient_id, BirthdayWish.wish_type).where(
                BirthdayWish.sender_id == current_user.user_id,
                BirthdayWish.birthday_date == today,
                BirthdayWish.deleted_at.is_(None),
            )
        )
    ).all()
    sent_map: Dict[uuid.UUID, set] = {}
    for recipient_id, wish_type in sent_rows:
        sent_map.setdefault(recipient_id, set()).add(wish_type)

    level_names = await _get_citizen_level_names(db, friends)
    daily_earned = await _daily_points_earned(db, current_user.user_id, today)

    items = [
        {
            "user_id": friend.user_id,
            "full_name": friend.full_name,
            "avatar_url": friend.avatar_url,
            "date_of_birth": friend.date_of_birth,
            "age": calculate_age(friend.date_of_birth, today),
            "citizen_level_name": level_names.get(friend.user_id),
            "card_sent_today": BirthdayWishType.CARD.value in sent_map.get(friend.user_id, set()),
            "wish_sent_today": BirthdayWishType.MESSAGE.value in sent_map.get(friend.user_id, set()),
        }
        for friend in friends
    ]

    return {
        "items": items,
        "total": total,
        "has_more": total > len(items),
        "limit": limit,
        "today": today,
        "points_per_card": BIRTHDAY_CARD_POINTS,
        "daily_points_cap": BIRTHDAY_DAILY_POINTS_CAP,
        "daily_points_earned": daily_earned,
        "daily_reward_limit_reached": daily_earned >= BIRTHDAY_DAILY_POINTS_CAP,
        "card_templates": BIRTHDAY_CARD_TEMPLATES,
        "default_suggestion": DEFAULT_SUGGESTION,
    }


# =========================================================================
# 2. GỬI LỜI CHÚC / TẶNG THIỆP XANH
# =========================================================================

async def send_birthday_wish(
    db: AsyncSession,
    sender: User,
    recipient_id: uuid.UUID,
    wish_type: str,
    message: str,
    card_template_id: Optional[str] = None,
) -> dict:
    """Gửi lời chúc hoặc tặng thiệp xanh cho một người bạn trong ngày sinh nhật"""
    today = today_vn()
    message = " ".join((message or "").split())

    # 1. Kiểm tra nội dung lời chúc
    if not message:
        raise _error(status.HTTP_400_BAD_REQUEST, "MESSAGE_REQUIRED", "Vui lòng nhập lời chúc")
    if len(message) > MAX_WISH_LENGTH:
        raise _error(
            status.HTTP_400_BAD_REQUEST,
            "MESSAGE_TOO_LONG",
            f"Lời chúc tối đa {MAX_WISH_LENGTH} ký tự",
        )
    if contains_banned_content(message):
        raise _error(
            status.HTTP_400_BAD_REQUEST,
            "INAPPROPRIATE_CONTENT",
            "Lời chúc chứa nội dung không phù hợp",
        )

    # 2. Kiểm tra người nhận hợp lệ (tồn tại, đang hoạt động, là bạn bè)
    recipient = await db.scalar(
        select(User).where(User.user_id == recipient_id, User.deleted_at.is_(None))
    )
    if (
        recipient is None
        or recipient.user_id == sender.user_id
        or recipient.status != "ACTIVE"
        or not await _are_friends(db, sender.user_id, recipient.user_id)
    ):
        raise _error(
            status.HTTP_409_CONFLICT,
            "RECIPIENT_NOT_FRIEND",
            "Không thể gửi vì người này không còn trong danh sách bạn bè",
        )

    # 3. Người nhận phải đang bật hiển thị ngày sinh với bạn bè
    if not recipient.show_birthday:
        raise _error(
            status.HTTP_400_BAD_REQUEST,
            "BIRTHDAY_HIDDEN",
            "Người này đã tắt hiển thị ngày sinh với bạn bè",
        )

    # 4. Hôm nay phải đúng là sinh nhật của người nhận
    if not _birthday_today(recipient.date_of_birth, today):
        raise _error(
            status.HTTP_400_BAD_REQUEST,
            "NOT_BIRTHDAY_TODAY",
            "Hôm nay không phải sinh nhật của người này",
        )

    # 5. Thiệp xanh bắt buộc chọn mẫu thiệp hợp lệ
    if wish_type == BirthdayWishType.CARD.value:
        if not card_template_id:
            raise _error(
                status.HTTP_400_BAD_REQUEST,
                "CARD_TEMPLATE_REQUIRED",
                "Vui lòng chọn một mẫu thiệp xanh",
            )
        if card_template_id not in CARD_TEMPLATE_MAP:
            raise _error(
                status.HTTP_400_BAD_REQUEST,
                "CARD_TEMPLATE_INVALID",
                "Mẫu thiệp không hợp lệ, vui lòng chọn lại",
            )

    # 6. Chống gửi trùng trong ngày sinh nhật
    existed = await db.scalar(
        select(BirthdayWish.wish_id).where(
            BirthdayWish.sender_id == sender.user_id,
            BirthdayWish.recipient_id == recipient.user_id,
            BirthdayWish.birthday_date == today,
            BirthdayWish.wish_type == wish_type,
            BirthdayWish.deleted_at.is_(None),
        )
    )
    if existed:
        raise _error(
            status.HTTP_409_CONFLICT,
            "ALREADY_SENT",
            "Bạn đã tặng thiệp cho người này hôm nay"
            if wish_type == BirthdayWishType.CARD.value
            else "Bạn đã gửi lời chúc cho người này hôm nay",
        )

    # 7. Điểm thưởng nhỏ: chỉ áp dụng cho thiệp xanh và có hạn mức ngày
    points = 0
    daily_limit_reached = False
    if wish_type == BirthdayWishType.CARD.value:
        earned_today = await _daily_points_earned(db, sender.user_id, today)
        if earned_today + BIRTHDAY_CARD_POINTS <= BIRTHDAY_DAILY_POINTS_CAP:
            points = BIRTHDAY_CARD_POINTS
        else:
            daily_limit_reached = True

    wish = BirthdayWish(
        sender_id=sender.user_id,
        recipient_id=recipient.user_id,
        wish_type=wish_type,
        card_template_id=card_template_id if wish_type == BirthdayWishType.CARD.value else None,
        message=message,
        birthday_date=today,
        points_awarded=points,
    )
    db.add(wish)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise _error(
            status.HTTP_409_CONFLICT,
            "ALREADY_SENT",
            "Bạn đã gửi nội dung này cho người này trong hôm nay",
        )

    # 8. Cộng điểm xanh cho cả người gửi và người nhận + ghi nhật ký hoạt động
    if points > 0:
        await db.execute(
            update(User)
            .where(User.user_id.in_([sender.user_id, recipient.user_id]))
            .values(total_green_points=User.total_green_points + points)
        )
        db.add_all(
            [
                UserActivity(
                    user_id=sender.user_id,
                    activity_type="BIRTHDAY_CARD_SENT",
                    title=f"Tặng thiệp xanh sinh nhật cho {recipient.full_name}",
                    description=message,
                    points=points,
                ),
                UserActivity(
                    user_id=recipient.user_id,
                    activity_type="BIRTHDAY_CARD_RECEIVED",
                    title=f"Nhận thiệp xanh sinh nhật từ {sender.full_name}",
                    description=message,
                    points=points,
                ),
            ]
        )

    await db.commit()
    await db.refresh(wish)
    await db.refresh(sender)

    if wish_type == BirthdayWishType.CARD.value and points > 0:
        success_message = (
            f"Đã gửi thiệp xanh đến {recipient.full_name}. Bạn nhận +{points} điểm xanh!"
        )
    elif wish_type == BirthdayWishType.CARD.value:
        success_message = (
            f"Đã gửi thiệp xanh đến {recipient.full_name}. "
            "Hôm nay bạn đã đạt giới hạn điểm thưởng sinh nhật."
        )
    else:
        success_message = f"Đã gửi lời chúc xanh đến {recipient.full_name}!"

    return {
        "success": True,
        "wish_id": wish.wish_id,
        "wish_type": wish.wish_type,
        "recipient_id": recipient.user_id,
        "recipient_name": recipient.full_name,
        "message": success_message,
        "points_awarded": points,
        "daily_limit_reached": daily_limit_reached,
        "sender_total_green_points": sender.total_green_points,
    }


# =========================================================================
# 3. HỘP THƯ LỜI CHÚC ĐÃ NHẬN (trang cá nhân / chuông thông báo)
# =========================================================================

async def get_received_wishes(
    db: AsyncSession,
    current_user: User,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """Danh sách lời chúc / thiệp xanh người dùng đã nhận (mới nhất trước)"""
    base_conditions = (
        BirthdayWish.recipient_id == current_user.user_id,
        BirthdayWish.deleted_at.is_(None),
    )

    total = int(
        await db.scalar(select(func.count()).select_from(BirthdayWish).where(*base_conditions)) or 0
    )
    unread_count = int(
        await db.scalar(
            select(func.count())
            .select_from(BirthdayWish)
            .where(*base_conditions, BirthdayWish.is_read.is_(False))
        )
        or 0
    )

    rows = (
        await db.execute(
            select(BirthdayWish, User)
            .join(User, User.user_id == BirthdayWish.sender_id)
            .where(*base_conditions)
            .order_by(BirthdayWish.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).all()

    items = [
        {
            "wish_id": wish.wish_id,
            "sender_id": wish.sender_id,
            "sender_name": sender.full_name,
            "sender_avatar_url": sender.avatar_url,
            "wish_type": wish.wish_type,
            "card_template_id": wish.card_template_id,
            "message": wish.message,
            "points_awarded": wish.points_awarded,
            "is_read": wish.is_read,
            "birthday_date": wish.birthday_date,
            "created_at": wish.created_at,
        }
        for wish, sender in rows
    ]

    return {
        "items": items,
        "total": total,
        "unread_count": unread_count,
        "has_more": offset + len(items) < total,
        "limit": limit,
        "offset": offset,
    }


async def mark_wishes_read(
    db: AsyncSession,
    current_user: User,
    wish_ids: Optional[Sequence[uuid.UUID]] = None,
) -> dict:
    """Đánh dấu đã đọc lời chúc (mặc định toàn bộ hộp thư)"""
    conditions = [
        BirthdayWish.recipient_id == current_user.user_id,
        BirthdayWish.deleted_at.is_(None),
        BirthdayWish.is_read.is_(False),
    ]
    if wish_ids:
        conditions.append(BirthdayWish.wish_id.in_(list(wish_ids)))

    result = await db.execute(
        update(BirthdayWish).where(*conditions).values(is_read=True, read_at=func.now())
    )
    await db.commit()

    unread_count = int(
        await db.scalar(
            select(func.count())
            .select_from(BirthdayWish)
            .where(
                BirthdayWish.recipient_id == current_user.user_id,
                BirthdayWish.deleted_at.is_(None),
                BirthdayWish.is_read.is_(False),
            )
        )
        or 0
    )

    return {
        "success": True,
        "marked_count": int(result.rowcount or 0),
        "unread_count": unread_count,
    }




