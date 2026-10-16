"""
Pytest Test Suite cho STT 44: Phân tích điểm nóng + dự báo 7 ngày
(Spatial Hotspot Analytics & 7-Day Forecasting)
Kiểm thử 7 tiêu chí theo đúng Clean Architecture, DIP, OCC và RBAC Guard.
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.crud.hotspots.hotspot_repository import HotspotRepository, hotspot_repository
from app.services.hotspots.hotspot_service import HotspotService
from app.schemas.hotspots.schemas import (
    HotspotFilterRequest,
    ExportReportRequest,
)
from app.utils.security import create_access_token


@pytest.fixture
def mock_db():
    db = AsyncMock()
    return db


@pytest.fixture
def hotspot_service_instance():
    repo = HotspotRepository()
    return HotspotService(repo)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token_header():
    token = create_access_token(
        user_id="22222222-2222-2222-2222-222222222222",
        email="admin@greenspot.vn",
        role="ADMIN",
        session_id="session-admin-123",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def citizen_token_header():
    token = create_access_token(
        user_id="11111111-1111-1111-1111-111111111111",
        email="citizen@greenspot.vn",
        role="CITIZEN",
        session_id="session-cit-123",
    )
    return {"Authorization": f"Bearer {token}"}


# ==================== 1. TEST BẢN ĐỒ ĐIỂM NÓNG & BỘ LỌC ====================

@pytest.mark.asyncio
async def test_01_get_hotspot_map_and_filters(mock_db, hotspot_service_instance):
    """Tiêu chí 1: Truy vấn bản đồ điểm nóng KDE, kiểm tra dải quang phổ và thông điệp thành công"""
    req = HotspotFilterRequest(incident_type="ALL", time_range="30_DAYS")
    res = await hotspot_service_instance.get_hotspot_map(mock_db, req)

    assert res.has_data is True
    assert res.total_clusters > 0
    assert "Đã tải xong dữ liệu phân tích cụm điểm nóng" in res.status_message
    assert len(res.top_5_hotspots) <= 5

    # Kiểm tra điểm nóng hàng đầu có điểm KDE và số sự cố cao nhất
    top_1 = res.top_5_hotspots[0]
    assert top_1.incident_count >= res.top_5_hotspots[-1].incident_count
    assert top_1.severity_level in ["CRITICAL", "SEVERE", "POTENTIAL"]
    assert top_1.severity_color.startswith("#")


# ==================== 2. TEST BỘ LỌC KHÔNG CÓ DỮ LIỆU ====================

@pytest.mark.asyncio
async def test_02_empty_filters_behavior(mock_db, hotspot_service_instance):
    """Tiêu chí 2: Bộ lọc không có dữ liệu sự cố, trả về thông điệp không có điểm nóng"""
    req = HotspotFilterRequest(incident_type="NON_EXISTENT_TYPE", time_range="7_DAYS")
    res = await hotspot_service_instance.get_hotspot_map(mock_db, req)

    assert res.has_data is False
    assert res.total_clusters == 0
    assert "Không phát hiện cụm điểm nóng nào" in res.status_message


# ==================== 3. TEST DANH SÁCH KHU VỰC DỰ BÁO ====================

@pytest.mark.asyncio
async def test_03_available_areas(mock_db, hotspot_service_instance):
    """Tiêu chí 3: Lấy danh sách Quận/Huyện và Điểm nóng cho combobox lựa chọn"""
    areas = await hotspot_service_instance.get_available_areas(mock_db)
    assert len(areas) >= 5

    # Phải có cả loại DISTRICT và HOTSPOT
    types = {a.target_type for a in areas}
    assert "DISTRICT" in types
    assert "HOTSPOT" in types


# ==================== 4. TEST DỰ BÁO CHUỖI THỜI GIAN 7 NGÀY ====================

@pytest.mark.asyncio
async def test_04_7day_forecast_and_peak_day(mock_db, hotspot_service_instance):
    """Tiêu chí 4: Dự báo 7 ngày kèm khoảng tin cậy 95%, phân tích ngày đỉnh điểm và độ chính xác 87.5%"""
    res = await hotspot_service_instance.get_7day_forecast(mock_db, target_id="dist-q8", target_type="DISTRICT")

    assert res.model_accuracy_pct == 87.5
    assert len(res.daily_points) == 7

    # Kiểm tra từng điểm dự báo có khoảng tin cậy 95% hợp lệ (ci_lower <= predicted <= ci_upper)
    for p in res.daily_points:
        assert p.ci_lower_95 <= p.predicted_incidents <= p.ci_upper_95
        assert p.rainfall_mm >= 0
        assert p.tidal_peak_m >= 0

    # Phải nhận diện được ngày nguy cơ cao nhất trong tuần
    assert res.peak_risk_day is not None
    assert res.peak_risk_day.risk_level == "PEAK_CRITICAL"
    assert "triều cường đạt đỉnh 1.65m" in res.peak_risk_summary


# ==================== 5. TEST XUẤT BÁO CÁO DỰ BÁO 7 NGÀY ====================

@pytest.mark.asyncio
async def test_05_export_forecast_report(mock_db, hotspot_service_instance):
    """Tiêu chí 5: Kích hoạt xuất báo cáo PDF/Excel dự báo 7 ngày"""
    req_pdf = ExportReportRequest(target_id="dist-q8", target_type="DISTRICT", format="PDF")
    res_pdf = await hotspot_service_instance.export_forecast_report(mock_db, req_pdf)

    assert res_pdf.success is True
    assert res_pdf.file_name == "BaoCao_DuBao_7Ngay.pdf"
    assert "Xuất báo cáo dự báo 7 ngày thành công" in res_pdf.message


# ==================== 6. TEST CHI TIẾT ĐIỂM NÓNG & PREFILL STT 43 ====================

@pytest.mark.asyncio
async def test_06_hotspot_detail_and_dispatch_prefill(mock_db, hotspot_service_instance):
    """Tiêu chí 6: Xem chi tiết điểm nóng, kiểm tra liên kết lệnh điều phối và trích xuất prefill sang STT 43"""
    # Test điểm nóng chưa có lệnh điều phối
    detail_1 = await hotspot_service_instance.get_hotspot_detail(mock_db, "hs-001")
    assert detail_1.hotspot.hotspot_code == "HS-2026-001"
    assert detail_1.has_active_dispatch is False
    assert detail_1.dispatch_prefill["district"] == "Quận 8"
    assert detail_1.dispatch_prefill["suggested_priority"] == "URGENT"

    # Test điểm nóng đã có lệnh xử lý trước đó (STT 43)
    detail_2 = await hotspot_service_instance.get_hotspot_detail(mock_db, "hs-002")
    assert detail_2.has_active_dispatch is True
    assert detail_2.active_order_code == "DP-2026-001"


# ==================== 7. TEST HTTP ENDPOINTS & RBAC GUARD ====================

def test_07_http_endpoints_and_rbac_guard(client, admin_token_header, citizen_token_header):
    """Tiêu chí 7: Kiểm thử toàn bộ RESTful API endpoints và kiểm soát quyền truy cập RBAC"""
    # 1. GET /api/v1/hotspots/map với quyền Quản trị viên (ADMIN)
    res_map = client.get("/api/v1/hotspots/map", headers=admin_token_header)
    assert res_map.status_code == 200
    data_map = res_map.json()
    assert data_map["has_data"] is True

    # 2. GET /api/v1/hotspots/areas
    res_areas = client.get("/api/v1/hotspots/areas", headers=admin_token_header)
    assert res_areas.status_code == 200
    assert len(res_areas.json()) > 0

    # 3. GET /api/v1/hotspots/forecast
    res_fc = client.get("/api/v1/hotspots/forecast?target_id=dist-q8", headers=admin_token_header)
    assert res_fc.status_code == 200
    data_fc = res_fc.json()
    assert data_fc["model_accuracy_pct"] == 87.5

    # 4. POST /api/v1/hotspots/forecast/export
    res_exp = client.post("/api/v1/hotspots/forecast/export", json={"target_id": "dist-q8", "format": "PDF"}, headers=admin_token_header)
    assert res_exp.status_code == 200
    assert res_exp.json()["file_name"] == "BaoCao_DuBao_7Ngay.pdf"

    # 5. GET /api/v1/hotspots/{hotspot_id}
    res_dt = client.get("/api/v1/hotspots/hs-001", headers=admin_token_header)
    assert res_dt.status_code == 200
    assert res_dt.json()["hotspot"]["hotspot_code"] == "HS-2026-001"

    # 6. RBAC Guard: Citizen không có quyền truy cập module này -> 403 Forbidden
    res_forbidden = client.get("/api/v1/hotspots/map", headers=citizen_token_header)
    assert res_forbidden.status_code == 403
    assert "Chỉ Cán bộ quản lý môi trường và Chuyên viên phân tích" in res_forbidden.json()["detail"]
