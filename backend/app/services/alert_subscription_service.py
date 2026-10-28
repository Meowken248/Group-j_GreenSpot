import json
import re
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig
from app.schemas.alert_subscription import AlertSubscriptionRequest, AlertSubscriptionResponse

EMAIL_REGEX = re.compile(r"^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$")

DEFAULT_DISTRICTS = ["QUAN_1", "QUAN_3", "TP_THU_DUC"]


class AlertSubscriptionService:
    @staticmethod
    def _get_config_key(user_id: str) -> str:
        return f"ALERT_SUB_{user_id}"

    @classmethod
    async def get_subscription(
        cls,
        db: AsyncSession,
        user_id: str,
        user_email: Optional[str] = None,
    ) -> AlertSubscriptionResponse:
        """
        Lấy cấu hình đăng ký nhận tin cảnh báo cá nhân hóa của người dùng (Chức năng 32)
        """
        key = cls._get_config_key(user_id)
        stmt = select(SystemConfig).where(SystemConfig.config_key == key)
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()

        if record:
            try:
                data = json.loads(record.config_value)
                return AlertSubscriptionResponse(
                    subscription_id=data.get("subscription_id", str(uuid.uuid4())),
                    user_id=user_id,
                    subscribed_districts=data.get("subscribed_districts", DEFAULT_DISTRICTS),
                    min_severity_level=data.get("min_severity_level", "ALL"),
                    notify_in_app=data.get("notify_in_app", True),
                    notify_email=data.get("notify_email", True),
                    email_address=data.get("email_address", user_email or "citizen@greenspot.vn"),
                    is_muted=data.get("is_muted", False),
                    updated_at=record.updated_at.isoformat() if record.updated_at else datetime.utcnow().isoformat(),
                )
            except Exception:
                pass

        # Trả về cấu hình mặc định ban đầu nếu chưa từng thiết lập
        now_str = datetime.utcnow().isoformat()
        return AlertSubscriptionResponse(
            subscription_id=str(uuid.uuid4()),
            user_id=user_id,
            subscribed_districts=DEFAULT_DISTRICTS,
            min_severity_level="ALL",
            notify_in_app=True,
            notify_email=True,
            email_address=user_email or "citizen@greenspot.vn",
            is_muted=False,
            updated_at=now_str,
        )

    @classmethod
    async def update_subscription(
        cls,
        db: AsyncSession,
        user_id: str,
        req: AlertSubscriptionRequest,
        user_email: Optional[str] = None,
    ) -> AlertSubscriptionResponse:
        """
        Lưu cấu hình đăng ký nhận tin cảnh báo cá nhân hóa (Chức năng 32)
        Kiểm tra chặt chẽ các quy chuẩn:
        - SUB_001: Không quá 5 khu vực địa bàn
        - SUB_002: Phải giữ ít nhất 1 kênh nhận tin (Web hoặc Email) hoạt động
        - SUB_003: Email nhận tin phải hợp lệ khi bật nhận email
        """
        # Quy tắc SUB_001: Không được chọn quá 5 khu vực địa bàn
        if len(req.subscribed_districts) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SUB_001: Bạn chỉ có thể đăng ký theo dõi tối đa 5 khu vực địa bàn.",
            )

        # Quy tắc SUB_002: Tắt toàn bộ kênh nhận tin -> không hợp lệ
        if not req.is_muted and not req.notify_in_app and not req.notify_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SUB_002: Vui lòng giữ ít nhất một kênh nhận tin (Web hoặc Email) hoạt động.",
            )

        # Quy tắc SUB_003: Nếu bật nhận email, email phải hợp lệ
        effective_email = req.email_address or user_email
        if req.notify_email:
            if not effective_email or not EMAIL_REGEX.match(effective_email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SUB_003: Địa chỉ email chưa được xác minh hoặc không đúng định dạng.",
                )

        key = cls._get_config_key(user_id)
        stmt = select(SystemConfig).where(SystemConfig.config_key == key)
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()

        subscription_id = str(uuid.uuid4())
        if record:
            try:
                old_data = json.loads(record.config_value)
                subscription_id = old_data.get("subscription_id", subscription_id)
            except Exception:
                pass

        payload = {
            "subscription_id": subscription_id,
            "user_id": user_id,
            "subscribed_districts": req.subscribed_districts,
            "min_severity_level": req.min_severity_level,
            "notify_in_app": req.notify_in_app,
            "notify_email": req.notify_email,
            "email_address": effective_email,
            "is_muted": req.is_muted,
            "updated_at": datetime.utcnow().isoformat(),
        }

        if record:
            record.config_value = json.dumps(payload, ensure_ascii=False)
            record.updated_at = datetime.utcnow()
        else:
            record = SystemConfig(
                config_key=key,
                config_value=json.dumps(payload, ensure_ascii=False),
                value_type="JSON",
                description=f"Cấu hình nhận tin cảnh báo cá nhân hóa (CN 32) của người dùng {user_id}",
                is_public=False,
            )
            db.add(record)

        await db.commit()
        await db.refresh(record)

        return AlertSubscriptionResponse(
            subscription_id=subscription_id,
            user_id=user_id,
            subscribed_districts=req.subscribed_districts,
            min_severity_level=req.min_severity_level,
            notify_in_app=req.notify_in_app,
            notify_email=req.notify_email,
            email_address=effective_email,
            is_muted=req.is_muted,
            updated_at=record.updated_at.isoformat(),
        )
