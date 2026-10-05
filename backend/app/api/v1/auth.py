import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, Role, UserOTP, UserSession, LoginAttempt
from app.schemas.auth import (
    CitizenRegisterRequest,
    CitizenVerifyOtpRequest,
    CitizenResendOtpRequest,
    CitizenLoginRequest,
    CitizenLoginResponse,
    UserSummary,
    RefreshTokenRequest,
    RefreshTokenResponse,
    SessionListResponse,
    SessionItemResponse,
    RevokeSessionResponse,
    AuthSuccessResponse,
)
from app.services.email_service import EmailService
from app.utils.security import (
    generate_otp_code,
    hash_otp_code,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
    parse_user_agent,
    check_login_locked,
    record_login_failure,
    record_login_success,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


@router.post("/register", response_model=AuthSuccessResponse)
async def register_citizen(
    payload: CitizenRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 1: Đăng ký tài khoản công dân sinh thái và gửi OTP xác thực qua Email.
    - Chặn trùng email ACTIVE (409 Conflict).
    - Tự động cấp lại OTP và cập nhật thông tin nếu tài khoản ở trạng thái PENDING.
    - Giới hạn tốc độ (Rate limit): Tối đa 5 lần gửi OTP trong vòng 1 giờ cho cùng 1 email (429).
    """
    clean_email = payload.email.strip().lower()

    # 1. Kiểm tra Rate Limit: đếm số OTP đã gửi trong 1 giờ qua
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    rate_query = select(func.count(UserOTP.otp_id)).where(
        and_(
            UserOTP.email == clean_email,
            UserOTP.created_at >= one_hour_ago
        )
    )
    otp_count_result = await db.execute(rate_query)
    otp_count = otp_count_result.scalar() or 0

    if otp_count >= 5:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error_code": "RATE_LIMIT_EXCEEDED",
                "message": "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau 1 giờ"
            }
        )

    # 2. Kiểm tra tài khoản đã tồn tại trong CSDL
    user_query = select(User).where(User.email == clean_email)
    user_result = await db.execute(user_query)
    existing_user = user_result.scalar_one_or_none()

    # Trường hợp 1: Email đã thuộc về tài khoản đã kích hoạt (ACTIVE)
    if existing_user and existing_user.status == "ACTIVE":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error_code": "EMAIL_ALREADY_EXISTS",
                "message": "Email này đã được đăng ký. Vui lòng đăng nhập"
            }
        )

    # Sinh mã OTP 6 số mới và tính thời hạn 5 phút
    plain_otp = generate_otp_code()
    otp_hash = hash_otp_code(plain_otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Hủy hiệu lực các mã OTP cũ chưa dùng của email này
    deactivate_query = select(UserOTP).where(
        and_(UserOTP.email == clean_email, UserOTP.is_used == False)
    )
    old_otps_result = await db.execute(deactivate_query)
    for old_otp in old_otps_result.scalars():
        old_otp.is_used = True

    # Tạo bản ghi OTP mới
    new_otp = UserOTP(
        email=clean_email,
        otp_code_hash=otp_hash,
        otp_plain=plain_otp,
        expires_at=expires_at,
        failed_attempts=0,
        is_used=False,
        purpose="REGISTER"
    )
    db.add(new_otp)

    # Trường hợp 2: Email đã đăng ký nhưng ở trạng thái PENDING
    if existing_user and existing_user.status == "PENDING":
        existing_user.full_name = payload.full_name.strip()
        existing_user.password_hash = hash_password(payload.password)
        await db.commit()

        # Gửi email thông báo OTP
        sent = await EmailService.send_otp_email(clean_email, plain_otp, existing_user.full_name)
        if not sent:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "error_code": "EMAIL_SEND_FAILED",
                    "message": "Không thể gửi mã OTP. Vui lòng kiểm tra cấu hình email hoặc thử lại sau"
                }
            )

        return AuthSuccessResponse(
            success=True,
            message="Mã OTP đã được gửi đến email của bạn",
            email=clean_email
        )

    # Trường hợp 3: Đăng ký mới hoàn toàn
    # Đảm bảo vai trò CITIZEN tồn tại
    role_query = select(Role).where(Role.role_code == "CITIZEN")
    role_result = await db.execute(role_query)
    citizen_role = role_result.scalar_one_or_none()

    if not citizen_role:
        citizen_role = Role(
            role_code="CITIZEN",
            role_name="Công dân sinh thái",
            description="Người dùng thông thường đóng góp dữ liệu và nhận điểm thưởng xanh",
            is_system=True
        )
        db.add(citizen_role)
        await db.flush()

    new_user = User(
        email=clean_email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role_id=citizen_role.role_id,
        status="PENDING",
        reputation_score=100
    )
    db.add(new_user)
    await db.commit()

    # Gửi email thông báo OTP
    sent = await EmailService.send_otp_email(clean_email, plain_otp, new_user.full_name)
    if not sent:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error_code": "EMAIL_SEND_FAILED",
                "message": "Không thể gửi mã OTP. Vui lòng kiểm tra cấu hình email hoặc thử lại sau"
            }
        )

    return AuthSuccessResponse(
        success=True,
        message="Mã OTP đã được gửi đến email của bạn",
        email=clean_email
    )


@router.post("/verify-otp", response_model=AuthSuccessResponse)
async def verify_citizen_otp(
    payload: CitizenVerifyOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 2: Xác thực mã OTP 6 số để kích hoạt tài khoản Công dân số.
    - Kiểm tra tính hợp lệ và thời hạn 5 phút.
    - Đếm số lần nhập sai. Nếu đạt lần thứ 5, khóa OTP và yêu cầu gửi mã mới (403).
    - Nếu thành công: Chuyển User từ PENDING sang ACTIVE, đánh dấu OTP đã dùng (200).
    """
    clean_email = payload.email.strip().lower()
    clean_code = payload.otp_code.strip()

    # Tìm OTP mới nhất của email này
    otp_query = select(UserOTP).where(
        UserOTP.email == clean_email
    ).order_by(UserOTP.created_at.desc())
    
    otp_result = await db.execute(otp_query)
    latest_otp = otp_result.scalars().first()

    if not latest_otp or latest_otp.is_used:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_OTP",
                "message": "Mã sai hoặc đã hết hạn"
            }
        )

    # Kiểm tra nếu OTP này đã bị khóa do sai quá 5 lần trước đó
    if latest_otp.failed_attempts >= 5:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error_code": "MAX_ATTEMPTS_EXCEEDED",
                "message": "Bạn đã nhập sai quá 5 lần. Vui lòng gửi mã mới"
            }
        )

    now = datetime.now(timezone.utc)

    # 1. Kiểm tra hết hạn 5 phút
    if now > latest_otp.expires_at:
        latest_otp.failed_attempts += 1
        await db.commit()

        if latest_otp.failed_attempts >= 5:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error_code": "MAX_ATTEMPTS_EXCEEDED",
                    "message": "Bạn đã nhập sai quá 5 lần. Vui lòng gửi mã mới"
                }
            )

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_OTP",
                "message": "Mã sai hoặc đã hết hạn"
            }
        )

    # 2. Kiểm tra độ khớp của mã OTP (So sánh SHA-256)
    computed_hash = hash_otp_code(clean_code)
    if computed_hash != latest_otp.otp_code_hash:
        latest_otp.failed_attempts += 1
        await db.commit()

        # Kiểm tra nếu đây là lần sai thứ 5
        if latest_otp.failed_attempts >= 5:
            latest_otp.is_used = True
            await db.commit()
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error_code": "MAX_ATTEMPTS_EXCEEDED",
                    "message": "Bạn đã nhập sai quá 5 lần. Vui lòng gửi mã mới"
                }
            )

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_OTP",
                "message": "Mã sai hoặc đã hết hạn"
            }
        )

    # 3. Mã OTP hoàn toàn chính xác và còn hạn
    latest_otp.is_used = True

    # Kích hoạt tài khoản User từ PENDING sang ACTIVE
    user_query = select(User).where(User.email == clean_email)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if user:
        user.status = "ACTIVE"

    await db.commit()

    return AuthSuccessResponse(
        success=True,
        message="Kích hoạt tài khoản thành công",
        email=clean_email
    )


