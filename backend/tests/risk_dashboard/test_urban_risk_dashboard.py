"""
Unit & Integration Tests cho STT 42: Dashboard phân tích rủi ro đô thị
(Urban Environmental Risk Executive Dashboard).
Được tổ chức trong thư mục phân tầng: tests/risk_dashboard/

Kiểm thử toàn diện:
- Màn 1/3: Tổng quan chỉ số, biểu đồ cột 22 quận/huyện + TP. Thủ Đức, biểu đồ xu hướng 30 ngày, top 5 cảnh báo, ngưỡng khẩn cấp (>80).
- Màn 2/3: Lọc & phân tích chuyên sâu theo kỳ/loại rủi ro, bảng số liệu định lượng, cơ cấu phần trăm, so sánh kỳ trước (% tăng/giảm).
- Màn 3/3: Popup Chi tiết quận, sự cố tồn đọng, cơ sở thiết yếu bị đe dọa, điều hướng bản đồ GIS.
- Xuất báo cáo CSV / Excel.
- RBAC kiểm soát quyền truy cập lãnh đạo.
"""

import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from datetime import date, timedelta

from app.main import app
from app.schemas.risk_dashboard.schemas import (
    FilterAnalysisRequest,
    OverviewMetricsResponse,
    FilterAnalysisResponse,
    DistrictDetailResponse,
)
from app.interface.risk_dashboard.risk_dashboard_interface import IRiskDashboardRepository
from app.services.risk_dashboard.risk_dashboard_service import RiskDashboardService
from app.utils.security import create_access_token


class MockRiskDashboardRepository(IRiskDashboardRepository):
    """Mock repository độc lập để test đơn vị Service và API theo nguyên tắc DIP"""

    async def get_citywide_overview_metrics(self, db):
        return {
            "overall_risk_score": 58.0,
            "high_risk_district_count": 4,
            "open_incident_count": 128,
        }

    async def get_district_risk_rankings(self, db):
        return [
            {
                "unit_id": 1,
                "district_name": "Quận Bình Tân",
                "risk_score": 84.5,
                "risk_level": "CRITICAL",
                "risk_level_label": "Mức báo động đỏ",
                "open_incidents": 24,
                "spontaneous_dumps": 18,
                "flood_points": 6,
                "threatened_facilities": 7,
                "latitude": 10.7654,
                "longitude": 106.6038,
            },
            {
                "unit_id": 2,
                "district_name": "Quận 8",
                "risk_score": 81.2,
                "risk_level": "CRITICAL",
                "risk_level_label": "Mức báo động đỏ",
                "open_incidents": 21,
                "spontaneous_dumps": 14,
                "flood_points": 7,
                "threatened_facilities": 6,
                "latitude": 10.7241,
                "longitude": 106.6286,
            },
            {
                "unit_id": 3,
                "district_name": "Huyện Hóc Môn",
                "risk_score": 78.0,
                "risk_level": "HIGH",
                "risk_level_label": "Mức báo động cam",
                "open_incidents": 19,
                "spontaneous_dumps": 15,
                "flood_points": 4,
                "threatened_facilities": 4,
                "latitude": 10.8842,
                "longitude": 106.5923,
            },
            {
                "unit_id": 4,
                "district_name": "TP. Thủ Đức",
                "risk_score": 75.8,
                "risk_level": "HIGH",
                "risk_level_label": "Mức báo động cam",
                "open_incidents": 22,
                "spontaneous_dumps": 16,
                "flood_points": 6,
                "threatened_facilities": 9,
                "latitude": 10.8494,
                "longitude": 106.7716,
            },
            {
                "unit_id": 5,
                "district_name": "Quận Bình Thạnh",
                "risk_score": 73.2,
                "risk_level": "HIGH",
                "risk_level_label": "Mức báo động cam",
                "open_incidents": 17,
                "spontaneous_dumps": 11,
                "flood_points": 6,
                "threatened_facilities": 6,
                "latitude": 10.8016,
                "longitude": 106.7113,
            },
            {
                "unit_id": 6,
                "district_name": "Quận 1",
                "risk_score": 38.5,
                "risk_level": "LOW",
                "risk_level_label": "Mức an toàn",
                "open_incidents": 4,
                "spontaneous_dumps": 2,
                "flood_points": 2,
                "threatened_facilities": 2,
                "latitude": 10.7769,
                "longitude": 106.7009,
            },
        ]

    async def get_30_day_risk_trends(self, db):
        trends = []
        today = date.today()
        for i in range(30):
            d = today - timedelta(days=29 - i)
            trends.append({
                "date": d.strftime("%Y-%m-%d"),
                "average_risk_score": 58.0 + (i % 5) - 2,
                "open_incidents": 128 - i,
            })
        return trends

    async def get_top_alert_districts(self, db, limit=5):
        rankings = await self.get_district_risk_rankings(db)
        return [
            {
                "rank": idx + 1,
                "unit_id": r["unit_id"],
                "district_name": r["district_name"],
                "risk_score": r["risk_score"],
                "risk_level": r["risk_level"],
                "risk_level_label": r["risk_level_label"],
                "open_incidents": r["open_incidents"],
                "spontaneous_dumps": r["spontaneous_dumps"],
                "flood_points": r["flood_points"],
                "threatened_facilities": r["threatened_facilities"],
                "urgent_action_required": r["risk_score"] > 80.0,
            }
            for idx, r in enumerate(rankings[:limit])
        ]

    async def get_filtered_analysis(self, db, district_ids, risk_types, start_date, end_date, prev_start_date, prev_end_date):
        type_dist = [
            {"type_code": "DOMESTIC_WASTE", "type_name": "Rác sinh hoạt ùn ứ", "count": 64, "percentage": 45.1, "color_hex": "#EAB308"},
            {"type_code": "FLOOD", "type_name": "Điểm ngập nước", "count": 38, "percentage": 26.8, "color_hex": "#06B6D4"},
            {"type_code": "HAZARDOUS_WASTE", "type_name": "Rác nguy hại y tế/công nghiệp", "count": 22, "percentage": 15.5, "color_hex": "#EF4444"},
            {"type_code": "AIR_POLLUTION", "type_name": "Ô nhiễm khói bụi", "count": 18, "percentage": 12.6, "color_hex": "#8B5CF6"},
        ]
        if risk_types:
            type_dist = [t for t in type_dist if t["type_code"] in risk_types]
            sub_total = sum(t["count"] for t in type_dist)
            for t in type_dist:
                t["percentage"] = round((t["count"] / max(1, sub_total)) * 100.0, 1)

        return {
            "has_data": True,
            "summary_table": {
                "total_incidents": 142,
                "estimated_waste_volume_m3": 385.5,
                "sla_on_time_rate_percent": 92.5,
                "open_incidents": 28,
                "resolved_incidents": 114,
            },
            "risk_type_distribution": type_dist,
            "period_comparison": {
                "current_period_score": 58.4,
                "previous_period_score": 68.3,
                "change_percent": 14.5,
                "trend_direction": "DECREASE",
                "is_positive": True,
                "comparison_text": "Giảm 14.5% so với tháng trước",
                "message": "Tích cực: Chỉ số rủi ro môi trường đã giảm 14.5%",
            },
        }

    async def get_district_detail_by_id_or_name(self, db, unit_id=None, district_name=None):
        return {
            "unit_id": unit_id or 1,
            "district_name": district_name or "Quận Bình Tân",
            "risk_score": 78.0,
            "risk_level": "HIGH",
            "risk_score_text": "Điểm rủi ro: 78/100 - Mức báo động cam",
            "pending_incidents_text": "24 bãi rác tự phát, 3 điểm ngập úng sâu",
            "spontaneous_dumps_count": 24,
            "deep_flood_points_count": 3,
            "threatened_facilities_text": "5 trường học, 2 trạm y tế nằm trong vùng nguy cơ",
            "schools_count": 5,
            "hospitals_count": 2,
            "total_facilities_count": 7,
            "latitude": 10.7654,
            "longitude": 106.6038,
            "gis_map_link": "#map?lat=10.7654&lng=106.6038&district=Quận Bình Tân",
        }


