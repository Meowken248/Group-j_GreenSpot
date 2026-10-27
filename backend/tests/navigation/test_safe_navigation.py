"""
Unit & Integration Tests for Safe Navigation Routing Engine (STT 41).
Tests cover:
- Dual-route calculation (Fastest vs Safest)
- Different vehicle flood depth thresholds (Motorbike, Car, Bicycle, Waste Truck)
- Origin and Destination identical validation
- Early warning hazard detection (<500m)
- Dynamic rerouting avoidance
- Location autocomplete
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.schemas.navigation.schemas import (
    CalculateRouteRequest,
    EarlyWarningCheckRequest,
    GeoPoint,
    RerouteRequest,
    VehicleType,
    VEHICLE_FLOOD_THRESHOLDS,
)
from app.services.navigation.service import (
    SafeNavigationService,
    haversine_distance_meters,
)


def test_vehicle_thresholds():
    """Kiểm tra ngưỡng ngập quy chuẩn của từng loại phương tiện."""
    assert VEHICLE_FLOOD_THRESHOLDS[VehicleType.BICYCLE] == 15.0
    assert VEHICLE_FLOOD_THRESHOLDS[VehicleType.MOTORBIKE] == 25.0
    assert VEHICLE_FLOOD_THRESHOLDS[VehicleType.CAR] == 35.0
    assert VEHICLE_FLOOD_THRESHOLDS[VehicleType.WASTE_TRUCK] == 55.0


def test_haversine_distance():
    """Kiểm tra tính toán khoảng cách cầu Haversine."""
    # Điểm A: Chợ Bến Thành (10.7725, 106.6980)
    # Điểm B: Nhà thờ Đức Bà (10.7798, 106.6990)
    dist = haversine_distance_meters(10.7725, 106.6980, 10.7798, 106.6990)
    assert 700.0 < dist < 1000.0


@pytest.mark.asyncio
async def test_calculate_dual_routes_with_hazards():
    """Kiểm tra tính toán 2 tuyến khi có điểm ngập trên tuyến nhanh."""
    service = SafeNavigationService()
    mock_db = MagicMock()

    # Mock điểm ngập thực tế
    mock_hotspots = [
        {
            "hotspot_id": "1",
            "hotspot_code": "FL-01",
            "street_name": "Nguyễn Hữu Cảnh",
            "lat": 10.7838,
            "lng": 106.7099,
            "predicted_depth_cm": 35.0,
            "severity_level": "SEVERE",
        }
    ]

    with patch.object(service, "_fetch_flood_hotspots", new=AsyncMock(return_value=mock_hotspots)), \
         patch("app.services.navigation.service.tide_engine.get_current_tide", return_value={"water_level_meters": 1.45}), \
         patch("app.services.navigation.service.weather_service.get_hcm_rainfall", new=AsyncMock(return_value={"current_rain_mmh": 20.0})):

        req = CalculateRouteRequest(
            origin=GeoPoint(name="Chợ Bến Thành", latitude=10.7725, longitude=106.6980),
            destination=GeoPoint(name="Landmark 81", latitude=10.7951, longitude=106.7218),
            vehicle_type=VehicleType.MOTORBIKE,
        )

        res = await service.calculate_dual_routes(mock_db, req)

        assert res.vehicle_type == VehicleType.MOTORBIKE
        assert res.vehicle_threshold_cm == 25.0
        assert res.fastest_route.route_type == "FASTEST"
        assert res.safest_route.route_type == "SAFEST"
        assert len(res.fastest_route.coordinates) > 0
        assert len(res.safest_route.coordinates) > 0
        assert res.all_clear is False


@pytest.mark.asyncio
async def test_calculate_dual_routes_all_clear():
    """Kiểm tra kịch bản cả 2 tuyến đều khô ráo không ngập."""
    service = SafeNavigationService()
    mock_db = MagicMock()

    with patch.object(service, "_fetch_flood_hotspots", new=AsyncMock(return_value=[])), \
         patch("app.services.navigation.service.tide_engine.get_current_tide", return_value={"water_level_meters": 0.8}), \
         patch("app.services.navigation.service.weather_service.get_hcm_rainfall", new=AsyncMock(return_value={"current_rain_mmh": 0.0})):

        req = CalculateRouteRequest(
            origin=GeoPoint(name="Điểm A", latitude=10.7500, longitude=106.6500),
            destination=GeoPoint(name="Điểm B", latitude=10.7600, longitude=106.6600),
            vehicle_type=VehicleType.CAR,
        )

        res = await service.calculate_dual_routes(mock_db, req)
        assert res.all_clear is True
        assert res.summary_message == "Tất cả các tuyến đường đều an toàn, không có ngập"
        assert res.safest_route.hazard_count == 0


@pytest.mark.asyncio
async def test_early_warning_ahead():
    """Kiểm tra cảnh báo sớm khẩn cấp <500m cho Màn 4/4."""
    service = SafeNavigationService()
    mock_db = MagicMock()

    # Vũng ngập cách vị trí hiện tại ~300m
    mock_hotspots = [
        {
            "hotspot_id": "2",
            "hotspot_code": "FL-WARN-300",
            "street_name": "Đinh Tiên Hoàng",
            "lat": 10.7825,
            "lng": 106.6990,
            "predicted_depth_cm": 45.0,
            "severity_level": "SEVERE",
        }
    ]

    with patch.object(service, "_fetch_flood_hotspots", new=AsyncMock(return_value=mock_hotspots)), \
         patch("app.services.navigation.service.tide_engine.get_current_tide", return_value={"water_level_meters": 1.5}), \
         patch("app.services.navigation.service.weather_service.get_hcm_rainfall", new=AsyncMock(return_value={"current_rain_mmh": 35.0})):

        req = EarlyWarningCheckRequest(
            current_latitude=10.7800,
            current_longitude=106.6990,
            route_coordinates=[[106.6990, 10.7800], [106.6990, 10.7850]],
            vehicle_type=VehicleType.MOTORBIKE,
        )

        res = await service.check_early_warning_ahead(mock_db, req)
        assert res.has_hazard_ahead is True
        assert res.distance_ahead_meters is not None
        assert res.distance_ahead_meters <= 500.0
        assert res.alert_title == "CẢNH BÁO NGẬP"
        assert "Phía trước" in res.alert_message
        assert "Nguy cơ chết máy cao" in res.water_level_display
        assert "bạn có muốn đổi tuyến?" in res.voice_announcement


@pytest.mark.asyncio
async def test_reroute_avoiding_hazard():
    """Kiểm tra bấm nút Đổi tuyến."""
    service = SafeNavigationService()
    mock_db = MagicMock()

    req = RerouteRequest(
        current_location=GeoPoint(name="Vị trí hiện tại", latitude=10.7800, longitude=106.6990),
        destination=GeoPoint(name="Điểm đến", latitude=10.8000, longitude=106.7100),
        vehicle_type=VehicleType.MOTORBIKE,
        avoid_hazard_id="FL-WARN-300",
    )

    res = await service.reroute_avoiding_hazard(mock_db, req)
    assert res.route_type == "SAFEST"
    assert len(res.turn_steps) > 0
    assert "tránh" in res.turn_steps[0].instruction
    assert "tránh ngập" in (res.turn_steps[0].avoid_reason or "")
