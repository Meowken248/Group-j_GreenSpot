import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
import asyncio
from sqlalchemy import text
from app.database import engine

sys.stdout.reconfigure(encoding='utf-8')

# 22 quận/huyện & TP. Thủ Đức chuẩn TP.HCM với tọa độ centroid và số liệu vi khí hậu thực tế
DISTRICTS_DATA = [
    ("QUAN_1", "Quận 1", 10.7756, 106.7004, 145, 36.2, 58, 92.5, 450, 88.0),
    ("QUAN_3", "Quận 3", 10.7844, 106.6843, 115, 35.4, 45, 94.2, 380, 85.5),
    ("QUAN_4", "Quận 4", 10.7578, 106.7013, 138, 35.8, 62, 88.7, 310, 78.2),
    ("QUAN_5", "Quận 5", 10.7554, 106.6668, 162, 36.8, 70, 86.5, 420, 81.0),
    ("QUAN_6", "Quận 6", 10.7481, 106.6352, 140, 36.0, 64, 87.0, 350, 79.5),
    ("QUAN_7", "Quận 7", 10.7340, 106.7218, 88, 33.2, 35, 96.0, 520, 92.0),
    ("QUAN_8", "Quận 8", 10.7241, 106.6286, 175, 36.5, 78, 82.0, 480, 74.0),
    ("QUAN_10", "Quận 10", 10.7716, 106.6672, 130, 35.9, 52, 91.0, 410, 83.0),
    ("QUAN_11", "Quận 11", 10.7629, 106.6503, 125, 35.5, 48, 90.5, 340, 82.5),
    ("QUAN_12", "Quận 12", 10.8672, 106.6413, 185, 37.2, 82, 80.5, 620, 71.5),
    ("BINH_THANH", "Quận Bình Thạnh", 10.8106, 106.7091, 128, 34.8, 55, 93.0, 590, 86.0),
    ("GO_VAP", "Quận Gò Vấp", 10.8388, 106.6658, 170, 37.0, 74, 85.0, 680, 76.5),
    ("PHU_NHUAN", "Quận Phú Nhuận", 10.7992, 106.6803, 105, 34.6, 42, 95.5, 390, 89.0),
    ("TAN_BINH", "Quận Tân Bình", 10.8015, 106.6526, 155, 36.6, 68, 87.5, 540, 80.0),
    ("TAN_PHU", "Quận Tân Phú", 10.7901, 106.6280, 168, 36.9, 72, 84.0, 490, 77.0),
    ("BINH_TAN", "Quận Bình Tân", 10.7654, 106.6038, 215, 39.4, 88, 76.0, 780, 68.0), # Warning AQI > 200, Temp > 39, Risk > 75
    ("TP_THU_DUC", "TP. Thủ Đức", 10.8494, 106.7716, 95, 33.8, 38, 95.0, 890, 94.0),
    ("BINH_CHANH", "Huyện Bình Chánh", 10.6874, 106.5939, 142, 35.0, 60, 86.0, 510, 78.0),
    ("CU_CHI", "Huyện Củ Chi", 11.0067, 106.5132, 65, 31.8, 25, 96.5, 380, 91.5),
    ("HOC_MON", "Huyện Hóc Môn", 10.8841, 106.5914, 152, 36.2, 65, 84.5, 460, 75.0),
    ("NHA_BE", "Huyện Nhà Bè", 10.6953, 106.7291, 75, 32.5, 30, 95.8, 330, 90.0),
    ("CAN_GIO", "Huyện Cần Giờ", 10.5100, 106.8700, 42, 30.5, 18, 98.0, 290, 96.5),
]

