"""
Unit & Integration Tests: Flood Prediction & Harmonic Tide Engine
Kiểm thử toàn diện thuật toán giải tích sóng thủy triều và động cơ đánh giá rủi ro ngập lụt.
"""

import math
from datetime import datetime, timezone

from app.models.flood import FloodHotspot, FloodSeverityLevel, TideAlertLevel, TideState
from app.services.flood_engine import flood_engine
from app.services.tide_service import tide_engine


def test_harmonic_tide_calculation_bounds():
    """Kiểm tra giá trị mực nước tính toán luôn nằm trong biên độ vật lý thực tế của TP.HCM"""
    dt = datetime(2026, 9, 21, 12, 0, 0, tzinfo=timezone.utc)
    water_level = tide_engine.calculate_water_level(dt, "PHU_AN")
    
    assert isinstance(water_level, float)
    # Mực nước sông Sài Gòn tại Phú An thực tế dao động từ -2.0m đến +2.0m
    assert -2.5 <= water_level <= 2.5, f"Mực nước {water_level}m bất thường ngoài dải vật lý!"


def test_harmonic_tide_rate_and_state():
    """Kiểm tra đạo hàm dH/dt và trạng thái phân loại con nước"""
    dt = datetime(2026, 9, 21, 15, 0, 0, tzinfo=timezone.utc)
    rate = tide_engine.get_tide_rate_of_change(dt, "PHU_AN")
    state = tide_engine.determine_tide_state(dt, "PHU_AN")
    
    assert isinstance(rate, float)
    assert state in (TideState.RISING, TideState.FALLING, TideState.HIGH_TIDE, TideState.LOW_TIDE, TideState.STAND)


def test_tide_alert_levels():
    """Kiểm tra phân loại cấp độ báo động triều cường theo quy chuẩn thủy văn TP.HCM"""
    assert tide_engine.determine_alert_level(1.30) == TideAlertLevel.NORMAL
    assert tide_engine.determine_alert_level(1.45) == TideAlertLevel.ALERT_1
    assert tide_engine.determine_alert_level(1.55) == TideAlertLevel.ALERT_2
    assert tide_engine.determine_alert_level(1.68) == TideAlertLevel.ALERT_3


def test_tide_forecast_sequence():
    """Kiểm tra chuỗi dự báo liên tục trả về đúng số lượng điểm và cấu trúc dữ liệu"""
    forecast = tide_engine.get_tide_forecast(hours=12, interval_minutes=60, station_code="PHU_AN")
    # 12 giờ bước 1 giờ = 13 điểm (tính cả điểm mốc t0)
    assert len(forecast) == 13
    for pt in forecast:
        assert "time" in pt
        assert "water_level_m" in pt
        assert "state" in pt
        assert "alert_level" in pt


def test_flood_engine_risk_evaluation_safe():
    """Kịch bản: Nước rút thấp (-0.5m) và không mưa -> Kết quả phải là SAFE"""
    mock_hotspot = FloodHotspot(
        hotspot_id=1,
        hotspot_code="FL-TEST",
        street_name="Đường Thử Nghiệm",
        threshold_tide_meters=1.50,
        threshold_rain_mm_per_hour=30.0,
        drainage_system_rating=3,
        historical_max_depth_cm=50.0,
    )

    result = flood_engine.calculate_hotspot_risk(
        hotspot=mock_hotspot,
        tide_water_level_m=-0.50,
        rainfall_mmh=0.0,
    )

    assert result["risk_score"] == 0.0
    assert result["predicted_depth_cm"] == 0.0
    assert result["severity_level"] == FloodSeverityLevel.SAFE.value
    assert result["is_impassable_for_bikes"] is False


def test_flood_engine_risk_evaluation_severe():
    """Kịch bản: Triều cường cao (1.68m) vượt ngưỡng 1.50m và mưa to 40mm/h -> Kết quả phải là SEVERE hoặc IMPASSABLE"""
    mock_hotspot = FloodHotspot(
        hotspot_id=1,
        hotspot_code="FL-TEST-FLOOD",
        street_name="Đường Ngập Nặng",
        threshold_tide_meters=1.50,
        threshold_rain_mm_per_hour=25.0,
        drainage_system_rating=2,
        historical_max_depth_cm=60.0,
    )

    result = flood_engine.calculate_hotspot_risk(
        hotspot=mock_hotspot,
        tide_water_level_m=1.68,
        rainfall_mmh=40.0,
    )

    assert result["risk_score"] > 5.0
    assert result["predicted_depth_cm"] > 25.0
    assert result["severity_level"] in (FloodSeverityLevel.SEVERE.value, FloodSeverityLevel.IMPASSABLE.value)
    assert result["is_impassable_for_bikes"] is True


if __name__ == "__main__":
    print("Running automated unit tests...")
    test_harmonic_tide_calculation_bounds()
    test_harmonic_tide_rate_and_state()
    test_tide_alert_levels()
    test_tide_forecast_sequence()
    test_flood_engine_risk_evaluation_safe()
    test_flood_engine_risk_evaluation_severe()
    print("ALL TESTS PASSED SUCCESSFULLY! (6/6)")
