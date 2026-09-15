-- ============================================================================
-- MASTER MIGRATION RUNNER: Khởi tạo toàn bộ Hệ thống CSDL EcoReport (42 Bảng)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- Cách thực thi:
--   psql -U postgres -d ecoreport -f database/run_all_migrations.sql
-- Hoặc trong psql console:
--   \i database/run_all_migrations.sql
-- ============================================================================

\echo '======================================================================'
\echo '  BẮT ĐẦU KHỞI TẠO HỆ THỐNG CƠ SỞ DỮ LIỆU ECOREPORT (42 BẢNG)'
\echo '======================================================================'

\echo '[1/12] Kích hoạt Extensions (PostGIS, UUID, Trigram, Unaccent)...'
\i database/migrations/001_create_extensions.sql

\echo '[2/12] Tạo Phân hệ RBAC, Người dùng & Phiên đăng nhập (7 bảng)...'
\i database/migrations/002_create_rbac_and_users.sql

\echo '[3/12] Tạo Phân hệ Địa lý Hành chính & Cơ sở Hạ tầng Đô thị (3 bảng)...'
\i database/migrations/003_create_administrative_and_facilities.sql

\echo '[4/12] Tạo Phân hệ Tiếp nhận Sự cố & Đa phương tiện (6 bảng)...'
\i database/migrations/004_create_incidents_and_media.sql

\echo '[5/12] Tạo Phân hệ Điều phối Hiện trường & Nghiệm thu Trước-Sau (5 bảng)...'
\i database/migrations/005_create_dispatch_and_verification.sql

\echo '[6/12] Tạo Phân hệ Giám sát SLA, Kiểm toán An ninh & KPI (3 bảng)...'
\i database/migrations/006_create_monitoring_sla_audit.sql

\echo '[7/12] Tạo Phân hệ WebGIS Nâng cao, Geofencing & Điểm nóng (5 bảng)...'
\i database/migrations/007_create_spatial_webgis_advanced.sql

\echo '[8/12] Tạo Phân hệ Trí tuệ Nhân tạo AI & YOLOv8 Analytics (3 bảng)...'
\i database/migrations/008_create_ai_smart_analytics.sql

\echo '[9/12] Tạo Phân hệ Cộng đồng, Điểm thưởng Xanh & Chatbot (6 bảng)...'
\i database/migrations/009_create_community_and_chatbot.sql

\echo '[10/12] Tạo Phân hệ Thông báo, Báo cáo & Quản trị Hệ thống (4 bảng)...'
\i database/migrations/010_create_system_reports_notifications.sql

\echo '[11/12] Thiết lập Chỉ mục Không gian GIST, GIN, BTree & Triggers...'
\i database/migrations/011_create_triggers_and_indexes.sql

\echo '[12/12] Nạp Dữ liệu Mẫu Khởi tạo Chuẩn Thực tế (Seed Data)...'
\i database/migrations/012_seed_data.sql

\echo '======================================================================'
\echo '  HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU ECOREPORT THÀNH CÔNG!'
\echo '======================================================================'