async def migrate_and_seed_32_33():
    async with engine.begin() as conn:
        print("Checking tables for Features 32 & 33...")

        # 1. Table community_groups (Feature 32: Bảng xếp hạng Nhóm)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS community_groups (
                group_id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                avatar_url TEXT,
                description TEXT,
                member_count INT NOT NULL DEFAULT 1,
                total_points INT NOT NULL DEFAULT 0,
                weekly_points INT NOT NULL DEFAULT 0,
                monthly_points INT NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        """))

        # 2. Table district_environmental_stats (Feature 32: Bảng xếp hạng Quận & Feature 33: Bản đồ nhiệt)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS district_environmental_stats (
                district_code VARCHAR(50) PRIMARY KEY,
                district_name VARCHAR(100) NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lng DOUBLE PRECISION NOT NULL,
                aqi_value INT NOT NULL,
                temperature_c DOUBLE PRECISION NOT NULL,
                risk_score INT NOT NULL,
                cleanup_rate DOUBLE PRECISION NOT NULL,
                resolved_incidents INT NOT NULL,
                green_index DOUBLE PRECISION NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        """))

        # Seed Community Groups
        await conn.execute(text("""
            INSERT INTO community_groups (group_id, name, avatar_url, description, member_count, total_points, weekly_points, monthly_points)
            VALUES
            ('GRP_GREEN_YOUTH', 'CLB Thanh Niên Xanh TP.HCM', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200', 'Đội xung kích tình nguyện dọn sạch rác kênh rạch và điểm nóng ô nhiễm.', 142, 18450, 1250, 4800),
            ('GRP_ECO_RUNNERS', 'Biệt Đội Eco-Runners Sài Gòn', 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=200', 'Nhóm chạy bộ kết hợp nhặt rác (Plogging) định kỳ mỗi sáng Chủ Nhật.', 98, 14200, 980, 3650),
            ('GRP_SAIGON_XANH', 'Cộng Đồng Sài Gòn Xanh', 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=200', 'Tổ chức các chiến dịch Chủ Nhật Xanh khơi thông dòng chảy tại các tuyến rạch.', 215, 23500, 1620, 6200),
            ('GRP_ZERO_WASTE', 'Liên Minh Zero-Waste Sinh Viên', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200', 'Tuyên truyền giảm thiểu rác thải nhựa dùng một lần tại các trường đại học.', 76, 9800, 640, 2450),
            ('GRP_GREEN_NEIGHBOR', 'Tổ Dân Phố Xanh Bình Thạnh', 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=200', 'Mô hình phân loại rác tại nguồn và đổi rác lấy quà tặng sinh thái.', 65, 8250, 520, 1980)
            ON CONFLICT (group_id) DO UPDATE SET
                name = EXCLUDED.name,
                member_count = EXCLUDED.member_count,
                total_points = EXCLUDED.total_points,
                weekly_points = EXCLUDED.weekly_points,
                monthly_points = EXCLUDED.monthly_points;
        """))

        # Seed 22 Districts Stats
        for item in DISTRICTS_DATA:
            code, name, lat, lng, aqi, temp, risk, cleanup, inc, green_idx = item
            await conn.execute(text(f"""
                INSERT INTO district_environmental_stats 
                (district_code, district_name, lat, lng, aqi_value, temperature_c, risk_score, cleanup_rate, resolved_incidents, green_index, updated_at)
                VALUES 
                ('{code}', '{name}', {lat}, {lng}, {aqi}, {temp}, {risk}, {cleanup}, {inc}, {green_idx}, now())
                ON CONFLICT (district_code) DO UPDATE SET
                    district_name = EXCLUDED.district_name,
                    lat = EXCLUDED.lat,
                    lng = EXCLUDED.lng,
                    aqi_value = EXCLUDED.aqi_value,
                    temperature_c = EXCLUDED.temperature_c,
                    risk_score = EXCLUDED.risk_score,
                    cleanup_rate = EXCLUDED.cleanup_rate,
                    resolved_incidents = EXCLUDED.resolved_incidents,
                    green_index = EXCLUDED.green_index,
                    updated_at = now();
            """))

    print("Migration and seed for Features 32 & 33 completed successfully!")

if __name__ == '__main__':
    asyncio.run(migrate_and_seed_32_33())