@router.post("/resend-otp", response_model=AuthSuccessResponse)
async def resend_citizen_otp(
    payload: CitizenResendOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Gửi lại mã OTP:
    - Kiểm tra Rate Limit: Quá 5 lần/giờ -> 429.
    - Hủy OTP cũ, reset số lần sai về 0, gia hạn 5 phút mới.
    - Gửi email thông báo mã mới.
    """
    clean_email = payload.email.strip().lower()

    # Kiểm tra User tồn tại và chưa active
    user_query = select(User).where(User.email == clean_email)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_REQUEST",
                "message": "Không tìm thấy yêu cầu xác thực cho email này"
            }
        )

    if user.status == "ACTIVE":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ALREADY_ACTIVE",
                "message": "Tài khoản này đã được kích hoạt. Vui lòng đăng nhập"
            }
        )

    # Kiểm tra Rate limit 5 lần/giờ
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    rate_query = select(func.count(UserOTP.otp_id)).where(
        and_(
            UserOTP.email == clean_email,
            UserOTP.created_at >= one_hour_ago
        )
    )
    otp_count_result = await db.execute(rate_query)
    otp_count = otp_count_result.scalar() or 0

    if otp_count >= 5:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error_code": "RATE_LIMIT_EXCEEDED",
                "message": "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau 1 giờ"
            }
        )

    # Hủy các OTP cũ chưa dùng
    deactivate_query = select(UserOTP).where(
        and_(UserOTP.email == clean_email, UserOTP.is_used == False)
    )
    old_otps_result = await db.execute(deactivate_query)
    for old_otp in old_otps_result.scalars():
        old_otp.is_used = True

    # Tạo OTP mới
    plain_otp = generate_otp_code()
    otp_hash = hash_otp_code(plain_otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    new_otp = UserOTP(
        email=clean_email,
        otp_code_hash=otp_hash,
        otp_plain=plain_otp,
        expires_at=expires_at,
        failed_attempts=0,
        is_used=False,
        purpose="REGISTER"
    )
    db.add(new_otp)
    await db.commit()

    # Gửi email mã mới
    sent = await EmailService.send_otp_email(clean_email, plain_otp, user.full_name)
    if not sent:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error_code": "EMAIL_SEND_FAILED",
                "message": "Không thể gửi mã OTP. Vui lòng kiểm tra cấu hình email hoặc thử lại sau"
            }
        )

    return AuthSuccessResponse(
        success=True,
        message="Mã OTP mới đã được gửi đến email của bạn",
        email=clean_email
    )


# =========================================================================
# PHỤ THUỘC XÁC THỰC ACCESS TOKEN & PHIÊN ĐĂNG NHẬP
# =========================================================================

async def get_current_user_and_session(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> tuple[User, UserSession]:
    """
    Dependency kiểm tra tính hợp lệ của Access Token và phiên thiết bị:
    - Thiếu/hỏng Token -> 401 TOKEN_EXPIRED
    - Phiên đã bị thu hồi (từ xa hoặc giới hạn 5 phiên) -> 401 SESSION_INVALID
    - Tài khoản bị khóa -> 401 SESSION_INVALID
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_MISSING", "message": "Vui lòng đăng nhập lại"}
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_EXPIRED", "message": "Vui lòng đăng nhập lại"}
        )
    
    session_id_str = payload.get("session_id")
    user_id_str = payload.get("sub")
    if not session_id_str or not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_INVALID", "message": "Vui lòng đăng nhập lại"}
        )
    
    try:
        session_id = uuid.UUID(session_id_str)
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_INVALID", "message": "Vui lòng đăng nhập lại"}
        )

    # 1. Kiểm tra phiên đăng nhập trong CSDL
    session_res = await db.execute(select(UserSession).where(UserSession.session_id == session_id))
    user_session = session_res.scalar_one_or_none()
    
    now = datetime.now(timezone.utc)
    if not user_session or user_session.revoked_at is not None or user_session.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "SESSION_INVALID", "message": "Vui lòng đăng nhập lại"}
        )
        
    # 2. Kiểm tra trạng thái tài khoản
    user_res = await db.execute(select(User).where(User.user_id == user_id))
    user = user_res.scalar_one_or_none()
    if not user or user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "SESSION_INVALID", "message": "Vui lòng đăng nhập lại"}
        )
        
    # Cập nhật thời điểm hoạt động gần nhất
    user_session.last_active_at = now
    await db.commit()
    
    return user, user_session


