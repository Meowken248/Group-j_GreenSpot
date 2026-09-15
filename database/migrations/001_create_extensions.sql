-- ============================================================================
-- Migration 001: Kích hoạt các Extensions CSDL cốt lõi cho WebGIS EcoReport
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 1. PostGIS: Không gian địa lý cốt lõi (Geometry, Geography, Spatial Operators)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. PostGIS Raster: Hỗ trợ phân tích dữ liệu lưới bề mặt (nếu dùng phân tích cao trình/ngập)
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- 3. uuid-ossp: Sinh định danh duy nhất toàn cầu UUIDv4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. pg_trgm: Tìm kiếm văn bản mờ (Fuzzy search) và gợi ý địa chỉ/tên đường
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 5. unaccent: Xử lý tìm kiếm tiếng Việt không dấu cho địa danh, loại sự cố
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 6. btree_gist: Hỗ trợ chỉ mục GiST đa cột kết hợp không gian và thời gian
CREATE EXTENSION IF NOT EXISTS btree_gist;
