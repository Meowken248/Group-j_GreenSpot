import hashlib
import os
import secrets

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
    # Lưu định dạng salt$hash dạng hex
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
