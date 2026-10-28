import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig
from app.models.audit import AuditLog
from app.schemas.alert_config import (
    ThresholdRuleItem,
    AlertConfigResponse,
    UpdateThresholdsRequest,
)

DEFAULT_RULES = [
    {
        "severity_level": "YELLOW",
        "severity_name": "Mức Chú Ý (Cấp 1)",
        "radius_km": 1.0,
        "default_safety_advice": "Người dân nhạy cảm với chất lượng không khí, bệnh nhân hô hấp nên hạn chế hoạt động mạnh ngoài trời; đóng cửa sổ hướng phát tán ô nhiễm.",
        "color_hex": "#EAB308",
        "min_aqi_threshold": 100,
        "description": "Cảnh báo ô nhiễm rác thải cục bộ hoặc bụi mịn vượt quy chuẩn nhẹ.",
    },
    {
        "severity_level": "ORANGE",
        "severity_name": "Mức Nguy Cơ (Cấp 2)",
        "radius_km": 2.5,
        "default_safety_advice": "Khuyến cáo người dân đeo khẩu trang lọc bụi chuẩn N95 khi ra ngoài; hạn chế tập thể dục buổi sáng; người già và trẻ em ở trong nhà.",
        "color_hex": "#F97316",
        "min_aqi_threshold": 150,
        "description": "Cảnh báo ô nhiễm không khí hoặc ô nhiễm nguồn nước trên diện rộng có nguy cơ ảnh hưởng sức khỏe cộng đồng.",
    },
    {
        "severity_level": "RED",
        "severity_name": "Mức Khẩn Cấp Nguy Hại (Cấp 3)",
        "radius_km": 5.0,
        "default_safety_advice": "BÁO ĐỘNG ĐỎ: Người dân trong bán kính ảnh hưởng lập tức sơ tán tạm thời khỏi hướng gió; tắt điều hòa lấy gió ngoài; bịt kín các khe hở cửa nhà; liên hệ đường dây nóng 1800-1090 khi có dấu hiệu ngộ độc.",
        "color_hex": "#EF4444",
        "min_aqi_threshold": 200,
        "description": "Sự cố cháy bãi rác phát tán khói độc dioxin, rò rỉ hóa chất công nghiệp hoặc sự cố vỡ cống ngập nước thải độc hại cấp bách.",
    },
]

CONFIG_KEY_THRESHOLDS = "ALERT_SEVERITY_THRESHOLDS_RULES"
CONFIG_KEY_HOTLINE = "SYSTEM_EMERGENCY_HOTLINE"