@pytest.fixture
def mock_service():
    repo = MockRiskDashboardRepository()
    return RiskDashboardService(repository=repo)


@pytest.mark.asyncio
async def test_01_overview_metrics_calculation(mock_service):
    """Kiểm tra tính toán Màn 1/3: Thang điểm chung, số quận nguy cơ cao, sự cố đang mở"""
    mock_db = AsyncMock()
    res: OverviewMetricsResponse = await mock_service.get_overview_dashboard(mock_db)

    assert res.overall_risk_score == 58.0
    assert "58/100" in res.overall_risk_label
    assert "Mức rủi ro trung bình" in res.overall_risk_label
    assert res.high_risk_district_count == 4
    assert res.high_risk_district_label == "4 quận nguy cơ cao"
    assert res.open_incident_count == 128
    assert res.open_incident_label == "128 sự cố đang mở"
    assert len(res.district_risks) >= 6
    assert len(res.trend_30_days) == 30
    assert len(res.top_alert_districts) == 5


@pytest.mark.asyncio
async def test_02_critical_alert_threshold_over_80(mock_service):
    """Kiểm tra quy tắc cảnh báo khẩn cấp khi có quận vượt ngưỡng 80 điểm"""
    mock_db = AsyncMock()
    res = await mock_service.get_overview_dashboard(mock_db)

    # Có Quận Bình Tân (84.5) > 80
    assert res.has_critical_alert is True
    assert "Cảnh báo khẩn cấp" in res.critical_alert_message
    assert "Quận Bình Tân" in res.critical_alert_message
    assert "vượt mức an toàn" in res.critical_alert_message


