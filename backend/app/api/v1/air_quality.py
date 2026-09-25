"""FastAPI Air Quality Endpoints (Powered by Parquet Analytics Data)
"""

import glob
import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/air-quality", tags=["Air Quality Analytics"])

BASE_AIR_QUALITY_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "air_quality")
)
DATA_DIR = os.path.join(BASE_AIR_QUALITY_DIR, "data")


def get_aqi_level(aqi: Optional[float]) -> Dict[str, str]:
    if aqi is None:
        return {"level": "Unknown", "color": "#9E9E9E", "label": "Chưa có dữ liệu"}
    if aqi <= 50:
        return {"level": "Good", "color": "#00E400", "label": "Tốt"}
    if aqi <= 100:
        return {"level": "Moderate", "color": "#FFFF00", "label": "Vừa phải"}
    if aqi <= 150:
        return {"level": "Unhealthy_Sensitive", "color": "#FF7E00", "label": "Kém (Nhạy cảm)"}
    if aqi <= 200:
        return {"level": "Unhealthy", "color": "#FF0000", "label": "Xấu"}
    if aqi <= 300:
        return {"level": "Very_Unhealthy", "color": "#8F3F97", "label": "Rất xấu"}
    return {"level": "Hazardous", "color": "#7E0023", "label": "Nguy hại"}


@router.get("/provinces")
def list_provinces() -> List[Dict[str, Any]]:
    """Danh sách 34 tỉnh/thành phố có dữ liệu trạm quan trắc & dự báo AQI."""
    location_dir = os.path.join(DATA_DIR, "location")
    if not os.path.exists(location_dir):
        return []

    provinces = []
    for filepath in sorted(glob.glob(os.path.join(location_dir, "*.parquet"))):
        slug = os.path.splitext(os.path.basename(filepath))[0]
        name = slug.replace("_", " ").title()
        provinces.append({
            "slug": slug,
            "name": name,
            "has_hourly_data": os.path.exists(os.path.join(DATA_DIR, "aqi", slug)),
            "has_forecast_data": os.path.exists(os.path.join(DATA_DIR, "forecast", slug)),
        })
    return provinces


@router.get("/provinces/{province_slug}/latest")
def get_latest_aqi(province_slug: str) -> Dict[str, Any]:
    """Lấy dữ liệu AQI và chỉ số khí tượng thời gian thực mới nhất của một tỉnh/thành."""
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=500, detail="Pandas/PyArrow not installed")

    province_aqi_path = os.path.join(DATA_DIR, "aqi", province_slug, "all.parquet")
    if not os.path.exists(province_aqi_path):
        raise HTTPException(
            status_code=404,
            detail=f"Dữ liệu không tìm thấy cho tỉnh/thành '{province_slug}'"
        )

    try:
        df = pd.read_parquet(province_aqi_path)
        if df.empty:
            raise HTTPException(status_code=404, detail="Dữ liệu rỗng")

        latest_row = df.iloc[-1].to_dict()
        # Convert timestamp to isoformat
        if "timestamp" in latest_row and hasattr(latest_row["timestamp"], "isoformat"):
            latest_row["timestamp"] = latest_row["timestamp"].isoformat()

        aqi_val = float(latest_row.get("aqi", 0)) if latest_row.get("aqi") is not None else None
        latest_row["pollution_level_info"] = get_aqi_level(aqi_val)

        return {
            "province_slug": province_slug,
            "data": latest_row,
            "status": "success",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đọc dữ liệu: {str(e)}")


@router.get("/summary")
def get_national_summary() -> Dict[str, Any]:
    """Tổng quan nhanh về chất lượng không khí toàn quốc."""
    location_dir = os.path.join(DATA_DIR, "location")
    total_provinces = len(glob.glob(os.path.join(location_dir, "*.parquet"))) if os.path.exists(location_dir) else 0

    return {
        "title": "Vietnam Air Quality & Meteorology Intelligence",
        "total_monitored_provinces": total_provinces,
        "engine": "Parquet + Open-Meteo Realtime Stream",
        "status": "active",
        "streamlit_dashboard_url": "http://localhost:8501",
    }