class AlertConfigService:
    @staticmethod
    async def get_threshold_configs(db: AsyncSession) -> AlertConfigResponse:
        stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_THRESHOLDS)
        row = (await db.execute(stmt)).scalar_one_or_none()

        hotline_stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_HOTLINE)
        hotline_row = (await db.execute(hotline_stmt)).scalar_one_or_none()
        hotline = hotline_row.config_value if hotline_row else "1800-1090"

        if not row:
            # Seed default if missing
            rules = [ThresholdRuleItem(**r) for r in DEFAULT_RULES]
            new_cfg = SystemConfig(
                config_key=CONFIG_KEY_THRESHOLDS,
                config_value=json.dumps(DEFAULT_RULES, ensure_ascii=False),
                value_type="JSON",
                description="Danh mục quy chuẩn ngưỡng phát cảnh báo và bán kính ảnh hưởng theo cấp độ",
                is_public=True,
            )
            db.add(new_cfg)
            await db.commit()
            return AlertConfigResponse(
                rules=rules,
                default_radius_km=2.0,
                hotline_number=hotline,
                updated_at=datetime.now(timezone.utc).strftime("%H:%M %d/%m/%Y"),
            )

        try:
            data = json.loads(row.config_value)
            rules = [ThresholdRuleItem(**r) for r in data]
        except Exception:
            rules = [ThresholdRuleItem(**r) for r in DEFAULT_RULES]

        return AlertConfigResponse(
            rules=rules,
            default_radius_km=2.0,
            hotline_number=hotline,
            updated_at=row.updated_at.strftime("%H:%M %d/%m/%Y") if row.updated_at else None,
        )

    @staticmethod
    async def update_threshold_configs(
        db: AsyncSession,
        req: UpdateThresholdsRequest,
        actor_id: Optional[uuid.UUID] = None,
        client_ip: Optional[str] = "127.0.0.1",
    ) -> AlertConfigResponse:
        # Validate business rules
        for rule in req.rules:
            if rule.radius_km < 0.5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="RULE_001: Bán kính cảnh báo không thể nhỏ hơn 0.5 km.",
                )
            if rule.radius_km > 10.0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="RULE_002: Bán kính cảnh báo tối đa cho một sự cố đô thị là 10.0 km.",
                )
            if not rule.default_safety_advice or len(rule.default_safety_advice.strip()) < 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="RULE_003: Mẫu thông điệp khuyến cáo y tế không được để trống.",
                )

        stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_THRESHOLDS)
        cfg = (await db.execute(stmt)).scalar_one_or_none()

        rules_dict = [r.dict() for r in req.rules]
        rules_json = json.dumps(rules_dict, ensure_ascii=False)

        now = datetime.now(timezone.utc)
        if cfg:
            cfg.config_value = rules_json
            cfg.updated_at = now
            cfg.updated_by = actor_id
        else:
            cfg = SystemConfig(
                config_key=CONFIG_KEY_THRESHOLDS,
                config_value=rules_json,
                value_type="JSON",
                description="Danh mục quy chuẩn ngưỡng phát cảnh báo và bán kính ảnh hưởng theo cấp độ",
                is_public=True,
                updated_at=now,
                updated_by=actor_id,
            )
            db.add(cfg)

        # Cập nhật hotline nếu có
        if req.hotline_number:
            hl_stmt = select(SystemConfig).where(SystemConfig.config_key == CONFIG_KEY_HOTLINE)
            hl_cfg = (await db.execute(hl_stmt)).scalar_one_or_none()
            if hl_cfg:
                hl_cfg.config_value = req.hotline_number.strip()
                hl_cfg.updated_at = now
            else:
                db.add(
                    SystemConfig(
                        config_key=CONFIG_KEY_HOTLINE,
                        config_value=req.hotline_number.strip(),
                        value_type="STRING",
                        description="Đường dây nóng cứu nạn môi trường khẩn cấp",
                        is_public=True,
                    )
                )

        # Ghi nhật ký kiểm toán an ninh AuditLog (Chức năng 27)
        audit = AuditLog(
            user_id=actor_id,
            action="UPDATE_ALERT_THRESHOLDS",
            table_name="system_configs",
            record_id=str(cfg.config_id) if cfg.config_id else "SYSTEM_CONFIG",
            new_data={"rules": rules_dict, "hotline": req.hotline_number},
            ip_address=client_ip,
        )
        db.add(audit)

        await db.commit()
        await db.refresh(cfg)

        return AlertConfigResponse(
            rules=req.rules,
            default_radius_km=2.0,
            hotline_number=req.hotline_number or "1800-1090",
            updated_at=now.strftime("%H:%M %d/%m/%Y"),
        )

    @staticmethod
    async def reset_to_default(
        db: AsyncSession,
        actor_id: Optional[uuid.UUID] = None,
        client_ip: Optional[str] = "127.0.0.1",
    ) -> AlertConfigResponse:
        default_req = UpdateThresholdsRequest(
            rules=[ThresholdRuleItem(**r) for r in DEFAULT_RULES],
            hotline_number="1800-1090",
        )
        return await AlertConfigService.update_threshold_configs(
            db, default_req, actor_id=actor_id, client_ip=client_ip
        )
