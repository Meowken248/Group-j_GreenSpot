import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rbac import LoginAttempt


# =========================================================================
# CẤU HÌNH JWT & TOKEN CHO GREENSPOT
# =========================================================================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "greenspot_super_secret_jwt_key_2026_safe_and_strong")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15      # Access Token ngắn hạn: 15 phút
REFRESH_TOKEN_EXPIRE_DAYS = 7        # Refresh Token dài hạn: 7 ngày


def generate_otp_code() -> str:
    """Sinh ngẫu nhiên mã OTP gồm 6 chữ số (000000 - 999999) chuẩn bảo mật mật mã học"""
    return f"{secrets.randbelow(1000000):06d}"


def hash_otp_code(otp_code: str) -> str:
    """Băm mã OTP bằng SHA-256 để lưu trữ an toàn trong cơ sở dữ liệu"""
    return hashlib.sha256(otp_code.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """
    Băm mật khẩu người dùng bằng PBKDF2-HMAC-SHA256 chuẩn bảo mật cao.
    Không phụ thuộc vào các thư viện C ngoài để đảm bảo tính ổn định tối đa.
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations=100_000
    )
    return f"{salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực mật khẩu người dùng đối chiếu với chuỗi băm lưu trữ"""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 2:
            return False
        salt_hex, key_hex = parts
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        
        computed_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            iterations=100_000
        )
        return secrets.compare_digest(computed_key, expected_key)
    except Exception:
        return False


# =========================================================================
# QUẢN LÝ JWT ACCESS TOKEN & REFRESH TOKEN
# =========================================================================

def create_access_token(
    user_id: str,
    email: str,
    role: str,
    session_id: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Tạo JWT Access Token ngắn hạn (15 phút) chứa định danh và session_id"""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "session_id": str(session_id),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Giải mã và xác thực chữ ký JWT Access Token. Trả về None nếu hết hạn hoặc không hợp lệ"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def generate_refresh_token() -> str:
    """Sinh chuỗi ngẫu nhiên bảo mật cao làm Refresh Token (64 bytes URL-safe)"""
    return secrets.token_urlsafe(64)


def hash_refresh_token(refresh_token: str) -> str:
    """Băm Refresh Token bằng SHA-256 để lưu trữ an toàn trong CSDL"""
    return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()


# =========================================================================
# PHÂN TÍCH THIẾT BỊ USER-AGENT (VIETNAMESE FORMAT)
# =========================================================================

def parse_user_agent(user_agent: Optional[str]) -> str:
    """
    Phân tích chuỗi User-Agent sang định dạng tiếng Việt thân thiện:
    Ví dụ: 'Chrome trên Windows', 'Safari trên iOS', 'Firefox trên macOS'.
    Nếu không nhận diện được, trả về 'Thiết bị không xác định'.
    """
    if not user_agent or not user_agent.strip():
        return "Thiết bị không xác định"
    
    ua = user_agent.lower()
    
    # 1. Hệ điều hành
    os_name = None
    if "windows" in ua or "win32" in ua or "win64" in ua:
        os_name = "Windows"
    elif "iphone" in ua or "ipad" in ua or "ipod" in ua:
        os_name = "iOS"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "macOS"
    elif "android" in ua:
        os_name = "Android"
    elif "ubuntu" in ua:
        os_name = "Ubuntu"
    elif "linux" in ua:
        os_name = "Linux"
        
    # 2. Trình duyệt
    browser_name = None
    if "edg/" in ua or "edge/" in ua:
        browser_name = "Edge"
    elif "opr/" in ua or "opera" in ua:
        browser_name = "Opera"
    elif "coccoc/" in ua:
        browser_name = "Cốc Cốc"
    elif "chrome/" in ua and "chromium" not in ua and "edg/" not in ua:
        browser_name = "Chrome"
    elif "firefox/" in ua:
        browser_name = "Firefox"
    elif "safari/" in ua and "chrome/" not in ua:
        browser_name = "Safari"

    if browser_name and os_name:
        return f"{browser_name} trên {os_name}"
    elif browser_name:
        return browser_name
    elif os_name:
        return f"Thiết bị {os_name}"
    
    return "Thiết bị không xác định"


# =========================================================================
# KIỂM SOÁT THỬ SAI VÀ KHÓA ĐĂNG NHẬP 15 PHÚT
# =========================================================================

async def check_login_locked(db: AsyncSession, email: str) -> Tuple[bool, Optional[int]]:
    """
    Kiểm tra xem email này có đang trong thời gian bị khóa 15 phút do sai quá 5 lần hay không:
    Trả về: (is_locked, remaining_minutes)
    """
    clean_email = email.strip().lower()
    now = datetime.now(timezone.utc)
    
    result = await db.execute(select(LoginAttempt).where(LoginAttempt.email == clean_email))
    attempt = result.scalar_one_or_none()
    
    if not attempt:
        return False, None
        
    if attempt.locked_until and now < attempt.locked_until:
        remaining_secs = int((attempt.locked_until - now).total_seconds())
        remaining_mins = max(1, (remaining_secs + 59) // 60)
        return True, remaining_mins
        
    return False, None


async def record_login_failure(db: AsyncSession, email: str) -> Tuple[int, bool]:
    """
    Ghi nhận một lần đăng nhập thất bại:
    - Nếu lần thử trước cách đây hơn 15 phút, reset count về 1.
    - Nếu count đạt 5, khóa 15 phút.
    Trả về: (failed_count, is_locked)
    """
    clean_email = email.strip().lower()
    now = datetime.now(timezone.utc)
    fifteen_mins_ago = now - timedelta(minutes=15)
    
    result = await db.execute(select(LoginAttempt).where(LoginAttempt.email == clean_email))
    attempt = result.scalar_one_or_none()
    
    if not attempt:
        attempt = LoginAttempt(
            email=clean_email,
            failed_count=1,
            locked_until=None,
            last_attempt_at=now
        )
        db.add(attempt)
        await db.commit()
        return 1, False
        
    # Nếu lần thử trước cách đây hơn 15 phút và hiện tại không bị khóa, reset về 1
    if attempt.last_attempt_at < fifteen_mins_ago and (not attempt.locked_until or now >= attempt.locked_until):
        attempt.failed_count = 1
        attempt.locked_until = None
        attempt.last_attempt_at = now
    else:
        attempt.failed_count += 1
        attempt.last_attempt_at = now
        
    if attempt.failed_count >= 5:
        attempt.locked_until = now + timedelta(minutes=15)
        await db.commit()
        return attempt.failed_count, True
        
    await db.commit()
    return attempt.failed_count, False


async def record_login_success(db: AsyncSession, email: str) -> None:
    """Xóa bỏ hoặc reset trạng thái thử sai sau khi đăng nhập thành công"""
    clean_email = email.strip().lower()
    result = await db.execute(select(LoginAttempt).where(LoginAttempt.email == clean_email))
    attempt = result.scalar_one_or_none()
    if attempt:
        attempt.failed_count = 0
        attempt.locked_until = None
        await db.commit()

