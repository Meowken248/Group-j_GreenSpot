"""
High-Speed Real Air Quality Data Importer to PostgreSQL.
Imports 100,000+ real hourly observations from Open-Meteo Parquet datasets
into PostgreSQL table `air_quality_records`.
"""

import asyncio
import glob
import os
import time
import uuid
import asyncpg
import pandas as pd
from app.core.config import settings


async def load_real_data_to_pg(target_count: int = 120000):
    print("=" * 70)
    print(f"🚀 BẮT ĐẦU NẠP DỮ LIỆU QUAN TRẮC THỰC TẾ VIỆT NAM VÀO POSTGRESQL (Mục tiêu >= {target_count:,})")
    print("=" * 70)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "air_quality", "data", "aqi"))
    if not os.path.exists(base_dir):
        print(f"❌ Không tìm thấy thư mục: {base_dir}")
        return

    all_files = glob.glob(os.path.join(base_dir, "**", "*.parquet"), recursive=True)
    print(f"📁 Tìm thấy {len(all_files):,} file Parquet chứa số liệu đo đạc thực tế...")

    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    try:
        current_in_db = await conn.fetchval("SELECT count(*) FROM air_quality_records;")
        if current_in_db >= target_count:
            print(f"✅ Bảng air_quality_records đã có sẵn {current_in_db:,} bản ghi thực tế.")
            return

        print(f"⏳ Hiện có {current_in_db:,} records. Đang xử lý và chuẩn bị nạp dữ liệu...")

        records_to_insert = []
        loaded_count = 0
        t0 = time.time()

        for filepath in all_files:
            try:
                df = pd.read_parquet(filepath)
                if df.empty:
                    continue

                for row in df.itertuples(index=False):
                    # Parse timestamp
                    ts = pd.to_datetime(getattr(row, "timestamp", None))
                    if pd.isna(ts):
                        continue

                    prov = str(getattr(row, "province", "Việt Nam"))
                    loc_name = str(getattr(row, "location", prov))
                    lat = float(getattr(row, "lat", 0.0))
                    lon = float(getattr(row, "lon", 0.0))
                    aqi = float(row.aqi) if pd.notna(getattr(row, "aqi", None)) else None
                    temp = float(row.temp) if pd.notna(getattr(row, "temp", None)) else None
                    humidity = float(row.humidity) if pd.notna(getattr(row, "humidity", None)) else None
                    rain = float(row.rain) if pd.notna(getattr(row, "rain", None)) else None
                    wind_speed = float(row.wind_speed) if pd.notna(getattr(row, "wind_speed", None)) else None
                    wind_dir = float(row.wind_dir) if pd.notna(getattr(row, "wind_dir", None)) else None
                    pressure = float(row.pressure) if pd.notna(getattr(row, "pressure", None)) else None
                    cloud = float(row.cloud) if pd.notna(getattr(row, "cloud", None)) else None
                    pm2_5 = float(row.pm2_5) if pd.notna(getattr(row, "pm2_5", None)) else None
                    pm10 = float(row.pm10) if pd.notna(getattr(row, "pm10", None)) else None
                    co = float(row.co) if pd.notna(getattr(row, "co", None)) else None
                    no2 = float(row.no2) if pd.notna(getattr(row, "no2", None)) else None
                    o3 = float(row.o3) if pd.notna(getattr(row, "o3", None)) else None
                    so2 = float(row.so2) if pd.notna(getattr(row, "so2", None)) else None
                    poll_lvl = str(getattr(row, "pollution_level", "Unknown"))
                    poll_cls = float(getattr(row, "pollution_class", 0.0))

                    records_to_insert.append((
                        uuid.uuid4(), prov, loc_name, ts.to_pydatetime(), lat, lon,
                        aqi, temp, humidity, rain, wind_speed, wind_dir,
                        pressure, cloud, pm2_5, pm10, co, no2, o3, so2,
                        poll_lvl, poll_cls
                    ))

                    loaded_count += 1
                    if loaded_count >= target_count:
                        break

                if loaded_count >= target_count:
                    break

            except Exception as e:
                continue

        print(f"📦 Đã thu thập {len(records_to_insert):,} dòng dữ liệu đo đạc thực tế ({time.time() - t0:.2f}s).")
        print("⚡ Đang bulk copy vào PostgreSQL...")

        cols = [
            "record_id", "province", "location_name", "timestamp", "lat", "lon",
            "aqi", "temp", "humidity", "rain", "wind_speed", "wind_dir",
            "pressure", "cloud", "pm2_5", "pm10", "co", "no2", "o3", "so2",
            "pollution_level", "pollution_class"
        ]

        t_copy = time.time()
        await conn.copy_records_to_table("air_quality_records", records=records_to_insert, columns=cols)
        copy_time = time.time() - t_copy

        total_in_db = await conn.fetchval("SELECT count(*) FROM air_quality_records;")
        print(f"✅ Hoàn tất! Bảng air_quality_records hiện có: {total_in_db:,} records thực tế ({copy_time:.2f}s).")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(load_real_data_to_pg())
