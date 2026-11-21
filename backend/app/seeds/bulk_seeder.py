"""EcoReport High-Performance Bulk Seeder (>= 100,000 records per table)
Sử dụng công nghệ sinh dữ liệu trực tiếp trong PostgreSQL Engine (generate_series + PostGIS + Array Indexing)
Tốc độ: ~100.000 records chỉ mất 1 - 2 giây mỗi table.
Bảo đảm 100% tính toàn vẹn khóa ngoại (Foreign Keys) và tọa độ GPS thực tế TP.HCM / TP. Thủ Đức.
"""

import argparse
import asyncio
import time
import asyncpg
from app.core.config import settings


async def run_bulk_seed(target_count: int = 100000):
    print("=" * 70)
    print(f"🚀 KHỞI ĐỘNG BULK SEEDER: MỤC TIÊU >= {target_count:,} RECORDS / TABLE")
    print("=" * 70)

    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    total_start = time.time()

    async def seed_table(name: str, sql: str):
        t0 = time.time()
        print(f"⏳ Đang sinh dữ liệu cho bảng [{name}]...", end="", flush=True)
        await conn.execute(sql)
        elapsed = time.time() - t0
        count = await conn.fetchval(f"SELECT count(*) FROM {name};")
        print(f" Xong! Hiện có: {count:,} records ({elapsed:.2f}s)")

    try:
        # Bước 0: Đảm bảo bảng danh mục cơ sở có sẵn
        print("\n[BƯỚC 0] Kiểm tra và nạp danh mục cơ sở...")
        await conn.execute("""
            INSERT INTO roles (role_id, role_code, role_name, description, is_system) VALUES
            (1, 'ADMIN', 'Quản trị viên', 'Toàn quyền', TRUE),
            (2, 'OFFICER', 'Cán bộ', 'Tiếp nhận', TRUE),
            (3, 'COLLECTOR', 'Đội thu gom', 'Xử lý', TRUE),
            (4, 'CITIZEN', 'Công dân', 'Báo cáo', TRUE)
            ON CONFLICT DO NOTHING;

            INSERT INTO waste_categories (category_id, category_code, name, default_severity, sla_hours, color_hex, icon_name) VALUES
            (1, 'DOMESTIC_WASTE', 'Rác sinh hoạt', 'MEDIUM', 24, '#EAB308', 'trash'),
            (2, 'HAZARDOUS_WASTE', 'Chất thải nguy hại', 'CRITICAL', 12, '#EF4444', 'alert-triangle'),
            (3, 'WATERWAY_POLLUTION', 'Ô nhiễm kênh rạch', 'HIGH', 36, '#3B82F6', 'droplets'),
            (4, 'DRAINAGE_BLOCK', 'Điểm nghẽn cống', 'HIGH', 18, '#06B6D4', 'cloud-rain'),
            (5, 'CONSTRUCTION_DEBRIS', 'Xà bần xây dựng', 'LOW', 72, '#78716C', 'truck')
            ON CONFLICT DO NOTHING;

            INSERT INTO administrative_units (unit_id, unit_code, name, level) VALUES
            (1, '79', 'TP. Hồ Chí Minh', 'PROVINCE'),
            (2, '769', 'TP. Thủ Đức', 'DISTRICT'),
            (3, '26788', 'Phường Linh Trung', 'WARD'),
            (4, '26791', 'Phường Hiệp Bình Chánh', 'WARD'),
            (5, '26794', 'Phường Thảo Điền', 'WARD')
            ON CONFLICT DO NOTHING;

            INSERT INTO work_teams (team_id, team_code, team_name, unit_id, vehicle_type, capacity_tons, status, is_active) VALUES
            (1, 'TEAM-TD-01', 'Đội Cơ động 1', 3, 'TRUCK_COMPACTOR', 5.0, 'ACTIVE', TRUE),
            (2, 'TEAM-TD-02', 'Đội Canô Kênh rạch', 4, 'BOAT_WATERWAY', 2.5, 'ACTIVE', TRUE),
            (3, 'TEAM-TD-03', 'Đội Ứng phó Nhanh', 5, 'PICKUP_VAN', 1.5, 'ACTIVE', TRUE)
            ON CONFLICT DO NOTHING;

            INSERT INTO iot_sensor_stations (station_id, station_code, station_name, station_type, unit_id, location, address, firmware_version, battery_powered, solar_powered, status) VALUES
            (1, 'IOT-01', 'Trạm Linh Trung', 'AIR_QUALITY', 3, ST_SetSRID(ST_MakePoint(106.7735, 10.8712), 4326), 'Linh Trung', 'v2.1.0', TRUE, TRUE, 'ONLINE'),
            (2, 'IOT-02', 'Trạm Hiệp Bình Chánh', 'FLOOD_ULTRASONIC', 4, ST_SetSRID(ST_MakePoint(106.7245, 10.8330), 4326), 'HBC', 'v2.1.0', TRUE, TRUE, 'ONLINE')
            ON CONFLICT DO NOTHING;

            INSERT INTO penalty_regulations (regulation_id, decree_reference, article_clause, violation_behavior, min_fine_vnd, max_fine_vnd, is_active) VALUES
            (1, 'NĐ 45/2022', 'Điều 26.1a', 'Vứt tàn thuốc lá', 100000, 150000, TRUE),
            (2, 'NĐ 45/2022', 'Điều 26.1c', 'Vứt rác bừa bãi vỉa hè', 1000000, 2000000, TRUE),
            (3, 'NĐ 45/2022', 'Điều 26.2', 'Đổ xà bần lấn chiếm đường', 10000000, 20000000, TRUE)
            ON CONFLICT DO NOTHING;
        """)

        print("\n[BƯỚC 1] Bắt đầu Bulk Seed dữ liệu lớn (>= 100.000 records mỗi table)...")

        # 1. USERS (>= target_count records)
        current_users = await conn.fetchval("SELECT count(*) FROM users;")
        if current_users < target_count:
            needed = target_count - current_users
            sql_users = f"""
                INSERT INTO users (user_id, email, phone_number, password_hash, full_name, role_id, status, created_at)
                SELECT 
                    gen_random_uuid(),
                    'citizen_' || (i + {current_users}) || '@ecoreport.vn',
                    '09' || lpad((i + {current_users} + 10000000)::text, 8, '0'),
                    '$2b$12$e86g5k4V.8u6e1W2p6e1.8u6e1W2p6e1.8u6e1W2p6e1.8u6',
                    'Công dân ' || (CASE (i % 5) 
                        WHEN 0 THEN 'Nguyễn Văn ' 
                        WHEN 1 THEN 'Trần Thị ' 
                        WHEN 2 THEN 'Lê Hoàng ' 
                        WHEN 3 THEN 'Phạm Minh ' 
                        ELSE 'Võ Quốc ' END) || (i + {current_users}),
                    4,
                    'ACTIVE',
                    NOW() - (random() * interval '365 days')
                FROM generate_series(1, {needed}) AS i
                ON CONFLICT DO NOTHING;
            """
            await seed_table("users", sql_users)
        else:
            print(f"✅ Bảng [users] đã có {current_users:,} records.")

        # 2. USER_PRIVACY_SETTINGS (>= target_count records)
        sql_privacy = """
            INSERT INTO user_privacy_settings (user_id, is_anonymous_by_default, hide_exact_gps, spatial_jitter_radius_meters)
            SELECT 
                u.user_id,
                (random() > 0.5),
                (random() > 0.5),
                (floor(random() * 50)::int)
            FROM users u
            LEFT JOIN user_privacy_settings ups ON u.user_id = ups.user_id
            WHERE ups.user_id IS NULL;
        """
        await seed_table("user_privacy_settings", sql_privacy)

        # 3. USER_SESSIONS (>= target_count records)
        current_sessions = await conn.fetchval("SELECT count(*) FROM user_sessions;")
        if current_sessions < target_count:
            needed = target_count - current_sessions
            sql_sessions = f"""
                WITH samples AS (
                    SELECT array_agg(user_id) AS uids FROM (SELECT user_id FROM users LIMIT 10000) s
                )
                INSERT INTO user_sessions (session_id, user_id, jwt_id, device_name, client_type, ip_address, expires_at, created_at)
                SELECT 
                    gen_random_uuid(),
                    s.uids[(i % array_length(s.uids, 1)) + 1],
                    'jwt_token_' || to_char(NOW(), 'YYYYMMDD') || '_' || lpad((i + {current_sessions})::text, 9, '0'),
                    (CASE (i % 4) WHEN 0 THEN 'iPhone 15 Pro' WHEN 1 THEN 'Samsung Galaxy S24' WHEN 2 THEN 'Chrome MacOS' ELSE 'Firefox Windows' END),
                    (CASE (i % 3) WHEN 0 THEN 'MOBILE_IOS' WHEN 1 THEN 'MOBILE_ANDROID' ELSE 'WEB' END),
                    '14.161.' || (floor(random() * 254 + 1)::int) || '.' || (floor(random() * 254 + 1)::int),
                    NOW() + interval '30 days',
                    NOW() - (random() * interval '90 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("user_sessions", sql_sessions)
        else:
            print(f"✅ Bảng [user_sessions] đã có {current_sessions:,} records.")

        # 4. INCIDENTS (>= target_count records với PostGIS Geometry POINT chuẩn TP.HCM)
        current_incidents = await conn.fetchval("SELECT count(*) FROM incidents;")
        if current_incidents < target_count:
            needed = target_count - current_incidents
            sql_incidents = f"""
                WITH samples AS (
                    SELECT array_agg(user_id) AS uids FROM (SELECT user_id FROM users LIMIT 10000) s
                )
                INSERT INTO incidents (
                    incident_id, tracking_code, reporter_id, category_id, unit_id,
                    title, description, address_text, location, latitude, longitude,
                    severity, status, risk_score, estimated_volume_m3, is_anonymous,
                    upvotes_count, created_at
                )
                SELECT 
                    gen_random_uuid(),
                    'ECO-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad((i + {current_incidents})::text, 7, '0'),
                    s.uids[(i % array_length(s.uids, 1)) + 1],
                    ((i % 5) + 1),
                    ((i % 5) + 1),
                    (CASE (i % 4)
                        WHEN 0 THEN 'Điểm ứ đọng rác thải sinh hoạt số '
                        WHEN 1 THEN 'Miệng cống nghẹt rác gây ngập úng số '
                        WHEN 2 THEN 'Chất thải xà bần đổ trộm trên đường số '
                        ELSE 'Rác thải nổi lềnh bềnh trên đoạn kênh số ' END) || i,
                    'Báo cáo tự động từ người dân phản ánh tình trạng ô nhiễm môi trường tại khu vực số ' || i,
                    'Đường số ' || ((i % 100) + 1) || ', Khu phố ' || ((i % 10) + 1) || ', TP. Thủ Đức, TP.HCM',
                    ST_SetSRID(ST_MakePoint(
                        106.650000 + (random() * 0.170000),
                        10.720000 + (random() * 0.160000)
                    ), 4326),
                    (10.720000 + (random() * 0.160000))::numeric(10, 7),
                    (106.650000 + (random() * 0.170000))::numeric(10, 7),
                    (CASE (i % 4) WHEN 0 THEN 'LOW' WHEN 1 THEN 'MEDIUM' WHEN 2 THEN 'HIGH' ELSE 'CRITICAL' END),
                    (CASE (i % 5) WHEN 0 THEN 'PENDING' WHEN 1 THEN 'VERIFIED' WHEN 2 THEN 'ASSIGNED' WHEN 3 THEN 'IN_PROGRESS' ELSE 'RESOLVED' END),
                    (round((random() * 100)::numeric, 2)),
                    (round((random() * 10)::numeric, 2)),
                    (random() > 0.7),
                    (floor(random() * 50)::int),
                    NOW() - (random() * interval '180 days')
                FROM generate_series(1, {needed}) AS i, samples s
                ON CONFLICT (tracking_code) DO NOTHING;
            """
            await seed_table("incidents", sql_incidents)
        else:
            print(f"✅ Bảng [incidents] đã có {current_incidents:,} records.")

        # 5. INCIDENT_MEDIA (>= target_count records)
        current_media = await conn.fetchval("SELECT count(*) FROM incident_media;")
        if current_media < target_count:
            needed = target_count - current_media
            sql_media = f"""
                WITH samples AS (
                    SELECT array_agg(incident_id) AS inc_ids FROM (SELECT incident_id FROM incidents LIMIT 10000) s
                )
                INSERT INTO incident_media (media_id, incident_id, media_type, phase, file_url, created_at)
                SELECT 
                    gen_random_uuid(),
                    s.inc_ids[(i % array_length(s.inc_ids, 1)) + 1],
                    (CASE (i % 5) WHEN 0 THEN 'VIDEO' ELSE 'IMAGE' END),
                    (CASE (i % 2) WHEN 0 THEN 'BEFORE' ELSE 'AFTER' END),
                    'https://storage.ecoreport.vn/incidents/img_' || i || '.jpg',
                    NOW() - (random() * interval '180 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("incident_media", sql_media)
        else:
            print(f"✅ Bảng [incident_media] đã có {current_media:,} records.")

        # 6. INCIDENT_STATUS_HISTORY (>= target_count records)
        current_history = await conn.fetchval("SELECT count(*) FROM incident_status_history;")
        if current_history < target_count:
            needed = target_count - current_history
            sql_history = f"""
                WITH samples AS (
                    SELECT array_agg(incident_id) AS inc_ids FROM (SELECT incident_id FROM incidents LIMIT 10000) s
                )
                INSERT INTO incident_status_history (history_id, incident_id, from_status, to_status, notes, created_at)
                SELECT 
                    gen_random_uuid(),
                    s.inc_ids[(i % array_length(s.inc_ids, 1)) + 1],
                    'PENDING',
                    'IN_PROGRESS',
                    'Cán bộ môi trường đã tiếp nhận và chuyển tiếp xử lý cho sự cố #' || i,
                    NOW() - (random() * interval '90 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("incident_status_history", sql_history)
        else:
            print(f"✅ Bảng [incident_status_history] đã có {current_history:,} records.")

        # 7. INCIDENT_COMMENTS (>= target_count records)
        current_comments = await conn.fetchval("SELECT count(*) FROM incident_comments;")
        if current_comments < target_count:
            needed = target_count - current_comments
            sql_comments = f"""
                WITH samples AS (
                    SELECT 
                        (SELECT array_agg(incident_id) FROM (SELECT incident_id FROM incidents LIMIT 10000) sub1) AS inc_ids,
                        (SELECT array_agg(user_id) FROM (SELECT user_id FROM users LIMIT 10000) sub2) AS usr_ids
                )
                INSERT INTO incident_comments (comment_id, incident_id, author_id, content, is_internal, created_at)
                SELECT 
                    gen_random_uuid(),
                    s.inc_ids[(i % array_length(s.inc_ids, 1)) + 1],
                    s.usr_ids[(i % array_length(s.usr_ids, 1)) + 1],
                    'Người dân phản ánh: Đề nghị đội công ích khẩn trương đến xử lý dứt điểm điểm ô nhiễm này! (Ý kiến #' || i || ')',
                    (i % 10 = 0),
                    NOW() - (random() * interval '60 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("incident_comments", sql_comments)
        else:
            print(f"✅ Bảng [incident_comments] đã có {current_comments:,} records.")

        # 8. ASSIGNMENTS (>= target_count records)
        current_assignments = await conn.fetchval("SELECT count(*) FROM assignments;")
        if current_assignments < target_count:
            needed = target_count - current_assignments
            sql_assignments = f"""
                WITH samples AS (
                    SELECT 
                        (SELECT array_agg(incident_id) FROM (SELECT incident_id FROM incidents LIMIT 10000) sub1) AS inc_ids,
                        (SELECT array_agg(user_id) FROM (SELECT user_id FROM users LIMIT 1000) sub2) AS usr_ids
                )
                INSERT INTO assignments (
                    assignment_id, assignment_code, incident_id, team_id,
                    assigned_by, priority, status, dispatch_notes, created_at
                )
                SELECT 
                    gen_random_uuid(),
                    'ASN-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad((i + {current_assignments})::text, 7, '0'),
                    s.inc_ids[(i % array_length(s.inc_ids, 1)) + 1],
                    ((i % 3) + 1),
                    s.usr_ids[(i % array_length(s.usr_ids, 1)) + 1],
                    (CASE (i % 4) WHEN 0 THEN 'LOW' WHEN 1 THEN 'MEDIUM' WHEN 2 THEN 'HIGH' ELSE 'EMERGENCY' END),
                    (CASE (i % 4) WHEN 0 THEN 'ASSIGNED' WHEN 1 THEN 'ACCEPTED' WHEN 2 THEN 'IN_PROGRESS' ELSE 'COMPLETED' END),
                    'Điều động đội xe chuyên dụng đến giải phóng điểm đen rác thải #' || i,
                    NOW() - (random() * interval '60 days')
                FROM generate_series(1, {needed}) AS i, samples s
                ON CONFLICT (assignment_code) DO NOTHING;
            """
            await seed_table("assignments", sql_assignments)
        else:
            print(f"✅ Bảng [assignments] đã có {current_assignments:,} records.")

        # 9. AI_ANALYSIS_RESULTS (>= target_count records)
        current_ai = await conn.fetchval("SELECT count(*) FROM ai_analysis_results;")
        if current_ai < target_count:
            needed = target_count - current_ai
            sql_ai = f"""
                WITH samples AS (
                    SELECT 
                        (SELECT array_agg(incident_id) FROM (SELECT incident_id FROM incidents LIMIT 10000) sub1) AS inc_ids,
                        (SELECT array_agg(media_id) FROM (SELECT media_id FROM incident_media LIMIT 10000) sub2) AS med_ids
                )
                INSERT INTO ai_analysis_results (
                    analysis_id, media_id, incident_id, model_version,
                    detected_classes, confidence_score, bounding_boxes,
                    suggested_severity, suggested_category_id, created_at
                )
                SELECT 
                    gen_random_uuid(),
                    s.med_ids[(i % array_length(s.med_ids, 1)) + 1],
                    s.inc_ids[(i % array_length(s.inc_ids, 1)) + 1],
                    'yolov8x-environment-v2.1',
                    ARRAY['trash_pile', 'plastic_bottle', 'construction_waste'],
                    (0.8500 + (random() * 0.1400))::numeric(5, 4),
                    '[{{\"class\": \"trash\", \"confidence\": 0.94, \"box\": [120, 80, 450, 380]}}]'::jsonb,
                    (CASE (i % 4) WHEN 0 THEN 'LOW' WHEN 1 THEN 'MEDIUM' WHEN 2 THEN 'HIGH' ELSE 'CRITICAL' END),
                    ((i % 5) + 1),
                    NOW() - (random() * interval '60 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("ai_analysis_results", sql_ai)
        else:
            print(f"✅ Bảng [ai_analysis_results] đã có {current_ai:,} records.")

        # 10. IOT_SENSOR_TELEMETRY (>= target_count records)
        current_telemetry = await conn.fetchval("SELECT count(*) FROM iot_sensor_telemetry;")
        if current_telemetry < target_count:
            needed = target_count - current_telemetry
            sql_telemetry = f"""
                INSERT INTO iot_sensor_telemetry (
                    station_id, aqi_index, pm2_5, pm10, co2_ppm, temperature_c, humidity_percent, water_level_cm, recorded_at
                )
                SELECT 
                    ((i % 2) + 1),
                    (floor(20 + random() * 150)::int),
                    (round((5.0 + random() * 65.0)::numeric, 2)),
                    (round((10.0 + random() * 120.0)::numeric, 2)),
                    (round((350.0 + random() * 400.0)::numeric, 2)),
                    (round((26.0 + random() * 10.0)::numeric, 1)),
                    (round((50.0 + random() * 45.0)::numeric, 1)),
                    (round((random() * 80.0)::numeric, 2)),
                    NOW() - (i * interval '2 minutes')
                FROM generate_series(1, {needed}) AS i;
            """
            await seed_table("iot_sensor_telemetry", sql_telemetry)
        else:
            print(f"✅ Bảng [iot_sensor_telemetry] đã có {current_telemetry:,} records.")

        # 11. AUDIT_LOGS (>= target_count records)
        current_audit = await conn.fetchval("SELECT count(*) FROM audit_logs;")
        if current_audit < target_count:
            needed = target_count - current_audit
            sql_audit = f"""
                WITH samples AS (
                    SELECT array_agg(user_id) AS uids FROM (SELECT user_id FROM users LIMIT 10000) s
                )
                INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, created_at)
                SELECT 
                    s.uids[(i % array_length(s.uids, 1)) + 1],
                    (CASE (i % 4) WHEN 0 THEN 'LOGIN' WHEN 1 THEN 'CREATE_INCIDENT' WHEN 2 THEN 'VERIFY_INCIDENT' ELSE 'DISPATCH_TEAM' END),
                    'incidents',
                    gen_random_uuid()::text,
                    '14.161.' || (floor(random() * 254 + 1)::int) || '.' || (floor(random() * 254 + 1)::int),
                    NOW() - (random() * interval '90 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("audit_logs", sql_audit)
        else:
            print(f"✅ Bảng [audit_logs] đã có {current_audit:,} records.")

        # 12. NOTIFICATIONS (>= target_count records)
        current_notif = await conn.fetchval("SELECT count(*) FROM notifications;")
        if current_notif < target_count:
            needed = target_count - current_notif
            sql_notif = f"""
                WITH samples AS (
                    SELECT array_agg(user_id) AS uids FROM (SELECT user_id FROM users LIMIT 10000) s
                )
                INSERT INTO notifications (notification_id, user_id, title, message, notification_type, is_read, created_at)
                SELECT 
                    gen_random_uuid(),
                    s.uids[(i % array_length(s.uids, 1)) + 1],
                    'Cập nhật tiến độ xử lý báo cáo #' || i,
                    'Báo cáo sự cố môi trường của bạn đã được đội thu gom tiếp nhận và đang tiến hành dọn dẹp.',
                    'STATUS_UPDATE',
                    (random() > 0.4),
                    NOW() - (random() * interval '60 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("notifications", sql_notif)
        else:
            print(f"✅ Bảng [notifications] đã có {current_notif:,} records.")

        # 13. WORKER_LOCATIONS (>= target_count records GPS Pings)
        current_worker_loc = await conn.fetchval("SELECT count(*) FROM worker_locations;")
        if current_worker_loc < target_count:
            needed = target_count - current_worker_loc
            sql_worker_loc = f"""
                WITH samples AS (
                    SELECT array_agg(user_id) AS uids FROM (SELECT user_id FROM users LIMIT 1000) s
                )
                INSERT INTO worker_locations (team_id, user_id, current_location, latitude, longitude, speed_kmh, battery_percentage, recorded_at)
                SELECT 
                    ((i % 3) + 1),
                    s.uids[(i % array_length(s.uids, 1)) + 1],
                    ST_SetSRID(ST_MakePoint(
                        106.660000 + (random() * 0.150000),
                        10.730000 + (random() * 0.140000)
                    ), 4326),
                    (10.730000 + (random() * 0.140000))::numeric(10, 7),
                    (106.660000 + (random() * 0.150000))::numeric(10, 7),
                    (round((random() * 45.0)::numeric, 1)),
                    (floor(20 + random() * 80)::int),
                    NOW() - (i * interval '10 seconds')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("worker_locations", sql_worker_loc)
        else:
            print(f"✅ Bảng [worker_locations] đã có {current_worker_loc:,} records.")

        # 14. VIOLATION_RECORDS (>= target_count records)
        current_violations = await conn.fetchval("SELECT count(*) FROM violation_records;")
        if current_violations < target_count:
            needed = target_count - current_violations
            sql_violations = f"""
                WITH samples AS (
                    SELECT array_agg(user_id) AS uids FROM (SELECT user_id FROM users LIMIT 1000) s
                )
                INSERT INTO violation_records (
                    record_code, regulation_id, recorded_by, offender_name,
                    location, address, fine_amount_vnd, status, created_at
                )
                SELECT 
                    'VIO-2026-' || lpad((i + {current_violations})::text, 7, '0'),
                    ((i % 3) + 1),
                    s.uids[(i % array_length(s.uids, 1)) + 1],
                    'Đối tượng vi phạm #' || i,
                    ST_SetSRID(ST_MakePoint(
                        106.680000 + (random() * 0.120000),
                        10.750000 + (random() * 0.110000)
                    ), 4326),
                    'Số ' || ((i % 200) + 1) || ' Đường Phạm Văn Đồng, TP. Thủ Đức, TP.HCM',
                    (CASE ((i % 3) + 1) WHEN 1 THEN 150000 WHEN 2 THEN 1500000 ELSE 15000000 END),
                    (CASE (i % 3) WHEN 0 THEN 'ISSUED' WHEN 1 THEN 'PENDING_PAYMENT' ELSE 'PAID' END),
                    NOW() - (random() * interval '120 days')
                FROM generate_series(1, {needed}) AS i, samples s
                ON CONFLICT (record_code) DO NOTHING;
            """
            await seed_table("violation_records", sql_violations)
        else:
            print(f"✅ Bảng [violation_records] đã có {current_violations:,} records.")

        # 15. REWARD_TRANSACTIONS (>= target_count records)
        current_rewards = await conn.fetchval("SELECT count(*) FROM reward_transactions;")
        if current_rewards < target_count:
            needed = target_count - current_rewards
            sql_rewards = f"""
                WITH samples AS (
                    SELECT 
                        (SELECT array_agg(user_id) FROM (SELECT user_id FROM users LIMIT 10000) sub1) AS usr_ids,
                        (SELECT array_agg(incident_id) FROM (SELECT incident_id FROM incidents LIMIT 10000) sub2) AS inc_ids
                )
                INSERT INTO reward_transactions (
                    transaction_id, user_id, incident_id, transaction_type,
                    points_amount, balance_after, description, created_at
                )
                SELECT 
                    gen_random_uuid(),
                    s.usr_ids[(i % array_length(s.usr_ids, 1)) + 1],
                    s.inc_ids[(i % array_length(s.inc_ids, 1)) + 1],
                    (CASE (i % 4) WHEN 0 THEN 'EARN_REPORT' WHEN 1 THEN 'EARN_CAMPAIGN' WHEN 2 THEN 'REDEEM_GIFT' ELSE 'BONUS' END),
                    ((i % 50) + 10),
                    (500 + ((i % 100) * 10)),
                    'Cộng điểm thưởng đóng góp phân loại & báo cáo rác môi trường #' || i,
                    NOW() - (random() * interval '120 days')
                FROM generate_series(1, {needed}) AS i, samples s;
            """
            await seed_table("reward_transactions", sql_rewards)
        else:
            print(f"✅ Bảng [reward_transactions] đã có {current_rewards:,} records.")

    finally:
        await conn.close()

    total_elapsed = time.time() - total_start
    print("\n" + "=" * 70)
    print(f"🎉 HOÀN TẤT BULK SEED TOÀN BỘ HỆ THỐNG! Tổng thời gian: {total_elapsed:.2f}s")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EcoReport Big Data Bulk Seeder")
    parser.add_argument("--count", type=int, default=100000, help="Số records tối thiểu cho mỗi bảng (mặc định 100000)")
    args = parser.parse_args()
    asyncio.run(run_bulk_seed(args.count))
