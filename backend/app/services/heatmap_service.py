from datetime import datetime, timezone
from typing import List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.leaderboard import DistrictEnvironmentalStat
from app.schemas.heatmap import (
    HeatmapPoint,
    HeatmapLegendItem,
    MultiModeHeatmapResponse,
    DistrictZoneDetail,
)

AQI_LEGENDS = [
    HeatmapLegendItem(label="Tốt", range_text="0 - 50", color_hex="#22c55e"),
    HeatmapLegendItem(label="Trung bình", range_text="51 - 100", color_hex="#eab308"),
    HeatmapLegendItem(label="Kém", range_text="101 - 150", color_hex="#f97316"),
    HeatmapLegendItem(label="Xấu", range_text="151 - 200", color_hex="#ef4444"),
    HeatmapLegendItem(label="Rất xấu", range_text="201 - 300", color_hex="#a855f7"),
    HeatmapLegendItem(label="Nguy hại", range_text="> 300", color_hex="#78350f"),
]

TEMP_LEGENDS = [
    HeatmapLegendItem(label="Mát mẻ", range_text="< 26°C", color_hex="#3b82f6"),
    HeatmapLegendItem(label="Dễ chịu", range_text="26 - 32°C", color_hex="#22c55e"),
    HeatmapLegendItem(label="Nắng nóng", range_text="33 - 37°C", color_hex="#f97316"),
    HeatmapLegendItem(label="Nắng gay gắt", range_text="≥ 38°C", color_hex="#dc2626"),
]

RISK_LEGENDS = [
    HeatmapLegendItem(label="Rủi ro thấp", range_text="0 - 25", color_hex="#22c55e"),
    HeatmapLegendItem(label="Trung bình", range_text="26 - 50", color_hex="#eab308"),
    HeatmapLegendItem(label="Rủi ro cao", range_text="51 - 75", color_hex="#f97316"),
    HeatmapLegendItem(label="Rủi ro cực độ", range_text="76 - 100", color_hex="#dc2626"),
]

def evaluate_aqi(val: int, name: str) -> Tuple[str, str, bool, str]:
    if val <= 50:
        return "#22c55e", "Tốt", False, ""
    elif val <= 100:
        return "#eab308", "Trung bình", False, ""
    elif val <= 150:
        return "#f97316", "Kém", False, ""
    elif val <= 200:
        return "#ef4444", "Xấu", False, ""
    elif val <= 300:
        return "#a855f7", "Rất xấu", True, f"Cảnh báo: Không khí ở mức rất xấu tại {name}"
    else:
        return "#78350f", "Nguy hại", True, f"Cảnh báo: Không khí ở mức nguy hại tại {name}"

def evaluate_temp(val: float, name: str) -> Tuple[str, str, bool, str]:
    if val < 26.0:
        return "#3b82f6", "Mát mẻ", False, ""
    elif val <= 32.0:
        return "#22c55e", "Dễ chịu", False, ""
    elif val <= 37.0:
        return "#f97316", "Nắng nóng", False, ""
    else:
        is_warn = val >= 39.0
        msg = f"Cảnh báo nắng nóng gay gắt tại {name}" if is_warn else ""
        return "#dc2626", "Nắng gay gắt", is_warn, msg

def evaluate_risk(val: int, name: str) -> Tuple[str, str, bool, str]:
    if val <= 25:
        return "#22c55e", "Rủi ro thấp", False, ""
    elif val <= 50:
        return "#eab308", "Trung bình", False, ""
    elif val <= 75:
        return "#f97316", "Rủi ro cao", False, ""
    else:
        return "#dc2626", "Rủi ro cực độ", True, f"Báo động: Nguy cơ ô nhiễm mức báo động tại {name}"

class HeatmapService:
    @staticmethod
    async def get_heatmap_data(db: AsyncSession, mode: str = "AQI") -> MultiModeHeatmapResponse:
        norm_mode = mode.upper()
        if norm_mode not in ["AQI", "TEMPERATURE", "RISK"]:
            norm_mode = "AQI"

        q = select(DistrictEnvironmentalStat).order_by(DistrictEnvironmentalStat.district_name)
        res = await db.execute(q)
        districts = res.scalars().all()

        points: List[HeatmapPoint] = []
        for d in districts:
            if norm_mode == "AQI":
                c, label, warn, w_msg = evaluate_aqi(d.aqi_value, d.district_name)
                val = float(d.aqi_value)
            elif norm_mode == "TEMPERATURE":
                c, label, warn, w_msg = evaluate_temp(d.temperature_c, d.district_name)
                val = d.temperature_c
            else: # RISK
                c, label, warn, w_msg = evaluate_risk(d.risk_score, d.district_name)
                val = float(d.risk_score)

            points.append(
                HeatmapPoint(
                    district_code=d.district_code,
                    district_name=d.district_name,
                    lat=d.lat,
                    lng=d.lng,
                    value=val,
                    color_hex=c,
                    level_label=label,
                    is_warning=warn,
                    warning_message=w_msg if warn else None
                )
            )

        legends = AQI_LEGENDS if norm_mode == "AQI" else TEMP_LEGENDS if norm_mode == "TEMPERATURE" else RISK_LEGENDS

        return MultiModeHeatmapResponse(
            mode=norm_mode,
            timestamp=datetime.now(timezone.utc).strftime("%H:%M %d/%m/%Y"),
            total_districts=len(points),
            points=points,
            legends=legends
        )

    @staticmethod
    async def get_zone_detail(db: AsyncSession, district_code: str) -> DistrictZoneDetail:
        q = select(DistrictEnvironmentalStat).where(DistrictEnvironmentalStat.district_code == district_code)
        res = await db.execute(q)
        d = res.scalar_one_or_none()
        if not d:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông tin khu vực")

        aqi_c, aqi_lbl, aqi_w, aqi_msg = evaluate_aqi(d.aqi_value, d.district_name)
        temp_c, temp_lbl, temp_w, temp_msg = evaluate_temp(d.temperature_c, d.district_name)
        risk_c, risk_lbl, risk_w, risk_msg = evaluate_risk(d.risk_score, d.district_name)

        has_alert = aqi_w or temp_w or risk_w
        alert_msg = aqi_msg or temp_msg or risk_msg or None

        return DistrictZoneDetail(
            district_code=d.district_code,
            district_name=d.district_name,
            lat=d.lat,
            lng=d.lng,
            aqi_value=d.aqi_value,
            aqi_level=aqi_lbl,
            aqi_color=aqi_c,
            temperature_c=d.temperature_c,
            temperature_level=temp_lbl,
            temperature_color=temp_c,
            risk_score=d.risk_score,
            risk_level=risk_lbl,
            risk_color=risk_c,
            cleanup_rate=d.cleanup_rate,
            resolved_incidents=d.resolved_incidents,
            green_index=d.green_index,
            has_alert=has_alert,
            alert_message=alert_msg
        )
