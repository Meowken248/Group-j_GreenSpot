-- ============================================================================
-- Migration 014: Dữ liệu Mẫu Khởi tạo Nâng cao (Advanced Seed Data)
-- Địa bàn thực tế: TP. Thủ Đức, TP. Hồ Chí Minh
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 1. SEED TRẠM QUAN TRẮC CẢM BIẾN IOT (IoT Sensor Stations)
INSERT INTO iot_sensor_stations (station_id, station_code, station_name, station_type, unit_id, location, address, installation_date, status) VALUES
(1, 'IOT-AIR-LT-01', 'Trạm Quan trắc Không khí AQI Linh Trung', 'AIR_QUALITY', 3, 
    ST_SetSRID(ST_MakePoint(106.773500, 10.871200), 4326), 'Khu Công nghệ Cao, Phường Linh Trung, TP. Thủ Đức', '2025-01-10', 'ONLINE'),
(2, 'IOT-FLOOD-HBC-02', 'Trạm Cảm biến Đo Ngập Siêu âm Hiệp Bình Chánh', 'FLOOD_ULTRASONIC', 4, 
    ST_SetSRID(ST_MakePoint(106.724500, 10.833000), 4326), 'Ngã tư Kha Vạn Cân - Đường 25, Hiệp Bình Chánh, TP. Thủ Đức', '2025-03-15', 'ONLINE')
ON CONFLICT (station_code) DO NOTHING;

-- 2. SEED DỮ LIỆU ĐO ĐẠC TELEMETRY MẪU
INSERT INTO iot_sensor_telemetry (station_id, aqi_index, pm2_5, pm10, co2_ppm, temperature_c, humidity_percent, water_level_cm) VALUES
(1, 48, 12.50, 28.30, 415.00, 31.5, 68.0, 0.0),
(2, NULL, NULL, NULL, NULL, 30.2, 75.0, 32.50)
ON CONFLICT DO NOTHING;

-- 3. SEED KHUNG QUY ĐỊNH XỬ PHẠT VI PHẠM (Nghị định 45/2022/NĐ-CP)
INSERT INTO penalty_regulations (regulation_id, decree_reference, article_clause, violation_behavior, min_fine_vnd, max_fine_vnd, remedial_measures) VALUES
(1, 'Nghị định 45/2022/NĐ-CP', 'Điều 26 Khoản 1 Điểm a', 'Vứt, thải, bỏ đầu mẩu, tàn thuốc lá không đúng nơi quy định', 100000, 150000, 'Nhắc nhở và buộc thu dọn sạch sẽ'),
(2, 'Nghị định 45/2022/NĐ-CP', 'Điều 26 Khoản 1 Điểm c', 'Vứt, thải rác thải sinh hoạt bừa bãi tại vỉa hè, lòng đường, hệ thống thoát nước đô thị', 1000000, 2000000, 'Buộc khôi phục lại tình trạng môi trường ban đầu'),
(3, 'Nghị định 45/2022/NĐ-CP', 'Điều 26 Khoản 2', 'Đổ, vứt phế thải xây dựng, xà bần, bùn đất lấn chiếm lòng lề đường', 10000000, 20000000, 'Tịch thu phương tiện vi phạm và buộc vận chuyển đến nơi xử lý quy định')
ON CONFLICT DO NOTHING;

-- 4. SEED LỘ TRÌNH THU GOM RÁC CỐ ĐỊNH (Waste Collection Routes)
INSERT INTO waste_collection_routes (route_id, route_code, route_name, unit_id, assigned_team_id, route_path, total_distance_km, estimated_duration_minutes, operating_days) VALUES
(1, 'ROUTE-LT-MORNING', 'Tuyến Thu gom Sáng - Trục Chính Linh Trung', 3, 1,
    ST_Multi(ST_GeomFromText('LINESTRING(106.768000 10.866000, 106.774000 10.869000, 106.782000 10.874000)', 4326)),
    4.5, 90, '2,4,6,CN')
ON CONFLICT (route_code) DO NOTHING;

-- 5. SEED ĐIỂM DỪNG GOM RÁC CHECKPOINTS
INSERT INTO route_checkpoints (route_id, checkpoint_name, sequence_order, location, address, expected_arrival_time, expected_waste_volume_m3) VALUES
(1, 'Điểm dừng 01 - Chợ Linh Trung', 1, ST_SetSRID(ST_MakePoint(106.768000, 10.866000), 4326), 'Chợ Linh Trung, Lê Văn Chí', '06:00:00', 3.0),
(1, 'Điểm dừng 02 - Ngã 3 Hoàng Diệu 2', 2, ST_SetSRID(ST_MakePoint(106.774000, 10.869000), 4326), 'Ngã 3 Hoàng Diệu 2, Linh Trung', '06:45:00', 2.0),
(1, 'Điểm dừng 03 - Cổng ĐH Khoa học Tự nhiên', 3, ST_SetSRID(ST_MakePoint(106.782000, 10.874000), 4326), 'Khu ĐHQG, Linh Trung', '07:30:00', 1.5)
ON CONFLICT (route_id, sequence_order) DO NOTHING;

-- 6. SEED TỪ ĐIỂN ĐA NGÔN NGỮ (System Translations)
INSERT INTO system_translations (locale, translation_key, translation_text, category) VALUES
('vi', 'app.title', 'EcoReport - Bản Đồ Môi Trường Đô Thị Thông Minh', 'UI'),
('en', 'app.title', 'EcoReport - Smart Urban Environmental WebGIS', 'UI'),
('vi', 'incident.report_button', 'Gửi Phản Ánh Ô Nhiễm Mới', 'UI'),
('en', 'incident.report_button', 'Submit Environmental Incident', 'UI'),
('vi', 'map.flood_warning', 'Cảnh báo ngập úng trên tuyến đường', 'NOTIFICATION'),
('en', 'map.flood_warning', 'Flood hazard warning on this route', 'NOTIFICATION')
ON CONFLICT (locale, translation_key) DO NOTHING;

-- 7. SEED TRI THỨC MÔI TRƯỜNG CHO AI RAG (AI Knowledge Embeddings)
INSERT INTO ai_knowledge_embeddings (document_title, document_type, chunk_index, chunk_content) VALUES
('Hướng Dẫn Phân Loại Rác Tại Nguồn TP.HCM', 'WASTE_SORTING_GUIDE', 1, 
    'Chất thải rắn sinh hoạt tại TP.HCM được phân chia làm 3 nhóm chính: 1. Rác hữu cơ dễ phân hủy (thức ăn thừa, lá cây); 2. Rác tái chế (giấy, vỏ chai nhựa, kim loại); 3. Rác còn lại (túi nilon bẩn, hộp xốp, tã giấy). Pin và thiết bị điện tử hỏng phải mang đến điểm thu gom nguy hại của Phường.'),
('Quy Trình Xử Lý Khẩn Cấp Điểm Ngập Cục Bộ', 'SOP_PROCEDURE', 1, 
    'Khi phát hiện điểm ngập sâu trên 20cm do rác chặn họng thu nước: Cán bộ trực ban thông báo Đội Công ích trong vòng 15 phút, triển khai xe hút và đội nạo vét cống ngay lập tức.')
ON CONFLICT DO NOTHING;