@pytest.mark.asyncio
async def test_03_filtered_analysis_this_month(mock_service):
    """Kiểm tra Màn 2/3: Bảng số liệu định lượng và so sánh kỳ trước"""
    mock_db = AsyncMock()
    req = FilterAnalysisRequest(period="THIS_MONTH")
    res: FilterAnalysisResponse = await mock_service.get_filtered_analysis(mock_db, req)

    assert res.has_data is True
    assert res.empty_message is None
    assert res.summary_table.total_incidents == 142
    assert res.summary_table.estimated_waste_volume_m3 == 385.5
    assert res.summary_table.sla_on_time_rate_percent == 92.5
    assert res.period_comparison.trend_direction == "DECREASE"
    assert res.period_comparison.is_positive is True
    assert "Giảm 14.5%" in res.period_comparison.comparison_text
    assert "Tích cực: Chỉ số rủi ro môi trường đã giảm 14.5%" in res.period_comparison.message


@pytest.mark.asyncio
async def test_04_filtered_analysis_risk_types(mock_service):
    """Kiểm tra lọc theo danh sách loại rủi ro cụ thể"""
    mock_db = AsyncMock()
    req = FilterAnalysisRequest(risk_types=["DOMESTIC_WASTE", "FLOOD"])
    res: FilterAnalysisResponse = await mock_service.get_filtered_analysis(mock_db, req)

    assert len(res.risk_type_distribution) == 2
    type_codes = [t.type_code for t in res.risk_type_distribution]
    assert "DOMESTIC_WASTE" in type_codes
    assert "FLOOD" in type_codes
    # Tổng tỷ lệ phần trăm được tính lại xấp xỉ 100%
    total_pct = sum(t.percentage for t in res.risk_type_distribution)
    assert 99.0 <= total_pct <= 101.0


@pytest.mark.asyncio
async def test_05_district_detail_popup(mock_service):
    """Kiểm tra Màn 3/3: Popup Chi tiết quận và cơ sở thiết yếu bị đe dọa"""
    mock_db = AsyncMock()
    res: DistrictDetailResponse = await mock_service.get_district_detail(mock_db, district_name="Quận Bình Tân")

    assert res.district_name == "Quận Bình Tân"
    assert res.risk_score == 78.0
    assert "78/100" in res.risk_score_text
    assert "24 bãi rác tự phát" in res.pending_incidents_text
    assert "3 điểm ngập úng sâu" in res.pending_incidents_text
    assert "5 trường học" in res.threatened_facilities_text
    assert "2 trạm y tế" in res.threatened_facilities_text
    assert res.gis_map_link.startswith("#map")


def test_06_http_endpoints_integration():
    """Kiểm thử tích hợp các endpoint HTTP của router STT 42"""
    client = TestClient(app)

    # 1. Overview endpoint
    resp_overview = client.get("/api/v1/risk-dashboard/overview")
    assert resp_overview.status_code == 200
    data_overview = resp_overview.json()
    assert "overall_risk_score" in data_overview
    assert "district_risks" in data_overview
    assert len(data_overview["district_risks"]) >= 20

    # 2. Filter analysis endpoint (POST)
    resp_analysis = client.post(
        "/api/v1/risk-dashboard/analysis",
        json={"period": "THIS_MONTH", "risk_types": ["DOMESTIC_WASTE", "FLOOD"]},
    )
    assert resp_analysis.status_code == 200
    data_analysis = resp_analysis.json()
    assert "summary_table" in data_analysis
    assert "risk_type_distribution" in data_analysis

    # 3. District detail popup endpoint
    resp_detail = client.get("/api/v1/risk-dashboard/district/Quận%20Bình%20Tân")
    assert resp_detail.status_code == 200
    data_detail = resp_detail.json()
    assert "district_name" in data_detail
    assert "pending_incidents_text" in data_detail
    assert "threatened_facilities_text" in data_detail

    # 4. Export CSV endpoint
    resp_export = client.post(
        "/api/v1/risk-dashboard/export?format=csv",
        json={"period": "THIS_MONTH"},
    )
    assert resp_export.status_code == 200
    assert "text/csv" in resp_export.headers.get("content-type", "")
    assert "BÁO CÁO PHÂN TÍCH RỦI RO ĐÔ THỊ" in resp_export.text


def test_07_rbac_access_guard():
    """Kiểm thử bảo vệ phân quyền: Từ chối vai trò không được phép"""
    client = TestClient(app)

    # Token của CITIZEN (không có quyền truy cập dashboard lãnh đạo)
    citizen_token = create_access_token(
        user_id="11111111-1111-1111-1111-111111111111",
        email="citizen@test.com",
        role="CITIZEN",
        session_id="session-citizen-123",
    )
    headers = {"Authorization": f"Bearer {citizen_token}"}

    resp = client.get("/api/v1/risk-dashboard/overview", headers=headers)
    assert resp.status_code == 403
    assert "Chỉ Quản trị viên" in resp.json().get("detail", "")

    # Token của ADMIN (được phép truy cập)
    admin_token = create_access_token(
        user_id="22222222-2222-2222-2222-222222222222",
        email="admin@test.com",
        role="ADMIN",
        session_id="session-admin-123",
    )
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    resp_admin = client.get("/api/v1/risk-dashboard/overview", headers=admin_headers)
    assert resp_admin.status_code == 200
