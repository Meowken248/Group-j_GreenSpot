-- ============================================================================
-- MASTER MIGRATION RUNNER: Khởi tạo toàn bộ Hệ thống CSDL EcoReport (54 BẢNG)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- Cách thực thi:
--   psql -U postgres -d ecoreport -f database/run_all_migrations.sql
-- Hoặc trong psql console:
--   \i database/run_all_migrations.sql
-- ============================================================================

\echo '======================================================================'
\echo '  BẮT ĐẦU KHỞI TẠO HỆ THỐNG CƠ SỞ DỮ LIỆU ECOREPORT (54 BẢNG NÂNG CAO)'
\echo '======================================================================'

\echo '[1/14] Kích hoạt Extensions (PostGIS, UUID, Trigram, Unaccent)...'
\i database/migrations/001_create_extensions.sql

\echo '[2/14] Tạo Phân hệ RBAC, Người dùng & Phiên đăng nhập (7 bảng)...'
\i database/migrations/002_create_rbac_and_users.sql

\echo '[3/14] Tạo Phân hệ Địa lý Hành chính & Cơ sở Hạ tầng Đô thị (3 bảng)...'
\i database/migrations/003_create_administrative_and_facilities.sql

\echo '[4/14] Tạo Phân hệ Tiếp nhận Sự cố & Đa phương tiện (6 bảng)...'
\i database/migrations/004_create_incidents_and_media.sql

\echo '[5/14] Tạo Phân hệ Điều phối Hiện trường & Nghiệm thu Trước-Sau (5 bảng)...'
\i database/migrations/005_create_dispatch_and_verification.sql

\echo '[6/14] Tạo Phân hệ Giám sát SLA, Kiểm toán An ninh & KPI (3 bảng)...'
\i database/migrations/006_create_monitoring_sla_audit.sql

\echo '[7/14] Tạo Phân hệ WebGIS Nâng cao, Geofencing & Điểm nóng (5 bảng)...'
\i database/migrations/007_create_spatial_webgis_advanced.sql

\echo '[8/14] Tạo Phân hệ Trí tuệ Nhân tạo AI & YOLOv8 Analytics (3 bảng)...'
\i database/migrations/008_create_ai_smart_analytics.sql

\echo '[9/14] Tạo Phân hệ Cộng đồng, Điểm thưởng Xanh & Chatbot (6 bảng)...'
\i database/migrations/009_create_community_and_chatbot.sql

\echo '[10/14] Tạo Phân hệ Thông báo, Báo cáo & Quản trị Hệ thống (4 bảng)...'
\i database/migrations/010_create_system_reports_notifications.sql

\echo '[11/14] Thiết lập Chỉ mục Không gian GIST, GIN, BTree & Triggers...'
\i database/migrations/011_create_triggers_and_indexes.sql

\echo '[12/14] Nạp Dữ liệu Mẫu Khởi tạo Chuẩn Thực tế (Seed Data 42 bảng)...'
\i database/migrations/012_seed_data.sql

\echo '[13/14] Tạo Phân hệ Nâng cao: IoT Cảm biến, Tuyến xe gom rác & Xử phạt (12 bảng)...'
\i database/migrations/013_create_advanced_iot_fleet_legal.sql

\echo '[14/14] Nạp Dữ liệu Mẫu Nâng cao (IoT Telemetry, Tuyến đường, QCVN)...'
\i database/migrations/014_seed_advanced_data.sql

\echo '======================================================================'
\echo '  HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU ECOREPORT (54 BẢNG) THÀNH CÔNG!'
\echo '======================================================================'