# =========================================================================
# CÁC ENDPOINT CHỨC NĂNG 2: ĐĂNG NHẬP, LÀM MỚI & QUẢN LÝ PHIÊN
# =========================================================================

@router.post("/login", response_model=CitizenLoginResponse)
async def login_citizen(
    payload: CitizenLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 1: Đăng nhập hệ thống & Khởi tạo phiên đa thiết bị:
    - Kiểm tra khóa 15 phút nếu đã nhập sai quá 5 lần (403 LOGIN_LOCKED).
    - Kiểm tra email và mật khẩu (nếu sai tăng số lần thử, lần thứ 5 khóa 15p).
    - Kiểm tra trạng thái PENDING -> 403 "Tài khoản chưa được kích hoạt. Kích hoạt ngay".
    - Kiểm tra trạng thái LOCKED -> 403 "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên".
    - Giới hạn tối đa 5 phiên (tự động thu hồi phiên cũ nhất nếu đã đủ 5).
    - Cấp cặp Token: Access Token (15m) + Refresh Token (7d).
    """
    clean_email = payload.email.strip().lower()

    # 1. Kiểm tra xem có đang bị khóa 15 phút không
    is_locked, remaining_mins = await check_login_locked(db, clean_email)
    if is_locked:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error_code": "LOGIN_LOCKED",
                "message": "Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút"
            }
        )

    # 2. Tìm tài khoản người dùng
    user_query = select(User).where(User.email == clean_email)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        failed_count, now_locked = await record_login_failure(db, clean_email)
        if now_locked:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error_code": "LOGIN_LOCKED",
                    "message": "Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút"
                }
            )
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error_code": "INVALID_CREDENTIALS",
                "message": "Email hoặc mật khẩu không đúng"
            }
        )

    # 3. Kiểm tra mật khẩu
    if not verify_password(payload.password, user.password_hash):
        failed_count, now_locked = await record_login_failure(db, clean_email)
        if now_locked:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error_code": "LOGIN_LOCKED",
                    "message": "Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút"
                }
            )
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error_code": "INVALID_CREDENTIALS",
                "message": "Email hoặc mật khẩu không đúng"
            }
        )

    # 4. Kiểm tra tài khoản chưa kích hoạt (PENDING)
    if user.status == "PENDING":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error_code": "ACCOUNT_NOT_ACTIVATED",
                "message": "Tài khoản chưa được kích hoạt. Kích hoạt ngay"
            }
        )

    # 5. Kiểm tra tài khoản bị khóa (LOCKED)
    if user.status != "ACTIVE":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error_code": "ACCOUNT_LOCKED",
                "message": "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên"
            }
        )

    # Đăng nhập thành công -> Xóa trạng thái thử sai
    await record_login_success(db, clean_email)

    now = datetime.now(timezone.utc)

    # 6. Giới hạn tối đa 5 phiên hoạt động đồng thời
    active_sessions_query = select(UserSession).where(
        and_(
            UserSession.user_id == user.user_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now
        )
    ).order_by(UserSession.last_active_at.asc())
    
    active_sessions_result = await db.execute(active_sessions_query)
    active_sessions = list(active_sessions_result.scalars().all())

    # Nếu đã có từ 5 phiên trở lên, thu hồi các phiên cũ nhất để còn tối đa 4 phiên
    if len(active_sessions) >= 5:
        sessions_to_revoke = active_sessions[: len(active_sessions) - 4]
        for old_s in sessions_to_revoke:
            old_s.revoked_at = now

    # 7. Nhận diện thiết bị từ User-Agent và IP
    user_agent_str = request.headers.get("user-agent")
    client_ip = request.client.host if request.client else None
    device_name = parse_user_agent(user_agent_str)

    # 8. Khởi tạo phiên mới & Cặp Token
    new_session_id = uuid.uuid4()
    raw_refresh_token = generate_refresh_token()
    refresh_hash = hash_refresh_token(raw_refresh_token)
    session_expires = now + timedelta(days=7)

    new_session = UserSession(
        session_id=new_session_id,
        user_id=user.user_id,
        refresh_token_hash=refresh_hash,
        device_name=device_name,
        ip_address=client_ip,
        user_agent=user_agent_str,
        expires_at=session_expires,
        last_active_at=now
    )
    db.add(new_session)
    await db.commit()

    # Lấy thông tin vai trò
    role_query = select(Role).where(Role.role_id == user.role_id)
    role_result = await db.execute(role_query)
    role = role_result.scalar_one_or_none()
    role_code = role.role_code if role else "CITIZEN"

    access_token = create_access_token(
        user_id=str(user.user_id),
        email=user.email,
        role=role_code,
        session_id=str(new_session_id)
    )

    return CitizenLoginResponse(
        success=True,
        message="Đăng nhập thành công",
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=900,
        session_id=str(new_session_id),
        user=UserSummary(
            user_id=str(user.user_id),
            email=user.email,
            full_name=user.full_name,
            role=role_code,
            status=user.status
        )
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Cơ chế Silent Refresh: Làm mới Access Token bằng Refresh Token (7 ngày):
    - Kiểm tra tính hợp lệ của Refresh Token.
    - Cập nhật thời điểm hoạt động last_active_at.
    - Cấp Access Token 15 phút mới mà không làm gián đoạn người dùng.
    """
    rt_hash = hash_refresh_token(payload.refresh_token.strip())
    now = datetime.now(timezone.utc)

    session_query = select(UserSession).where(UserSession.refresh_token_hash == rt_hash)
    session_result = await db.execute(session_query)
    user_session = session_result.scalar_one_or_none()

    if not user_session or user_session.revoked_at is not None or user_session.expires_at <= now:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error_code": "SESSION_INVALID",
                "message": "Vui lòng đăng nhập lại"
            }
        )

    # Kiểm tra User còn ACTIVE không
    user_query = select(User).where(User.user_id == user_session.user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user or user.status != "ACTIVE":
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error_code": "SESSION_INVALID",
                "message": "Vui lòng đăng nhập lại"
            }
        )

    # Cập nhật mốc hoạt động gần nhất
    user_session.last_active_at = now
    await db.commit()

    role_query = select(Role).where(Role.role_id == user.role_id)
    role_result = await db.execute(role_query)
    role = role_result.scalar_one_or_none()
    role_code = role.role_code if role else "CITIZEN"

    new_access_token = create_access_token(
        user_id=str(user.user_id),
        email=user.email,
        role=role_code,
        session_id=str(user_session.session_id)
    )

    return RefreshTokenResponse(
        success=True,
        access_token=new_access_token,
        token_type="bearer",
        expires_in=900
    )


