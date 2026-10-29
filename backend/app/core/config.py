import os
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROOT_DIR = os.path.dirname(BASE_DIR)


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ecoreport_db"
    KIRA_API_KEY: str = ""
    KIRA_API_URL: str = "https://kiraai.vn/api/v1/chat/completions"
    KIRA_MODEL: str = "kira-mini-1.0"
    KIRA_TIMEOUT_SECONDS: float = 45.0

    # Cấu hình gửi email OTP thật (Gmail / Outlook SMTP).
    # Khai báo trong backend/.env (xem backend/.env.example) thay vì docker-compose.yml.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = SettingsConfigDict(
        env_file=[os.path.join(ROOT_DIR, ".env"), os.path.join(BASE_DIR, ".env"), ".env"],
        extra="ignore"
    )


settings = Settings()

# Đường dẫn thư mục backend và uploads đồng nhất
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


