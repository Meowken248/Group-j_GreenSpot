from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User, Role, UserOTP
from app.schemas.auth import (
    CitizenRegisterRequest,
    CitizenVerifyOtpRequest,
    CitizenResendOtpRequest,
    CitizenLoginRequest,
    CitizenLoginResponse,
    AuthSuccessResponse,
)
from app.services.email_service import EmailService
from app.utils.security import (
    generate_otp_code,
    hash_otp_code,
    hash_password,
    verify_password,
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


@router.post("/login", response_model=CitizenLoginResponse)
async def login_citizen(
    payload: CitizenLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Đăng nhập Công dân GreenSpot:
    - Kiểm tra email tồn tại và trạng thái ACTIVE.
    - Kiểm tra mật khẩu mã hóa PBKDF2-HMAC-SHA256.
    """
    clean_email = payload.email.strip().lower()

    # Tìm tài khoản theo email
    user_query = select(User).where(User.email == clean_email)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error_code": "INVALID_CREDENTIALS",
                "message": "Email hoặc mật khẩu không chính xác"
            }
        )

    if user.status == "PENDING":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error_code": "ACCOUNT_NOT_ACTIVATED",
                "message": "Tài khoản chưa được kích hoạt qua mã OTP. Vui lòng xác thực trước"
            }
        )

    if user.status != "ACTIVE":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error_code": "ACCOUNT_INACTIVE",
                "message": "Tài khoản này đang bị khóa hoặc vô hiệu hóa"
            }
        )

    if not verify_password(payload.password, user.password_hash):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error_code": "INVALID_CREDENTIALS",
                "message": "Email hoặc mật khẩu không chính xác"
            }
        )

    return CitizenLoginResponse(
        success=True,
        message=f"Đăng nhập thành công! Chào mừng {user.full_name}",
        user_id=str(user.user_id),
        email=user.email,
        full_name=user.full_name,
        status=user.status
    )
