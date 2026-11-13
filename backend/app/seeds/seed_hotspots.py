"""
Seeder Dữ liệu STT 44: Phân tích Điểm nóng Không gian & Dự báo Xu hướng 7 ngày
(Spatial Hotspot Analytics & 7-Day Forecasting Seeder)
Tuân thủ Clean Architecture, Explicit SQL, OCC Versioning, Soft-delete.
"""
import uuid
from datetime import datetime, timedelta
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.crud.hotspots.hotspot_repository import CANONICAL_HOTSPOTS, AVAILABLE_AREAS


async def seed_hotspots_data():
    """
    Nạp dữ liệu mẫu điểm nóng môi trường (hotspot_clusters) 
    và dự báo chuỗi thời gian 7 ngày (hotspot_daily_forecasts).
    """
    print("   🌱 Đang nạp cụm điểm nóng môi trường KDE & dữ liệu dự báo 7 ngày...")
    
    async with AsyncSessionLocal() as session:
        try:
            # 1. Nạp cụm điểm nóng môi trường (hotspot_clusters)
            inserted_hotspots = 0
            for h in CANONICAL_HOTSPOTS:
                hotspot_uuid = uuid.uuid5(uuid.NAMESPACE_URL, f"https://greenspot.vn/hotspots/{h['hotspot_code']}")
                
                sql_hotspot = text("""
                    INSERT INTO hotspot_clusters (
                        hotspot_id,
                        hotspot_code,
                        name,
                        incident_type,
                        district,
                        ward,
                        latitude,
                        longitude,
                        radius_meters,
                        kde_density_score,
                        incident_count,
                        severity_level,
                        trend_description,
                        forecast_48h,
                        active_dispatch_order_id,
                        active_dispatch_order_code,
                        version,
                        created_at,
                        updated_at
                    ) VALUES (
                        :hotspot_id,
                        :hotspot_code,
                        :name,
                        :incident_type,
                        :district,
                        :ward,
                        :latitude,
                        :longitude,
                        :radius_meters,
                        :kde_density_score,
                        :incident_count,
                        :severity_level,
                        :trend_description,
                        :forecast_48h,
                        :active_dispatch_order_id,
                        :active_dispatch_order_code,
                        :version,
                        NOW(),
                        NOW()
                    )
                    ON CONFLICT (hotspot_code) DO UPDATE SET
                        name = EXCLUDED.name,
                        incident_type = EXCLUDED.incident_type,
                        district = EXCLUDED.district,
                        ward = EXCLUDED.ward,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        radius_meters = EXCLUDED.radius_meters,
                        kde_density_score = EXCLUDED.kde_density_score,
                        incident_count = EXCLUDED.incident_count,
                        severity_level = EXCLUDED.severity_level,
                        trend_description = EXCLUDED.trend_description,
                        forecast_48h = EXCLUDED.forecast_48h,
                        active_dispatch_order_id = EXCLUDED.active_dispatch_order_id,
                        active_dispatch_order_code = EXCLUDED.active_dispatch_order_code,
                        updated_at = NOW();
                """)

                await session.execute(sql_hotspot, {
                    "hotspot_id": hotspot_uuid,
                    "hotspot_code": h["hotspot_code"],
                    "name": h["name"],
                    "incident_type": h["incident_type"],
                    "district": h["district"],
                    "ward": h.get("ward"),
                    "latitude": h["latitude"],
                    "longitude": h["longitude"],
                    "radius_meters": h.get("radius_meters", 250.0),
                    "kde_density_score": h.get("kde_density_score", 0.0),
                    "incident_count": h.get("incident_count", 0),
                    "severity_level": h.get("severity_level", "MEDIUM"),
                    "trend_description": h.get("trend_description", ""),
                    "forecast_48h": h.get("forecast_48h", ""),
                    "active_dispatch_order_id": h.get("active_dispatch_order_id"),
                    "active_dispatch_order_code": h.get("active_dispatch_order_code"),
                    "version": h.get("version", 1),
                })
                inserted_hotspots += 1

            # 2. Nạp dữ liệu dự báo 7 ngày cho các khu vực mẫu (hotspot_daily_forecasts)
            today = datetime.now()
            inserted_forecasts = 0

            for area in AVAILABLE_AREAS:
                target_type = area.target_type
                target_id = area.target_id
                target_name = area.target_name
                base_val = 14.0 if target_type == "HOTSPOT" else 35.0
                peak_idx = 4

                for i in range(1, 8):
                    day_dt = today + timedelta(days=i)
                    date_str = day_dt.strftime("%Y-%m-%d")
                    forecast_uuid = uuid.uuid5(
                        uuid.NAMESPACE_URL,
                        f"https://greenspot.vn/forecast/{target_id}/{date_str}"
                    )

                    is_peak = (i == peak_idx)
                    multiplier = 2.4 if is_peak else (1.0 + (i * 0.12))
                    predicted = round(base_val * multiplier, 1)
                    ci_lower = round(max(5.0, predicted * 0.82), 1)
                    ci_upper = round(predicted * 1.22, 1)

                    rainfall = 85.0 if is_peak else round(15.0 + (i * 4.5), 1)
                    tidal = 1.65 if is_peak else round(1.25 + (i * 0.05), 2)
                    risk_level = "PEAK_CRITICAL" if is_peak else ("HIGH" if i >= 3 else "NORMAL")
                    reason = "Mưa lớn diện rộng kết hợp triều cường đạt đỉnh 1.65m" if is_peak else "Diễn biến thông thường"

                    sql_forecast = text("""
                        INSERT INTO hotspot_daily_forecasts (
                            forecast_id,
                            target_type,
                            target_id,
                            target_name,
                            forecast_date,
                            day_offset,
                            predicted_incidents,
                            ci_lower_95,
                            ci_upper_95,
                            rainfall_mm,
                            tidal_peak_m,
                            risk_level,
                            risk_reason,
                            model_accuracy_pct,
                            is_weather_synced,
                            version,
                            created_at,
                            updated_at
                        ) VALUES (
                            :forecast_id,
                            :target_type,
                            :target_id,
                            :target_name,
                            :forecast_date,
                            :day_offset,
                            :predicted_incidents,
                            :ci_lower_95,
                            :ci_upper_95,
                            :rainfall_mm,
                            :tidal_peak_m,
                            :risk_level,
                            :risk_reason,
                            :model_accuracy_pct,
                            :is_weather_synced,
                            :version,
                            NOW(),
                            NOW()
                        )
                        ON CONFLICT (forecast_id) DO UPDATE SET
                            predicted_incidents = EXCLUDED.predicted_incidents,
                            ci_lower_95 = EXCLUDED.ci_lower_95,
                            ci_upper_95 = EXCLUDED.ci_upper_95,
                            rainfall_mm = EXCLUDED.rainfall_mm,
                            tidal_peak_m = EXCLUDED.tidal_peak_m,
                            risk_level = EXCLUDED.risk_level,
                            risk_reason = EXCLUDED.risk_reason,
                            updated_at = NOW();
                    """)

                    await session.execute(sql_forecast, {
                        "forecast_id": forecast_uuid,
                        "target_type": target_type,
                        "target_id": target_id,
                        "target_name": target_name,
                        "forecast_date": day_dt,
                        "day_offset": i,
                        "predicted_incidents": predicted,
                        "ci_lower_95": ci_lower,
                        "ci_upper_95": ci_upper,
                        "rainfall_mm": rainfall,
                        "tidal_peak_m": tidal,
                        "risk_level": risk_level,
                        "risk_reason": reason,
                        "model_accuracy_pct": 87.5,
                        "is_weather_synced": True,
                        "version": 1,
                    })
                    inserted_forecasts += 1

            await session.commit()
            print(f"   ✅ Đã nạp thành công {inserted_hotspots} cụm điểm nóng và {inserted_forecasts} bản ghi dự báo 7 ngày.")
        except Exception as e:
            await session.rollback()
            print(f"   ⚠️ Lỗi khi nạp dữ liệu điểm nóng: {e}")
            raise e


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_hotspots_data())

