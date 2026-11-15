"""
Seed real-time flood hotspots and tide stations into PostgreSQL
Uses genuine data from HCMC Department of Construction, GloFAS and OpenStreetMap road corridors.
"""

import asyncio
import json
from pathlib import Path
import asyncpg
from app.core.config import settings
from app.services.flood_service import HCMC_FLOOD_HOTSPOTS
from app.services.tide_service import DEFAULT_STATIONS_HARMONICS


async def seed_flood_and_tide():
    print("🌊 [1/2] Bắt đầu nạp dữ liệu Trạm Thủy Triều & Sóng Điều Hòa...")
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    try:
        # 1. TIDE STATIONS
        tide_stations_data = [
            ("PHU_AN", "Trạm Thủy văn Phú An", "Sông Sài Gòn", 106.7150, 10.7920, 0.00, 0.05),
            ("NHA_BE", "Trạm Thủy văn Nhà Bè", "Sông Đồng Điền", 106.7450, 10.6650, 0.00, 0.08),
        ]

        for code, name, river, lng, lat, datum, h0 in tide_stations_data:
            await conn.execute("""
                INSERT INTO tide_stations (station_code, station_name, river_system, location, datum_offset_meters, mean_sea_level_meters, is_active)
                VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, TRUE)
                ON CONFLICT (station_code) DO UPDATE SET
                    station_name = EXCLUDED.station_name,
                    river_system = EXCLUDED.river_system,
                    location = EXCLUDED.location;
            """, code, name, river, lng, lat, datum, h0)

        # 2. TIDE HARMONIC CONSTITUENTS
        for st_code, st_info in DEFAULT_STATIONS_HARMONICS.items():
            st_id = await conn.fetchval("SELECT station_id FROM tide_stations WHERE station_code = $1", st_code)
            if not st_id:
                continue
            for c in st_info["constituents"]:
                await conn.execute("""
                    INSERT INTO tide_harmonic_constituents (station_id, name, angular_speed_deg_per_hour, amplitude_meters, phase_lag_degrees)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (station_id, name) DO UPDATE SET
                        angular_speed_deg_per_hour = EXCLUDED.angular_speed_deg_per_hour,
                        amplitude_meters = EXCLUDED.amplitude_meters,
                        phase_lag_degrees = EXCLUDED.phase_lag_degrees;
                """, st_id, c["name"], c["speed"], c["amp"], c["phase"])

        print("   -> Đã nạp thành công các trạm thủy triều và sóng điều hòa thiên văn.")

        # 3. FLOOD HOTSPOTS
        print("🌊 [2/2] Bắt đầu nạp 30 điểm đen ngập lụt thực tế TP.HCM...")
        inserted_hotspots = 0
        for spot in HCMC_FLOOD_HOTSPOTS:
            spot_id = spot["id"]
            name = spot["name"]
            street = spot.get("street") or name
            district = spot.get("district", "TP. Hồ Chí Minh")
            lat = spot["lat"]
            lng = spot["lng"]
            cause = "TIDAL" if "TRIỀU CƯỜNG" in spot.get("cause", "") and "MƯA" not in spot.get("cause", "") else \
                    "RAINFALL" if "MƯA" in spot.get("cause", "") and "TRIỀU" not in spot.get("cause", "") else "COMBINED"
            max_depth = float(spot.get("historical_depth_cm", 35))
            thresh_tide = 1.60 if "TRIỀU" in spot.get("cause", "") else 1.75
            thresh_rain = 25.0 if "MƯA" in spot.get("cause", "") else 45.0
            
            # GeoJSON road corridor
            coords = spot.get("segment_coords")
            corridor_geom_sql = "NULL"
            if coords and len(coords) >= 2:
                geojson_str = json.dumps({"type": "LineString", "coordinates": coords})
                corridor_geom_sql = "ST_SetSRID(ST_GeomFromGeoJSON($8), 4326)"

            if corridor_geom_sql != "NULL":
                await conn.execute(f"""
                    INSERT INTO flood_hotspots (
                        hotspot_code, street_name, district_name, location, road_corridor,
                        primary_cause, threshold_tide_meters, threshold_rain_mm_per_hour,
                        historical_max_depth_cm, drainage_system_rating, is_active
                    )
                    VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), {corridor_geom_sql}, $6, $7, $9, $10, 3, TRUE)
                    ON CONFLICT (hotspot_code) DO UPDATE SET
                        street_name = EXCLUDED.street_name,
                        district_name = EXCLUDED.district_name,
                        location = EXCLUDED.location,
                        road_corridor = EXCLUDED.road_corridor,
                        primary_cause = EXCLUDED.primary_cause,
                        historical_max_depth_cm = EXCLUDED.historical_max_depth_cm;
                """, spot_id, street, district, lat, lng, cause, thresh_tide, geojson_str, thresh_rain, max_depth)
            else:
                await conn.execute("""
                    INSERT INTO flood_hotspots (
                        hotspot_code, street_name, district_name, location,
                        primary_cause, threshold_tide_meters, threshold_rain_mm_per_hour,
                        historical_max_depth_cm, drainage_system_rating, is_active
                    )
                    VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, $8, $9, 3, TRUE)
                    ON CONFLICT (hotspot_code) DO UPDATE SET
                        street_name = EXCLUDED.street_name,
                        district_name = EXCLUDED.district_name,
                        location = EXCLUDED.location,
                        primary_cause = EXCLUDED.primary_cause,
                        historical_max_depth_cm = EXCLUDED.historical_max_depth_cm;
                """, spot_id, street, district, lat, lng, cause, thresh_tide, thresh_rain, max_depth)

            inserted_hotspots += 1

        print(f"   -> Đã nạp thành công {inserted_hotspots} điểm ngập thực tế TP.HCM.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_flood_and_tide())