@router.get("/sessions", response_model=SessionListResponse)
async def list_user_sessions(
    auth_data: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 2: Lấy danh sách các thiết bị đang có phiên còn hiệu lực của người dùng hiện tại:
    - Đánh dấu phiên hiện tại (is_current = True) và đưa lên đầu danh sách.
    """
    user, current_session = auth_data
    now = datetime.now(timezone.utc)

    query = select(UserSession).where(
        and_(
            UserSession.user_id == user.user_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now
        )
    ).order_by(UserSession.last_active_at.desc())

    result = await db.execute(query)
    sessions = list(result.scalars().all())

    session_items = []
    for s in sessions:
        is_cur = (s.session_id == current_session.session_id)
        session_items.append(
            SessionItemResponse(
                session_id=str(s.session_id),
                device_name=s.device_name,
                ip_address=s.ip_address,
                is_current=is_cur,
                last_active_at=s.last_active_at.isoformat(),
                created_at=s.created_at.isoformat()
            )
        )

    # Đưa phiên hiện tại (is_current = True) lên đầu danh sách
    session_items.sort(key=lambda x: 0 if x.is_current else 1)

    return SessionListResponse(
        success=True,
        sessions=session_items,
        total=len(session_items)
    )


@router.delete("/sessions/{session_id}", response_model=RevokeSessionResponse)
async def revoke_single_session(
    session_id: str,
    auth_data: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 3 (Dạng 1): Thu hồi phiên của một thiết bị cụ thể.
    - Gán revoked_at bằng thời điểm hiện tại.
    - Nếu phiên đã bị thu hồi trước đó -> 400 "Phiên này đã được đăng xuất trước đó".
    """
    user, current_session = auth_data
    now = datetime.now(timezone.utc)

    try:
        target_session_uuid = uuid.UUID(session_id)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_SESSION_ID",
                "message": "Mã phiên không hợp lệ"
            }
        )

    query = select(UserSession).where(
        and_(
            UserSession.session_id == target_session_uuid,
            UserSession.user_id == user.user_id
        )
    )
    result = await db.execute(query)
    target_session = result.scalar_one_or_none()

    if not target_session or target_session.revoked_at is not None:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "SESSION_ALREADY_REVOKED",
                "message": "Phiên này đã được đăng xuất trước đó"
            }
        )

    target_session.revoked_at = now
    await db.commit()

    is_cur = (target_session.session_id == current_session.session_id)
    message = "Bạn đã đăng xuất" if is_cur else "Đã đăng xuất thiết bị"

    return RevokeSessionResponse(
        success=True,
        message=message,
        is_current=is_cur
    )


@router.delete("/sessions", response_model=RevokeSessionResponse)
async def revoke_all_sessions(
    auth_data: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Màn 3 (Dạng 2): Thu hồi toàn bộ phiên trên mọi thiết bị (Đăng xuất tất cả).
    - Gán revoked_at cho mọi phiên còn hiệu lực của người dùng này.
    """
    user, current_session = auth_data
    now = datetime.now(timezone.utc)

    update_stmt = (
        update(UserSession)
        .where(
            and_(
                UserSession.user_id == user.user_id,
                UserSession.revoked_at.is_(None)
            )
        )
        .values(revoked_at=now)
    )
    await db.execute(update_stmt)
    await db.commit()

    return RevokeSessionResponse(
        success=True,
        message="Đã đăng xuất khỏi tất cả thiết bị",
        is_current=True
    )

