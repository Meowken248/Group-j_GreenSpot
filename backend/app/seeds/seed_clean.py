"""
EcoReport Clean & Rich Seeder for Ho Chi Minh City
Nạp dữ liệu thực tế đầy đủ:
- Đơn vị hành chính & Ranh giới quận huyện (Administrative Units GeoJSON)
- Danh mục loại chất thải (Waste Categories)
- Sự cố ô nhiễm môi trường (Incidents)
- Không gian xanh & Công viên sinh thái (Essential Facilities / Green Spaces)
- Trạm thu gom rác tái chế & pin (Recycling Facilities)
- Trạm cảm biến quan trắc IoT (IoT Sensor Stations)
"""

import asyncio
import uuid
import asyncpg
from app.config import settings

SEED_SQL = """
-- 1. ROLES
INSERT INTO roles (role_id, role_code, role_name, description, is_system)
SELECT 1, 'ADMIN', 'Quản trị viên Hệ thống', 'Toàn quyền quản trị', TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_code = 'ADMIN');

INSERT INTO roles (role_id, role_code, role_name, description, is_system)
SELECT 2, 'OFFICER', 'Cán bộ Môi trường', 'Tiếp nhận và xử lý sự cố', TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_code = 'OFFICER');

INSERT INTO roles (role_id, role_code, role_name, description, is_system)
SELECT 3, 'COLLECTOR', 'Đội Thu gom Hiện trường', 'Xử lý tại chỗ', TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_code = 'COLLECTOR');

INSERT INTO roles (role_id, role_code, role_name, description, is_system)
SELECT 4, 'CITIZEN', 'Công dân Đô thị', 'Gửi báo cáo ô nhiễm', TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_code = 'CITIZEN');

-- 2. USERS
INSERT INTO users (user_id, email, phone_number, password_hash, full_name, role_id, status)
SELECT '11111111-1111-1111-1111-111111111111', 'admin@ecoreport.gov.vn', '0901000001', 'mock_hash', 'Quản trị viên Hệ thống', 1, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@ecoreport.gov.vn');

INSERT INTO users (user_id, email, phone_number, password_hash, full_name, role_id, status)
SELECT '22222222-2222-2222-2222-222222222222', 'officer@ecoreport.gov.vn', '0901000002', 'mock_hash', 'Cán bộ Phòng TN&MT', 2, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'officer@ecoreport.gov.vn');

INSERT INTO users (user_id, email, phone_number, password_hash, full_name, role_id, status)
SELECT '44444444-4444-4444-4444-444444444444', 'citizen@ecoreport.gov.vn', '0901000004', 'mock_hash', 'Nguyễn Thành Đạt (Công dân)', 4, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'citizen@ecoreport.gov.vn');

-- 3. ADMINISTRATIVE UNITS (ĐƠN VỊ HÀNH CHÍNH & RANH GIỚI POLYGON)
INSERT INTO administrative_units (unit_id, unit_code, name, level, area_km2, population, centroid, boundary)
SELECT 1, '79', 'Thành phố Hồ Chí Minh', 'PROVINCE', 2095.0, 9300000,
       ST_SetSRID(ST_MakePoint(106.660172, 10.762622), 4326), NULL
WHERE NOT EXISTS (SELECT 1 FROM administrative_units WHERE unit_code = '79');

INSERT INTO administrative_units (unit_id, unit_code, name, level, parent_id, area_km2, population, centroid, boundary)
SELECT 2, '769', 'TP. Thủ Đức', 'DISTRICT', 1, 211.5, 1200000,
       ST_SetSRID(ST_MakePoint(106.758414, 10.849409), 4326),
       ST_Multi(ST_GeomFromText('POLYGON((106.715 10.765, 106.765 10.745, 106.845 10.835, 106.815 10.895, 106.745 10.865, 106.715 10.795, 106.715 10.765))', 4326))
WHERE NOT EXISTS (SELECT 1 FROM administrative_units WHERE unit_code = '769');

INSERT INTO administrative_units (unit_id, unit_code, name, level, parent_id, area_km2, population, centroid, boundary)
SELECT 3, '760', 'Quận 1', 'DISTRICT', 1, 7.72, 142000,
       ST_SetSRID(ST_MakePoint(106.6975, 10.7765), 4326),
       ST_Multi(ST_GeomFromText('POLYGON((106.685 10.768, 106.697 10.761, 106.708 10.769, 106.707 10.789, 106.696 10.793, 106.685 10.781, 106.685 10.768))', 4326))
WHERE NOT EXISTS (SELECT 1 FROM administrative_units WHERE unit_code = '760');

INSERT INTO administrative_units (unit_id, unit_code, name, level, parent_id, area_km2, population, centroid, boundary)
SELECT 4, '778', 'Quận 7', 'DISTRICT', 1, 35.76, 360000,
       ST_SetSRID(ST_MakePoint(106.7315, 10.7345), 4326),
       ST_Multi(ST_GeomFromText('POLYGON((106.695 10.745, 106.745 10.748, 106.755 10.715, 106.715 10.705, 106.695 10.725, 106.695 10.745))', 4326))
WHERE NOT EXISTS (SELECT 1 FROM administrative_units WHERE unit_code = '778');

INSERT INTO administrative_units (unit_id, unit_code, name, level, parent_id, area_km2, population, centroid, boundary)
SELECT 5, '765', 'Quận Bình Thạnh', 'DISTRICT', 1, 20.78, 499000,
       ST_SetSRID(ST_MakePoint(106.7105, 10.8015), 4326),
       ST_Multi(ST_GeomFromText('POLYGON((106.695 10.795, 106.735 10.795, 106.745 10.835, 106.715 10.845, 106.685 10.815, 106.695 10.795))', 4326))
WHERE NOT EXISTS (SELECT 1 FROM administrative_units WHERE unit_code = '765');

INSERT INTO administrative_units (unit_id, unit_code, name, level, parent_id, area_km2, population, centroid, boundary)
SELECT 6, '787', 'Huyện Cần Giờ', 'DISTRICT', 1, 704.45, 71500,
       ST_SetSRID(ST_MakePoint(106.8850, 10.4150), 4326),
       ST_Multi(ST_GeomFromText('POLYGON((106.795 10.615, 107.015 10.455, 106.945 10.375, 106.745 10.465, 106.795 10.615))', 4326))
WHERE NOT EXISTS (SELECT 1 FROM administrative_units WHERE unit_code = '787');

-- 4. WASTE CATEGORIES
INSERT INTO waste_categories (category_id, category_code, name, description, default_severity, sla_hours, color_hex, icon_name)
SELECT 1, 'DOMESTIC_WASTE', 'Rác thải sinh hoạt ứ đọng', 'Bãi rác tự phát, túi ni lông bốc mùi', 'MEDIUM', 24, '#EAB308', 'trash'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE category_code = 'DOMESTIC_WASTE');

INSERT INTO waste_categories (category_id, category_code, name, description, default_severity, sla_hours, color_hex, icon_name)
SELECT 2, 'HAZARDOUS_WASTE', 'Chất thải nguy hại & Pin cũ', 'Pin cũ, hóa chất, bóng đèn huỳnh quang', 'CRITICAL', 12, '#EF4444', 'alert-triangle'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE category_code = 'HAZARDOUS_WASTE');

INSERT INTO waste_categories (category_id, category_code, name, description, default_severity, sla_hours, color_hex, icon_name)
SELECT 3, 'WATERWAY_POLLUTION', 'Ô nhiễm kênh rạch & Nguồn nước', 'Rác thải nổi lềnh bềnh, nước đen bốc mùi', 'HIGH', 36, '#3B82F6', 'droplets'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE category_code = 'WATERWAY_POLLUTION');

INSERT INTO waste_categories (category_id, category_code, name, description, default_severity, sla_hours, color_hex, icon_name)
SELECT 4, 'DRAINAGE_BLOCK', 'Điểm nghẽn cống ngập úng', 'Miệng hố ga bị rác bịt kín gây ngập cục bộ', 'HIGH', 18, '#06B6D4', 'cloud-rain'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE category_code = 'DRAINAGE_BLOCK');

INSERT INTO waste_categories (category_id, category_code, name, description, default_severity, sla_hours, color_hex, icon_name)
SELECT 5, 'CONSTRUCTION_DEBRIS', 'Xà bần & Phế thải xây dựng', 'Gạch vữa phế thải lấn chiếm lòng lề đường', 'LOW', 72, '#78716C', 'truck'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE category_code = 'CONSTRUCTION_DEBRIS');

-- 5. INCIDENTS (SỰ CỐ MÔI TRƯỜNG THỰC TẾ TP.HCM)
DELETE FROM incidents WHERE tracking_code LIKE 'ECO-HCM-%';

INSERT INTO incidents (incident_id, tracking_code, reporter_id, category_id, unit_id, title, description, address_text, location, latitude, longitude, severity, status, risk_score, is_anonymous, upvotes_count)
VALUES
(gen_random_uuid(), 'ECO-HCM-001', '44444444-4444-4444-4444-444444444444', 3, 3,
 'Rác thải trôi nổi và lục bình ứ đọng ven sông Sài Gòn',
 'Túi nilon và chai nhựa dạt vào bến Bạch Đằng gây mất mỹ quan đô thị trung tâm và bốc mùi khi nước ròng.',
 'Bến Bạch Đằng, Tôn Đức Thắng, Quận 1',
 ST_SetSRID(ST_MakePoint(106.7065, 10.7725), 4326), 10.7725, 106.7065, 'HIGH', 'PENDING', 82.0, FALSE, 12),

(gen_random_uuid(), 'ECO-HCM-002', '44444444-4444-4444-4444-444444444444', 1, 2,
 'Bãi rác tự phát lấn chiếm vỉa hè đường Võ Văn Ngân',
 'Túi rác sinh hoạt chất đống gần ngã 5 Chợ Thủ Đức, nước rỉ rác bốc mùi nồng nặc và cản trở người đi bộ.',
 'Số 245 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức',
 ST_SetSRID(ST_MakePoint(106.7625, 10.8512), 4326), 10.8512, 106.7625, 'CRITICAL', 'IN_PROGRESS', 91.5, FALSE, 25),

(gen_random_uuid(), 'ECO-HCM-003', '44444444-4444-4444-4444-444444444444', 4, 4,
 'Cửa cống thoát nước bị rác bít kín gây ngập Kênh Tè',
 'Miệng hố ga gom nước mưa bị bùn đất và lá cây chèn cứng gây ngập nước sâu sau các đợt mưa lớn.',
 'Đường Nguyễn Thị Thập, Phường Tân Phú, Quận 7',
 ST_SetSRID(ST_MakePoint(106.7215, 10.7380), 4326), 10.7380, 106.7215, 'HIGH', 'RESOLVED', 64.0, FALSE, 8),

(gen_random_uuid(), 'ECO-HCM-004', '44444444-4444-4444-4444-444444444444', 3, 5,
 'Ô nhiễm kênh Nhiêu Lộc - Thị Nghè đoạn cầu Điện Biên Phủ',
 'Xuất hiện váng dầu loang và mùi khét rác thải hữu cơ theo dòng chảy thủy triều qua địa bàn Bình Thạnh.',
 'Chân cầu Điện Biên Phủ, Phường 15, Quận Bình Thạnh',
 ST_SetSRID(ST_MakePoint(106.6995, 10.7930), 4326), 10.7930, 106.6995, 'HIGH', 'IN_PROGRESS', 77.5, FALSE, 18),

(gen_random_uuid(), 'ECO-HCM-005', '44444444-4444-4444-4444-444444444444', 5, 2,
 'Đổ trộm xà bần xây dựng ven đường Lương Định Của',
 'Đoạn đường đất trống dự án Thủ Thiêm bị xe tải đổ trộm hơn 5 khối gạch vỡ và bê tông vào ban đêm.',
 'Đường Lương Định Của, Phường An Khánh, TP. Thủ Đức',
 ST_SetSRID(ST_MakePoint(106.7280, 10.7850), 4326), 10.7850, 106.7280, 'MEDIUM', 'PENDING', 58.0, FALSE, 5),

(gen_random_uuid(), 'ECO-HCM-006', '44444444-4444-4444-4444-444444444444', 1, 3,
 'Tập kết rác trái phép sau chợ Bến Thành',
 'Thùng rác chợ tràn ra mặt đường Lê Thánh Tôn trong giờ cao điểm du lịch gây mất vệ sinh công cộng.',
 'Đường Lê Thánh Tôn, Phường Bến Thành, Quận 1',
 ST_SetSRID(ST_MakePoint(106.6980, 10.7720), 4326), 10.7720, 106.6980, 'MEDIUM', 'IN_PROGRESS', 65.0, FALSE, 15),

(gen_random_uuid(), 'ECO-HCM-007', '44444444-4444-4444-4444-444444444444', 4, 5,
 'Điểm đen ngập nước do cống nghẽn đường Ung Văn Khiêm',
 'Đoạn đường trũng thấp thường xuyên ngập lút bánh xe khi mưa kết hợp triều cường sông Sài Gòn.',
 'Đường Ung Văn Khiêm, Phường 25, Quận Bình Thạnh',
 ST_SetSRID(ST_MakePoint(106.7180, 10.8065), 4326), 10.8065, 106.7180, 'HIGH', 'PENDING', 79.0, FALSE, 21),

(gen_random_uuid(), 'ECO-HCM-008', '44444444-4444-4444-4444-444444444444', 3, 6,
 'Rác thải nhựa trôi dạt vào bãi biển 30/4 Cần Giờ',
 'Mảnh lưới đánh cá và chai nhựa thủy sinh dạt vào dải rừng ngập mặn ven biển Cần Giờ.',
 'Bãi biển 30/4, Xã Long Hòa, Huyện Cần Giờ',
 ST_SetSRID(ST_MakePoint(106.9450, 10.4120), 4326), 10.4120, 106.9450, 'MEDIUM', 'RESOLVED', 53.0, FALSE, 9);

-- 6. ESSENTIAL FACILITIES & GREEN SPACES (ĐIỂM XANH & CÔNG VIÊN)
DELETE FROM essential_facilities WHERE facility_name IN (
  'Công viên Tao Đàn', 'Thảo Cầm Viên Sài Gòn', 'Công viên Vinhomes Central Park Landmark 81',
  'Công viên Bờ sông Sài Gòn Thủ Thiêm', 'Công viên Hồ Bán Nguyệt & Cầu Ánh Sao Phú Mỹ Hưng',
  'Khu Du lịch Sinh thái Bình Quới', 'Khu Dự trữ Sinh quyển Rừng Sác Cần Giờ', 'Công viên Gia Định'
);

INSERT INTO essential_facilities (facility_name, facility_type, address, unit_id, location, vulnerability_level, metadata)
VALUES
('Công viên Tao Đàn', 'PARK', 'Đường Trương Định, Phường Bến Thành, Quận 1', 3,
 ST_SetSRID(ST_MakePoint(106.6925, 10.7745), 4326), 'LOW',
 '{"area_m2": 100000, "trees_count": 1000, "status": "Rất trong lành", "rating": 4.8}'::jsonb),

('Thảo Cầm Viên Sài Gòn', 'BOTANICAL_GARDEN', 'Số 2 Nguyễn Bỉnh Khiêm, Phường Bến Nghé, Quận 1', 3,
 ST_SetSRID(ST_MakePoint(106.7050, 10.7875), 4326), 'LOW',
 '{"area_m2": 170000, "trees_count": 2500, "status": "Cực kỳ xanh mát", "rating": 4.9}'::jsonb),

('Công viên Vinhomes Central Park Landmark 81', 'PARK', '208 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh', 5,
 ST_SetSRID(ST_MakePoint(106.7215, 10.7940), 4326), 'LOW',
 '{"area_m2": 140000, "status": "Thảm cỏ xanh ven sông", "rating": 4.9}'::jsonb),

('Công viên Bờ sông Sài Gòn Thủ Thiêm', 'PARK', 'Khu Đô thị Mới Thủ Thiêm, Phường An Khánh, TP. Thủ Đức', 2,
 ST_SetSRID(ST_MakePoint(106.7110, 10.7735), 4326), 'LOW',
 '{"area_m2": 200000, "status": "Cánh đồng hoa hướng dương ven sông", "rating": 4.7}'::jsonb),

('Công viên Hồ Bán Nguyệt & Cầu Ánh Sao Phú Mỹ Hưng', 'PARK', 'Khu Đô thị Phú Mỹ Hưng, Phường Tân Phú, Quận 7', 4,
 ST_SetSRID(ST_MakePoint(106.7195, 10.7285), 4326), 'LOW',
 '{"area_m2": 120000, "status": "Mặt nước & Cây xanh sinh thái", "rating": 4.8}'::jsonb),

('Khu Du lịch Sinh thái Bình Quới', 'ECO_TOURISM', 'Bán đảo Thanh Đa, Phường 28, Quận Bình Thạnh', 5,
 ST_SetSRID(ST_MakePoint(106.7350, 10.8285), 4326), 'LOW',
 '{"area_m2": 350000, "status": "Ốc đảo xanh Nam Bộ", "rating": 4.6}'::jsonb),

('Khu Dự trữ Sinh quyển Rừng Sác Cần Giờ', 'BIOSPHERE_RESERVE', 'Đường Rừng Sác, Huyện Cần Giờ', 6,
 ST_SetSRID(ST_MakePoint(106.8750, 10.4550), 4326), 'LOW',
 '{"area_m2": 757400000, "status": "Lá phổi xanh TP.HCM", "rating": 5.0}'::jsonb),

('Công viên Gia Định', 'PARK', 'Đường Hoàng Minh Giám, Phường 3, Quận Gò Vấp', 1,
 ST_SetSRID(ST_MakePoint(106.6730, 10.8145), 4326), 'LOW',
 '{"area_m2": 320000, "status": "Lá phổi xanh phía Bắc", "rating": 4.7}'::jsonb);

-- 7. RECYCLING FACILITIES (TRẠM THU GOM RÁC TÁI CHẾ)
DELETE FROM recycling_facilities WHERE name LIKE '%(TP.HCM)%';

INSERT INTO recycling_facilities (name, facility_code, address, unit_id, location, accepted_waste_types, operating_hours, contact_phone, managing_org, is_active)
VALUES
('Trạm Thu gom Rác điện tử & Pin cũ Quận 1 (TP.HCM)', 'REC-Q1-01', '128 Hai Bà Trưng, Phường Đa Kao, Quận 1', 3,
 ST_SetSRID(ST_MakePoint(106.6960, 10.7850), 4326), ARRAY['PIN_CU', 'THIET_BI_DIEN_TU', 'BONG_DEN'], '08:00 - 17:00 (T2 - T7)', '028.3822.1122', 'Sở TN&MT TP.HCM', TRUE),

('Trạm Tái chế Vỏ hộp sữa & Nhựa Tetra Pak (TP.HCM)', 'REC-TD-01', '105 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức', 2,
 ST_SetSRID(ST_MakePoint(106.7550, 10.8490), 4326), ARRAY['VO_HOP_SUA', 'NHUA_PET', 'GIAY_BIA'], '07:30 - 17:30 (Hàng ngày)', '028.3722.9988', 'PRO Vietnam & UBND', TRUE),

('Điểm Thu hồi Kim loại & Chai thủy tinh Xanh (TP.HCM)', 'REC-Q7-01', 'Đường Nguyễn Lương Bằng, Phường Tân Phú, Quận 7', 4,
 ST_SetSRID(ST_MakePoint(106.7260, 10.7290), 4326), ARRAY['THUY_TINH', 'NHOM_KIM_LOAI', 'NHUA_TAI_CHE'], '08:00 - 18:00', '028.5413.5566', 'Môi trường Đô thị Q7', TRUE),

('Trạm Phân loại Rác tại Nguồn Bình Thạnh (TP.HCM)', 'REC-BT-01', 'Đường Nơ Trang Long, Phường 14, Quận Bình Thạnh', 5,
 ST_SetSRID(ST_MakePoint(106.6965, 10.8080), 4326), ARRAY['RAC_HUU_CO', 'NHUA_PET', 'PIN_CU'], '07:00 - 18:00', '028.3841.2233', 'Công ty Môi trường Đô thị', TRUE),

('Trạm Thu hồi Đồ gia dụng cũ & E-waste (TP.HCM)', 'REC-TD-02', 'Đường Song Hành Xa Lộ Hà Nội, An Phú, TP. Thủ Đức', 2,
 ST_SetSRID(ST_MakePoint(106.7450, 10.8030), 4326), ARRAY['DO_DIEN_TU_LON', 'MUC_IN', 'PIN_CU'], '08:00 - 17:00', '028.3744.1100', 'Vietnam Recycles', TRUE),

('Điểm Tiếp nhận Thu gom Rác nhựa ven biển (TP.HCM)', 'REC-CG-01', 'Đường Duyên Hải, Thị trấn Cần Thạnh, Huyện Cần Giờ', 6,
 ST_SetSRID(ST_MakePoint(106.9600, 10.3950), 4326), ARRAY['RAC_NHUA_BIEN', 'NHUA_TAI_CHE'], '07:00 - 17:00', '028.3874.0011', 'Ban Quản lý Rừng Sác', TRUE);

-- 8. IOT SENSOR STATIONS (TRẠM QUAN TRẮC CẢM BIẾN IOT)
DELETE FROM iot_sensor_stations WHERE station_code LIKE 'IOT-HCM-%';

INSERT INTO iot_sensor_stations (station_code, station_name, station_type, unit_id, location, address, installation_date, firmware_version, battery_powered, solar_powered, status, metadata)
VALUES
('IOT-HCM-01', 'Trạm Quan trắc Không khí AQI Trung tâm Bến Thành', 'AIR_QUALITY', 3,
 ST_SetSRID(ST_MakePoint(106.6985, 10.7730), 4326), 'Công viên 23/9, Lê Lai, Quận 1', '2025-01-15', 'v2.1.0', FALSE, TRUE, 'ONLINE',
 '{"aqi": 45, "status": "Tốt", "pm25": 11.2, "temp": 29.5, "humidity": 68}'::jsonb),

('IOT-HCM-02', 'Trạm Quan trắc AQI Khu Đô thị Landmark 81', 'AIR_QUALITY', 5,
 ST_SetSRID(ST_MakePoint(106.7220, 10.7950), 4326), 'Đài quan sát Landmark 81, Bình Thạnh', '2025-02-10', 'v2.1.0', FALSE, TRUE, 'ONLINE',
 '{"aqi": 38, "status": "Rất tốt", "pm25": 8.5, "temp": 28.9, "humidity": 72}'::jsonb),

('IOT-HCM-03', 'Trạm Cảm biến Ngập lụt Siêu âm Kênh Tè Q7', 'FLOOD_ULTRASONIC', 4,
 ST_SetSRID(ST_MakePoint(106.7110, 10.7485), 4326), 'Cầu Kênh Tè, Phường 4, Quận 7', '2025-03-01', 'v2.0.4', FALSE, TRUE, 'ONLINE',
 '{"water_level_cm": 118, "flood_threshold_cm": 160, "status": "An toàn", "risk": "LOW"}'::jsonb),

('IOT-HCM-04', 'Trạm Đo Triều cường & Mực nước Sông Sài Gòn', 'WATER_MONITORING', 2,
 ST_SetSRID(ST_MakePoint(106.7085, 10.7710), 4326), 'Trụ cầu Ba Son Thủ Thiêm, TP. Thủ Đức', '2025-01-20', 'v2.1.0', FALSE, TRUE, 'ONLINE',
 '{"tide_level_m": 1.32, "flow_speed_m_s": 0.85, "water_quality_index": 76}'::jsonb),

('IOT-HCM-05', 'Trạm Đo Không khí & Tiếng ồn Khu Công nghệ Cao', 'AIR_QUALITY', 2,
 ST_SetSRID(ST_MakePoint(106.7950, 10.8550), 4326), 'Xa lộ Hà Nội, Khu Công nghệ Cao, TP. Thủ Đức', '2025-02-15', 'v2.1.0', FALSE, TRUE, 'ONLINE',
 '{"aqi": 49, "status": "Tốt", "noise_db": 58, "pm25": 12.8}'::jsonb),

('IOT-HCM-06', 'Trạm Cảm biến Đo Ngập Ung Văn Khiêm Bình Thạnh', 'FLOOD_ULTRASONIC', 5,
 ST_SetSRID(ST_MakePoint(106.7170, 10.8060), 4326), 'Giao lộ Ung Văn Khiêm - D2, Quận Bình Thạnh', '2025-03-10', 'v2.0.4', FALSE, TRUE, 'ONLINE',
 '{"water_level_cm": 15, "flood_threshold_cm": 25, "status": "Cảnh báo ngập nhẹ", "risk": "MEDIUM"}'::jsonb),

('IOT-HCM-07', 'Trạm Khí tượng Sinh thái Rừng Sác Cần Giờ', 'AIR_QUALITY', 6,
 ST_SetSRID(ST_MakePoint(106.8850, 10.4200), 4326), 'Trạm bảo tồn Rừng Sác, Cần Giờ', '2025-01-05', 'v2.1.0', FALSE, TRUE, 'ONLINE',
 '{"aqi": 22, "status": "Rất trong lành", "pm25": 4.1, "temp": 28.0, "salinity_ppt": 18.5}'::jsonb);
"""

async def run_clean_seed():
    print("🌱 Đang thực thi nạp dữ liệu sạch chuẩn TP.HCM vào PostgreSQL/PostGIS...")
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(SEED_SQL)
        print("✅ Thành công! Đã nạp đầy đủ dữ liệu cho:")
        print("  - Đơn vị hành chính & Ranh giới quận huyện")
        print("  - Danh mục chất thải")
        print("  - Sự cố môi trường (Incidents)")
        print("  - Điểm xanh & Công viên (Green Spaces)")
        print("  - Trạm thu gom rác tái chế (Recycling Facilities)")
        print("  - Trạm quan trắc cảm biến IoT (IoT Sensor Stations)")
        
        inc_count = await conn.fetchval("SELECT count(*) FROM incidents;")
        fac_count = await conn.fetchval("SELECT count(*) FROM essential_facilities;")
        rec_count = await conn.fetchval("SELECT count(*) FROM recycling_facilities;")
        iot_count = await conn.fetchval("SELECT count(*) FROM iot_sensor_stations;")
        print(f"📊 Tổng kiểm tra: {inc_count} Sự cố, {fac_count} Điểm xanh, {rec_count} Trạm tái chế, {iot_count} Trạm IoT.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_clean_seed())
