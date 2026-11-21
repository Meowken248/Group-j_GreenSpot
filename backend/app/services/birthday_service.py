"""
Service: Banner Sinh nhật bạn bè & Thiệp xanh sinh thái (Feature STT 17)
[MOCK/STUB MODE]
Giữ nguyên Constants, Schemas, và helper types để Feed và các component liên kết không bị lỗi.
"""

import calendar
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rbac import User

# Múi giờ Việt Nam (UTC+7)
VN_TZ = timezone(timedelta(hours=7))

# Điểm thưởng nhỏ khi tặng thiệp xanh (SRS trang 145)
BIRTHDAY_CARD_POINTS = 5
BIRTHDAY_DAILY_POINTS_CAP = 25
BIRTHDAY_BANNER_LIMIT = 3
MAX_WISH_LENGTH = 200

DEFAULT_SUGGESTION = (
    "Chúc {name} một ngày sinh nhật thật rực rỡ, nhiều sức khoẻ và luôn giữ "
    "thói quen sống xanh nhé! 🌱"
)

BANNED_TOKENS = frozenset(
    {
        "dm", "đm", "dmm", "đmm", "dit", "địt", "deo", "đéo", "vcl", "vl",
        "cak", "cặc", "lon", "lồn", "buồi", "đĩ", "điếm", "súc vật", "óc chó",
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
]
CARD_TEMPLATE_MAP: Dict[str, Dict[str, str]] = {
    item["card_id"]: item for item in BIRTHDAY_CARD_TEMPLATES
}


def today_vn() -> date:
    """Ngày hiện tại theo múi giờ Việt Nam"""
    return datetime.now(VN_TZ).date()


def get_display_name(full_name: str) -> str:
    parts = (full_name or "").strip().split()
    return parts[-1] if parts else "bạn"


def build_suggestion(template_text: Optional[str], full_name: str) -> str:
    return (template_text or DEFAULT_SUGGESTION).replace("{name}", get_display_name(full_name))


def contains_banned_content(message: str) -> bool:
    normalized = " ".join(re.findall(r"[\w]+", (message or "").casefold()))
    tokens = normalized.split()
    return any(token in BANNED_TOKENS for token in tokens)


def calculate_age(date_of_birth: Optional[date], today: Optional[date] = None) -> int:
    if not date_of_birth:
        return 0
    today = today or today_vn()
    passed_birthday = (today.month, today.day) >= (date_of_birth.month, date_of_birth.day)
    return max(today.year - date_of_birth.year - (0 if passed_birthday else 1), 0)


async def get_today_birthdays(
    db: AsyncSession,
    current_user: User,
    limit: int = BIRTHDAY_BANNER_LIMIT,
) -> dict:
    """Mock/Stub: Danh sách bạn bè có sinh nhật hôm nay"""
    today = today_vn()
    return {
        "items": [],
        "total": 0,
        "has_more": False,
        "limit": limit,
        "today": today,
        "points_per_card": BIRTHDAY_CARD_POINTS,
        "daily_points_cap": BIRTHDAY_DAILY_POINTS_CAP,
        "daily_points_earned": 0,
        "daily_reward_limit_reached": False,
        "card_templates": BIRTHDAY_CARD_TEMPLATES,
        "default_suggestion": DEFAULT_SUGGESTION,
    }


async def send_birthday_wish(
    db: AsyncSession,
    sender: User,
    recipient_id: uuid.UUID,
    wish_type: str,
    message: str,
    card_template_id: Optional[str] = None,
) -> dict:
    """Mock/Stub: Gửi lời chúc / thiệp xanh sinh nhật"""
    return {
        "success": True,
        "wish_id": uuid.uuid4(),
        "wish_type": wish_type,
        "recipient_id": recipient_id,
        "recipient_name": "Người bạn",
        "message": "Đã gửi lời chúc xanh (Mock)!",
        "points_awarded": 0,
        "daily_limit_reached": False,
        "sender_total_green_points": getattr(sender, "total_green_points", 0),
    }


async def get_received_wishes(
    db: AsyncSession,
    current_user: User,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """Mock/Stub: Danh sách lời chúc đã nhận"""
    return {
        "items": [],
        "total": 0,
        "unread_count": 0,
        "has_more": False,
        "limit": limit,
        "offset": offset,
    }


async def mark_wishes_read(
    db: AsyncSession,
    current_user: User,
    wish_ids: Optional[Sequence[uuid.UUID]] = None,
) -> dict:
    """Mock/Stub: Đánh dấu đã đọc lời chúc"""
    return {
        "success": True,
        "marked_count": 0,
        "unread_count": 0,
    }
