"""
API Router for Flood-Aware Navigation Routing (STT 41).
Provides endpoints for dual-route calculation, turn-by-turn navigation,
real-time hazard early warning (<500m), rerouting, and location autocomplete.
"""

from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.navigation.schemas import (
    CalculateRouteRequest,
    EarlyWarningCheckRequest,
    EarlyWarningResponse,
    GeoPoint,
    NavigationPlanResponse,
    RerouteRequest,
    RouteOption,
)
from app.services.navigation.service import safe_navigation_service

router = APIRouter(prefix="/navigation", tags=["Flood-Aware Safe Routing"])

# Dữ liệu gợi ý địa danh mẫu tiêu biểu tại TP.HCM phục vụ Autocomplete
HCM_PRESET_LOCATIONS: List[Dict[str, Any]] = [
    {"name": "Chợ Bến Thành, Quận 1", "latitude": 10.7725, "longitude": 106.6980},
    {"name": "Nhà thờ Đức Bà, Quận 1", "latitude": 10.7798, "longitude": 106.6990},
    {"name": "Landmark 81, Quận Bình Thạnh", "latitude": 10.7951, "longitude": 106.7218},
    {"name": "Đường Điện Biên Phủ, Quận Bình Thạnh", "latitude": 10.8010, "longitude": 106.7112},
    {"name": "Đường Xô Viết Nghệ Tĩnh (Ngã tư Hàng Xanh)", "latitude": 10.8015, "longitude": 106.7115},
    {"name": "Đường Nguyễn Hữu Cảnh, Quận Bình Thạnh", "latitude": 10.7915, "longitude": 106.7142},
    {"name": "Đường Trần Xuân Soạn, Quận 7", "latitude": 10.7512, "longitude": 106.7025},
    {"name": "Đường Huỳnh Tấn Phát, Quận 7", "latitude": 10.7320, "longitude": 106.7350},
    {"name": "Đại học Bách Khoa TP.HCM, Quận 10", "latitude": 10.7721, "longitude": 106.6578},
    {"name": "Khu đô thị Sala, TP Thủ Đức", "latitude": 10.7712, "longitude": 106.7265},
    {"name": "Sân bay Quốc tế Tân Sơn Nhất, Quận Tân Bình", "latitude": 10.8188, "longitude": 106.6519},
    {"name": "Cầu Sài Gòn, TP.HCM", "latitude": 10.7989, "longitude": 106.7241},
    {"name": "Đường Võ Văn Kiệt, Quận 5", "latitude": 10.7533, "longitude": 106.6711},
]


@router.post(
    "/routes",
    response_model=NavigationPlanResponse,
    summary="Tính toán phương án định tuyến né ngập (Tuyến nhanh nhất vs Tuyến an toàn nhất)",
)
async def calculate_navigation_routes(
    payload: CalculateRouteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Tính toán 2 phương án di chuyển:
    - Tuyến nhanh nhất (đánh dấu các đoạn ngập có thể gây chết máy)
    - Tuyến an toàn nhất (đường vòng né ngập để bảo vệ xe)
    """
    # Validation quy tắc: Điểm đi và điểm đến không được trùng nhau
    dist_diff = abs(payload.origin.latitude - payload.destination.latitude) + abs(
        payload.origin.longitude - payload.destination.longitude
    )
    if dist_diff < 0.0001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Điểm đi và điểm đến không được trùng nhau",
        )

    result = await safe_navigation_service.calculate_dual_routes(db, payload)
    return result


@router.post(
    "/early-warning",
    response_model=EarlyWarningResponse,
    summary="Kiểm tra cảnh báo sớm điểm ngập mới phát sinh phía trước (< 500m)",
)
async def check_route_early_warning(
    payload: EarlyWarningCheckRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Chạy định kỳ nền trong Navigation Mode.
    Nếu phát hiện điểm ngập cách xe < 500m, kích hoạt popup cảnh báo khẩn cấp và giọng nói AI.
    """
    return await safe_navigation_service.check_early_warning_ahead(db, payload)


@router.post(
    "/reroute",
    response_model=RouteOption,
    summary="Tái định tuyến tức thời né điểm ngập vừa phát sinh",
)
async def reroute_avoiding_flood(
    payload: RerouteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Kích hoạt khi người dùng bấm nút 'Đổi tuyến' trên popup khẩn cấp.
    Hệ thống vẽ lại đường rẽ nhánh tránh ngập ngay tại ngã rẽ kế tiếp.
    """
    return await safe_navigation_service.reroute_avoiding_hazard(db, payload)


@router.get(
    "/autocomplete",
    response_model=List[GeoPoint],
    summary="Gợi ý địa danh tự động khi gõ (Autocomplete)",
)
async def autocomplete_locations(
    q: str = Query(..., min_length=1, description="Từ khóa tìm kiếm địa chỉ"),
):
    """
    Gợi ý địa điểm tự động cho ô nhập điểm đi và điểm đến.
    """
    query_lower = q.strip().lower()
    matches = [
        GeoPoint(
            name=loc["name"],
            latitude=loc["latitude"],
            longitude=loc["longitude"],
        )
        for loc in HCM_PRESET_LOCATIONS
        if query_lower in loc["name"].lower()
    ]

    # Nếu không khớp mẫu có sẵn, trả về danh sách gợi ý gần nhất
    if not matches:
        matches = [
            GeoPoint(
                name=f"{q.strip()} (TP. Hồ Chí Minh)",
                latitude=10.7769,
                longitude=106.7009,
            )
        ]

    return matches[:6]
