"""EcoReport Database Seeder (Python / SQLAlchemy Async)
Nạp toàn bộ dữ liệu mẫu thực tế chuẩn môi trường (TP. Thủ Đức, TP. Hồ Chí Minh)
Hỗ trợ PostgreSQL 16 + PostGIS 3.4
"""

import asyncio
import asyncpg
from app.core.config import settings
from sqlalchemy import text
from app.database import engine


SEED_SQL = """
-- 1. SEED ROLES
INSERT INTO roles (role_id, role_code, role_name, description, is_system) VALUES
(1, 'ADMIN', 'Quản trị viên Hệ thống', 'Toàn quyền quản trị tham số, tài khoản và an ninh', TRUE),
(2, 'OFFICER', 'Cán bộ Môi trường / Điều phối viên', 'Tiếp nhận, thẩm tra, chuyển cấp và phân công sự cố', TRUE),
(3, 'COLLECTOR', 'Đội Thu gom & Xử lý Hiện trường', 'Tiếp nhận lệnh, cập nhật tiến độ và tải ảnh nghiệm thu', TRUE),
(4, 'CITIZEN', 'Công dân Đô thị', 'Gửi báo cáo sự cố, theo dõi tiến độ, tham gia chiến dịch', TRUE)
ON CONFLICT (role_code) DO NOTHING;

-- 2. SEED PERMISSIONS
INSERT INTO permissions (permission_code, module, action, description) VALUES
('incidents:create', 'INCIDENTS', 'CREATE', 'Gửi báo cáo sự cố ô nhiễm mới'),
('incidents:view_all', 'INCIDENTS', 'READ', 'Xem danh sách tất cả các sự cố'),
('incidents:verify', 'INCIDENTS', 'VERIFY', 'Xác thực tính chính xác của sự cố'),
('incidents:dispatch', 'INCIDENTS', 'DISPATCH', 'Phân công điều phối đội thu gom hiện trường'),
('incidents:resolve', 'INCIDENTS', 'RESOLVE', 'Nghiệm thu hoàn tất sự cố'),
('incidents:escalate', 'INCIDENTS', 'ESCALATE', 'Chuyển cấp hồ sơ Phường/Quận/Sở'),
('gis:view_map', 'GIS', 'READ', 'Xem bản đồ số và lớp dữ liệu chuyên đề'),
('gis:manage_layers', 'GIS', 'UPDATE', 'Quản lý cấu hình lớp bản đồ và ranh giới'),
('audit:view_logs', 'AUDIT', 'READ', 'Truy xuất nhật ký kiểm toán hệ thống'),
('system:manage_config', 'SYSTEM', 'UPDATE', 'Quản trị cấu hình và sao lưu phục hồi')
ON CONFLICT (permission_code) DO NOTHING;

-- 3. SEED ROLE PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, permission_id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, permission_id FROM permissions WHERE permission_code IN (
    'incidents:create', 'incidents:view_all', 'incidents:verify', 'incidents:dispatch', 
    'incidents:resolve', 'incidents:escalate', 'gis:view_map'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, permission_id FROM permissions WHERE permission_code IN (
    'incidents:view_all', 'incidents:resolve', 'gis:view_map'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, permission_id FROM permissions WHERE permission_code IN (
    'incidents:create', 'gis:view_map'
) ON CONFLICT DO NOTHING;

-- 4. SEED USERS MẪU
INSERT INTO users (user_id, email, phone_number, password_hash, full_name, role_id, status) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@ecoreport.gov.vn', '0901000001', '$2b$12$J8u6e1W2p.6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6', 'Quản trị viên Hệ thống (Bùi Nguyễn Minh Quân)', 1, 'ACTIVE'),
('22222222-2222-2222-2222-222222222222', 'officer@ecoreport.gov.vn', '0901000002', '$2b$12$J8u6e1W2p.6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6', 'Cán bộ Điều phối Phòng TN&MT (Huỳnh Anh Tú)', 2, 'ACTIVE'),
('33333333-3333-3333-3333-333333333333', 'collector@ecoreport.gov.vn', '0901000003', '$2b$12$J8u6e1W2p.6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6', 'Đội trưởng Đội Thu gom Số 1 (Lê Anh Tuấn)', 3, 'ACTIVE'),
('44444444-4444-4444-4444-444444444444', 'citizen@ecoreport.gov.vn', '0901000004', '$2b$12$J8u6e1W2p.6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6', 'Công dân Tiêu biểu (Nguyễn Thành Đạt)', 4, 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- 5. SEED PRIVACY SETTINGS
INSERT INTO user_privacy_settings (user_id, is_anonymous_by_default, hide_exact_gps, spatial_jitter_radius_meters) VALUES
('11111111-1111-1111-1111-111111111111', FALSE, FALSE, 0),
('22222222-2222-2222-2222-222222222222', FALSE, FALSE, 0),
('33333333-3333-3333-3333-333333333333', FALSE, FALSE, 0),
('44444444-4444-4444-4444-444444444444', TRUE, TRUE, 50)
ON CONFLICT (user_id) DO NOTHING;

-- 6. SEED ĐƠN VỊ HÀNH CHÍNH
INSERT INTO administrative_units (unit_id, unit_code, name, level, parent_id, boundary, centroid, area_km2, population) VALUES
(1, '79', 'Thành phố Hồ Chí Minh', 'PROVINCE', NULL, NULL, ST_SetSRID(ST_MakePoint(106.660172, 10.762622), 4326), 2095.0, 9300000),
(2, '769', 'Thành phố Thủ Đức', 'DISTRICT', 1, NULL, ST_SetSRID(ST_MakePoint(106.758414, 10.849409), 4326), 211.5, 1200000),
(3, '26788', 'Phường Linh Trung', 'WARD', 2, 
    ST_Multi(ST_GeomFromText('POLYGON((106.765 10.865, 106.785 10.865, 106.785 10.880, 106.765 10.880, 106.765 10.865))', 4326)),
    ST_SetSRID(ST_MakePoint(106.775, 10.872), 4326), 6.8, 62000),
(4, '26791', 'Phường Hiệp Bình Chánh', 'WARD', 2, 
    ST_Multi(ST_GeomFromText('POLYGON((106.715 10.825, 106.735 10.825, 106.735 10.845, 106.715 10.845, 106.715 10.825))', 4326)),
    ST_SetSRID(ST_MakePoint(106.725, 10.835), 4326), 6.2, 98000),
(5, '26794', 'Phường Thảo Điền', 'WARD', 2, 
    ST_Multi(ST_GeomFromText('POLYGON((106.720 10.795, 106.745 10.795, 106.745 10.815, 106.720 10.815, 106.720 10.795))', 4326)),
    ST_SetSRID(ST_MakePoint(106.732, 10.805), 4326), 3.7, 24000)
ON CONFLICT (unit_code) DO NOTHING;

-- 7. SEED DANH MỤC LOẠI RÁC THẢI & Ô NHIỄM
INSERT INTO waste_categories (category_id, category_code, name, description, default_severity, sla_hours, color_hex, icon_name) VALUES
(1, 'DOMESTIC_WASTE', 'Rác thải sinh hoạt ứ đọng', 'Bãi rác tự phát, túi ni lông, thực phẩm hư hỏng bốc mùi', 'MEDIUM', 24, '#EAB308', 'trash'),
(2, 'HAZARDOUS_WASTE', 'Chất thải nguy hại & Hóa chất', 'Pin cũ, ắc quy, bóng đèn huỳnh quang, dung môi hóa chất', 'CRITICAL', 12, '#EF4444', 'alert-triangle'),
(3, 'WATERWAY_POLLUTION', 'Ô nhiễm nguồn nước & Kênh rạch', 'Rác thải nổi lềnh bềnh trên kênh, nước đen đổi màu hoặc bốc mùi', 'HIGH', 36, '#3B82F6', 'droplets'),
(4, 'DRAINAGE_BLOCK', 'Điểm nghẽn cống gây ngập úng', 'Miệng cống thoát nước bị rác lấp kín, gây ngập cục bộ khi mưa lớn', 'HIGH', 18, '#06B6D4', 'cloud-rain'),
(5, 'CONSTRUCTION_DEBRIS', 'Xà bần & Phế thải xây dựng', 'Gạch vụn, bê tông, đất cát đổ trộm lấn chiếm lòng lề đường', 'LOW', 72, '#78716C', 'truck')
ON CONFLICT (category_code) DO NOTHING;

-- 8. SEED CHÍNH SÁCH THỜI HẠN SLA
INSERT INTO sla_policies (category_id, severity, response_time_hours, resolution_time_hours, warning_threshold_percentage, penalty_points_per_hour, name) VALUES
(1, 'MEDIUM', 4, 24, 80, 0.5, 'SLA Rác sinh hoạt - Trung bình'),
(2, 'CRITICAL', 1, 12, 75, 2.0, 'SLA Chất thải nguy hại - Khẩn cấp'),
(3, 'HIGH', 2, 36, 80, 1.0, 'SLA Ô nhiễm kênh rạch - Cao'),
(4, 'HIGH', 2, 18, 80, 1.5, 'SLA Điểm nghẽn cống ngập nước - Cao'),
(5, 'LOW', 8, 72, 85, 0.2, 'SLA Xà bần xây dựng - Thấp')
ON CONFLICT (category_id, severity) DO NOTHING;

-- 9. SEED ĐỘI THU GOM HIỆN TRƯỜNG
INSERT INTO work_teams (team_id, team_code, team_name, leader_id, unit_id, contact_phone, vehicle_plate, vehicle_type, capacity_tons, status) VALUES
(1, 'TEAM-TD-01', 'Đội Cơ động Thu gom Phía Đông', '33333333-3333-3333-3333-333333333333', 3, '028.3896.1111', '51C-888.99', 'COMPACTOR_TRUCK', 8.0, 'ACTIVE'),
(2, 'TEAM-TD-02', 'Đội Canô Vớt rác Kênh rạch Thủ Đức', NULL, 4, '028.3896.2222', 'SG-6688', 'CLEANING_BOAT', 3.5, 'ACTIVE'),
(3, 'TEAM-TD-03', 'Đội Ứng phó Nhanh Khẩn cấp', NULL, 5, '028.3896.3333', '51B-999.11', 'RAPID_RESPONSE_VAN', 2.0, 'ACTIVE')
ON CONFLICT (team_code) DO NOTHING;

-- 10. SEED CƠ SỞ THIẾT YẾU ĐÔ THỊ
INSERT INTO essential_facilities (facility_name, facility_type, address, unit_id, location, contact_phone, vulnerability_level) VALUES
('Bệnh viện Đa khoa Khu vực Thủ Đức', 'HOSPITAL', '64 Lê Văn Chí, Linh Trung, TP. Thủ Đức', 3, ST_SetSRID(ST_MakePoint(106.772500, 10.868200), 4326), '028.3722.3556', 'CRITICAL'),
('Trường Đại học Bách Khoa - ĐHQG HCM (CS2)', 'SCHOOL', 'Khu phố 6, Linh Trung, TP. Thủ Đức', 3, ST_SetSRID(ST_MakePoint(106.779800, 10.875200), 4326), '028.3865.1670', 'HIGH'),
('Trạm Y tế Phường Hiệp Bình Chánh', 'HEALTH_CENTER', 'Hiệp Bình, Hiệp Bình Chánh, TP. Thủ Đức', 4, ST_SetSRID(ST_MakePoint(106.723100, 10.832000), 4326), '028.3726.9011', 'HIGH')
ON CONFLICT DO NOTHING;

-- 11. SEED TRẠM THU GOM RÁC TÁI CHẾ
INSERT INTO recycling_facilities (name, facility_code, address, unit_id, location, accepted_waste_types, operating_hours, contact_phone) VALUES
('Điểm Thu gom Pin & Thiết bị Điện tử Linh Trung', 'REC-LT-01', 'UBND Phường Linh Trung, Đường số 7, TP. Thủ Đức', 3, ST_SetSRID(ST_MakePoint(106.771200, 10.869800), 4326), ARRAY['PIN_CU', 'THIET_BI_DIEN_TU'], '07:30 - 17:00 (T2-T6)', '028.3896.0123'),
('Trạm Tiếp nhận Vỏ Hộp Sữa & Nhựa Tái chế Hiệp Bình Chánh', 'REC-HBC-01', 'Chợ Hiệp Bình Chánh, Kha Vạn Cân, TP. Thủ Đức', 4, ST_SetSRID(ST_MakePoint(106.726500, 10.834100), 4326), ARRAY['VO_HOP_SUA', 'NHUA_TAI_CHE', 'THUY_TINH'], '08:00 - 16:30 (Cả tuần)', '028.3726.4455')
ON CONFLICT (facility_code) DO NOTHING;

-- 12. SEED SỰ CỐ MẪU
INSERT INTO incidents (
    incident_id, tracking_code, reporter_id, category_id, unit_id, 
    title, description, address_text, location, latitude, longitude, severity, status, risk_score
) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ECO-20260915-0001', '44444444-4444-4444-4444-444444444444', 1, 3, 
    'Bãi rác sinh hoạt tự phát ngập tràn vỉa hè đường Lê Văn Chí',
    'Túi rác sinh hoạt chất thành đống dài hơn 10 mét, nước rỉ rác bốc mùi nồng nặc tràn ra lòng đường gây cản trở giao thông.',
    'Số 120 Đường Lê Văn Chí, Phường Linh Trung, TP. Thủ Đức',
    ST_SetSRID(ST_MakePoint(106.774100, 10.869100), 4326), 10.869100, 106.774100, 'MEDIUM', 'IN_PROGRESS', 48.50),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ECO-20260915-0002', '44444444-4444-4444-4444-444444444444', 4, 4,
    'Miệng hố ga thoát nước bị rác thải bít kín gây ngập cục bộ',
    'Sau cơn mưa lớn chiều nay, toàn bộ đoạn ngã tư đường Kha Vạn Cân bị ngập sâu hơn 30cm do miệng cống nghẹt rác nilon và cành cây.',
    'Ngã tư Kha Vạn Cân - Đường số 25, Phường Hiệp Bình Chánh, TP. Thủ Đức',
    ST_SetSRID(ST_MakePoint(106.724800, 10.833500), 4326), 10.833500, 106.724800, 'HIGH', 'PENDING', 78.20)
ON CONFLICT (tracking_code) DO NOTHING;

-- 13. SEED DANH MỤC QUÀ TẶNG CÔNG DÂN XANH
INSERT INTO citizen_rewards (reward_code, title, description, points_required, reward_type, stock_quantity) VALUES
('REW-CANVAS-01', 'Túi vải Canvas EcoReport phong cách sống xanh', 'Túi vải dệt tự nhiên 100% bảo vệ môi trường, thay thế túi nilon', 150, 'GIFT_ITEM', 50),
('REW-BOTTLE-02', 'Bình giữ nhiệt Inox Eco 500ml', 'Bình giữ nhiệt cao cấp in logo tuyên truyền Môi trường Đô thị Xanh', 350, 'GIFT_ITEM', 30),
('REW-PLANT-03', 'Chậu cây xanh lọc không khí để bàn', 'Cây Lưỡi Hổ / Kim Tiền thanh lọc khí độc trong nhà', 200, 'GIFT_ITEM', 40)
ON CONFLICT (reward_code) DO NOTHING;

-- 14. SEED CẤU HÌNH HỆ THỐNG ĐỘNG
INSERT INTO system_configs (config_key, config_value, value_type, description, is_public) VALUES
('MAP_DEFAULT_CENTER_LAT', '10.849409', 'FLOAT', 'Vĩ độ trung tâm mặc định trên bản đồ WebGIS', TRUE),
('MAP_DEFAULT_CENTER_LNG', '106.758414', 'FLOAT', 'Kinh độ trung tâm mặc định trên bản đồ WebGIS', TRUE),
('MAP_DEFAULT_ZOOM', '14', 'INTEGER', 'Mức thu phóng mặc định ban đầu của WebGIS', TRUE),
('MAX_UPLOAD_SIZE_MB', '25', 'INTEGER', 'Dung lượng tệp đính kèm tối đa cho phép tải lên', TRUE),
('AI_CONFIDENCE_THRESHOLD', '0.75', 'FLOAT', 'Ngưỡng tin cậy tối thiểu của mô hình AI YOLOv8 để tự động duyệt', FALSE),
('SYSTEM_EMERGENCY_HOTLINE', '1800-1090', 'STRING', 'Đường dây nóng tiếp nhận sự cố ô nhiễm khẩn cấp', TRUE)
ON CONFLICT (config_key) DO NOTHING;

-- 15. SEED TRẠM QUAN TRẮC CẢM BIẾN IOT
INSERT INTO iot_sensor_stations (station_id, station_code, station_name, station_type, unit_id, location, address, installation_date, status) VALUES
(1, 'IOT-AIR-LT-01', 'Trạm Quan trắc Không khí AQI Linh Trung', 'AIR_QUALITY', 3, 
    ST_SetSRID(ST_MakePoint(106.773500, 10.871200), 4326), 'Khu Công nghệ Cao, Phường Linh Trung, TP. Thủ Đức', '2025-01-10', 'ONLINE'),
(2, 'IOT-FLOOD-HBC-02', 'Trạm Cảm biến Đo Ngập Siêu âm Hiệp Bình Chánh', 'FLOOD_ULTRASONIC', 4, 
    ST_SetSRID(ST_MakePoint(106.724500, 10.833000), 4326), 'Ngã tư Kha Vạn Cân - Đường 25, Hiệp Bình Chánh, TP. Thủ Đức', '2025-03-15', 'ONLINE')
ON CONFLICT (station_code) DO NOTHING;

-- 16. SEED KHUNG QUY ĐỊNH XỬ PHẠT VI PHẠM
INSERT INTO penalty_regulations (regulation_id, decree_reference, article_clause, violation_behavior, min_fine_vnd, max_fine_vnd, remedial_measures) VALUES
(1, 'Nghị định 45/2022/NĐ-CP', 'Điều 26 Khoản 1 Điểm a', 'Vứt, thải, bỏ đầu mẩu, tàn thuốc lá không đúng nơi quy định', 100000, 150000, 'Nhắc nhở và buộc thu dọn sạch sẽ'),
(2, 'Nghị định 45/2022/NĐ-CP', 'Điều 26 Khoản 1 Điểm c', 'Vứt, thải rác thải sinh hoạt bừa bãi tại vỉa hè, lòng đường, hệ thống thoát nước đô thị', 1000000, 2000000, 'Buộc khôi phục lại tình trạng môi trường ban đầu'),
(3, 'Nghị định 45/2022/NĐ-CP', 'Điều 26 Khoản 2', 'Đổ, vứt phế thải xây dựng, xà bần, bùn đất lấn chiếm lòng lề đường', 10000000, 20000000, 'Tịch thu phương tiện vi phạm và buộc vận chuyển đến nơi xử lý quy định')
ON CONFLICT DO NOTHING;

-- 17. SEED LỘ TRÌNH THU GOM RÁC CỐ ĐỊNH
INSERT INTO waste_collection_routes (route_id, route_code, route_name, unit_id, assigned_team_id, route_path, total_distance_km, estimated_duration_minutes, operating_days) VALUES
(1, 'ROUTE-LT-MORNING', 'Tuyến Thu gom Sáng - Trục Chính Linh Trung', 3, 1,
    ST_Multi(ST_GeomFromText('LINESTRING(106.768000 10.866000, 106.774000 10.869000, 106.782000 10.874000)', 4326)),
    4.5, 90, '2,4,6,CN')
ON CONFLICT (route_code) DO NOTHING;

-- 18. SEED ĐIỂM DỪNG GOM RÁC CHECKPOINTS
INSERT INTO route_checkpoints (route_id, checkpoint_name, sequence_order, location, address, expected_arrival_time, expected_waste_volume_m3) VALUES
(1, 'Điểm dừng 01 - Chợ Linh Trung', 1, ST_SetSRID(ST_MakePoint(106.768000, 10.866000), 4326), 'Chợ Linh Trung, Lê Văn Chí', '06:00:00', 3.0),
(1, 'Điểm dừng 02 - Ngã 3 Hoàng Diệu 2', 2, ST_SetSRID(ST_MakePoint(106.774000, 10.869000), 4326), 'Ngã 3 Hoàng Diệu 2, Linh Trung', '06:45:00', 2.0),
(1, 'Điểm dừng 03 - Cổng ĐH Khoa học Tự nhiên', 3, ST_SetSRID(ST_MakePoint(106.782000, 10.874000), 4326), 'Khu ĐHQG, Linh Trung', '07:30:00', 1.5)
ON CONFLICT (route_id, sequence_order) DO NOTHING;

-- 19. SEED TỪ ĐIỂN ĐA NGÔN NGỮ
INSERT INTO system_translations (locale, translation_key, translation_text, category) VALUES
('vi', 'app.title', 'EcoReport - Bản Đồ Môi Trường Đô Thị Thông Minh', 'UI'),
('en', 'app.title', 'EcoReport - Smart Urban Environmental WebGIS', 'UI'),
('vi', 'incident.report_button', 'Gửi Phản Ánh Ô Nhiễm Mới', 'UI'),
('en', 'incident.report_button', 'Submit Environmental Incident', 'UI'),
('vi', 'map.flood_warning', 'Cảnh báo ngập úng trên tuyến đường', 'NOTIFICATION'),
('en', 'map.flood_warning', 'Flood hazard warning on this route', 'NOTIFICATION')
ON CONFLICT (locale, translation_key) DO NOTHING;

-- 20. SEED TRI THỨC MÔI TRƯỜNG CHO AI RAG
INSERT INTO ai_knowledge_embeddings (document_title, document_type, chunk_index, chunk_content) VALUES
('Hướng Dẫn Phân Loại Rác Tại Nguồn TP.HCM', 'WASTE_SORTING_GUIDE', 1, 
    'Chất thải rắn sinh hoạt tại TP.HCM được phân chia làm 3 nhóm chính: 1. Rác hữu cơ dễ phân hủy (thức ăn thừa, lá cây); 2. Rác tái chế (giấy, vỏ chai nhựa, kim loại); 3. Rác còn lại (túi nilon bẩn, hộp xốp, tã giấy). Pin và thiết bị điện tử hỏng phải mang đến điểm thu gom nguy hại của Phường.'),
('Quy Trình Xử Lý Khẩn Cấp Điểm Ngập Cục Bộ', 'SOP_PROCEDURE', 1, 
    'Khi phát hiện điểm ngập sâu trên 20cm do rác chặn họng thu nước: Cán bộ trực ban thông báo Đội Công ích trong vòng 15 phút, triển khai xe hút và đội nạo vét cống ngay lập tức.')
ON CONFLICT DO NOTHING;
"""


async def seed():
    print("🌱 Đang nạp dữ liệu mẫu (Seed Data) vào PostgreSQL...")
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    await conn.execute(SEED_SQL)
    await conn.close()
    print("✅ Đã nạp thành công toàn bộ dữ liệu mẫu thực tế!")


if __name__ == "__main__":
    asyncio.run(seed())
