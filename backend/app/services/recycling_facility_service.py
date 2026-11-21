"""
GreenSpot Business Service - Recycling Facilities & Reception Points (STT 23)
[MOCK/STUB MODE]
Lưu ý: Bảng recycling_facilities trong DB và models/spatial.py VẪN ĐƯỢC GIỮ NGUYÊN để không làm hỏng tính năng tra cứu spatial/bản đồ của hệ thống!
"""

import random
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.schemas.recycling_facility import (
    RecyclingFacilityItem,
    RecyclingFacilityCreateRequest,
    RecyclingFacilityUpdateRequest,
    RecyclingFacilityListResponse,
    FacilityValidationCheckResponse,
)

DISTRICT_ABBR_MAP: Dict[str, str] = {
    "Quận 1": "Q1",
    "Quận 3": "Q3",
    "Quận 4": "Q4",
    "Quận 5": "Q5",
    "Quận 6": "Q6",
    "Quận 7": "Q7",
    "Quận 8": "Q8",
    "Quận 10": "Q10",
    "Quận 11": "Q11",
    "Quận 12": "Q12",
    "Quận Bình Thạnh": "BT",
    "Quận Bình Tân": "BTA",
    "Quận Gò Vấp": "GV",
    "Quận Phú Nhuận": "PN",
    "Quận Tân Bình": "TB",
    "Quận Tân Phú": "TP",
    "TP. Thủ Đức": "TD",
    "Thành phố Thủ Đức": "TD",
    "Huyện Bình Chánh": "BC",
    "Huyện Cần Giờ": "CG",
    "Huyện Củ Chi": "CC",
    "Huyện Hóc Môn": "HM",
    "Huyện Nhà Bè": "NB",
}

HCMC_BBOX = {
    "min_lat": 10.35,
    "max_lat": 11.18,
    "min_lng": 106.35,
    "max_lng": 107.05,
}


def is_within_hcmc_bounds(lat: float, lng: float) -> bool:
    return (
        HCMC_BBOX["min_lat"] <= lat <= HCMC_BBOX["max_lat"]
        and HCMC_BBOX["min_lng"] <= lng <= HCMC_BBOX["max_lng"]
    )


def generate_qr_code(facility_code: str) -> str:
    rand_suffix = "".join(random.choices("0123456789ABCDEF", k=6))
    return f"GREENSPOT-{facility_code}-{rand_suffix}"


async def generate_facility_code(db: AsyncSession, unit_id: int) -> str:
    return f"REC-HCM-{unit_id:02d}"


def _mock_facility_item(facility_id: int = 1) -> RecyclingFacilityItem:
    return RecyclingFacilityItem(
        facility_id=facility_id,
        facility_code=f"REC-HCM-{facility_id:02d}",
        name=f"Trạm tái chế mẫu {facility_id}",
        address="123 Đại lộ Lê Lợi, Phường Bến Nghé, Quận 1",
        unit_id=1,
        district_name="Quận 1",
        unit_name="Quận 1",
        latitude=10.7769,
        longitude=106.7009,
        accepted_waste_types=["PLASTIC", "PAPER", "METAL"],
        operating_hours="07:30 - 17:00",
        open_time="07:30",
        close_time="17:00",
        qr_code=f"GREENSPOT-REC-HCM-{facility_id:02d}-ABC123",
        contact_phone="02838222222",
        managing_org="Công ty Môi trường Đô thị TP.HCM",
        is_active=True,
        version=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


async def list_facilities(
    db: AsyncSession,
    page: int = 1,
    limit: int = 10,
    status_filter: str = "ALL",
    search: Optional[str] = None,
    unit_id: Optional[int] = None,
) -> RecyclingFacilityListResponse:
    """Mock/Stub: Lấy danh sách trạm tái chế (STT 23)"""
    return RecyclingFacilityListResponse(
        items=[],
        total=0,
        page=page,
        page_size=limit,
        total_pages=1,
        active_count=0,
        inactive_count=0,
    )


async def get_facility_by_id(db: AsyncSession, facility_id: int) -> RecyclingFacilityItem:
    """Mock/Stub: Chi tiết trạm tái chế (STT 23)"""
    return _mock_facility_item(facility_id)


async def check_name_unique(
    db: AsyncSession, name: str, unit_id: int, exclude_id: Optional[int] = None
) -> FacilityValidationCheckResponse:
    """Mock/Stub: Kiểm tra tên trạm duy nhất (STT 23)"""
    return FacilityValidationCheckResponse(is_valid=True)


async def check_proximity(
    db: AsyncSession, lat: float, lng: float, exclude_id: Optional[int] = None
) -> FacilityValidationCheckResponse:
    """Mock/Stub: Kiểm tra khoảng cách 20m (STT 23)"""
    return FacilityValidationCheckResponse(is_valid=True)


async def create_facility(
    db: AsyncSession,
    user: User,
    req: RecyclingFacilityCreateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> RecyclingFacilityItem:
    """Mock/Stub: Thêm mới trạm tái chế (STT 23)"""
    item = _mock_facility_item(1)
    item.name = req.name
    item.address = req.address
    item.unit_id = req.unit_id
    item.latitude = req.latitude
    item.longitude = req.longitude
    return item


async def update_facility(
    db: AsyncSession,
    user: User,
    facility_id: int,
    req: RecyclingFacilityUpdateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> RecyclingFacilityItem:
    """Mock/Stub: Sửa thông tin trạm tái chế (STT 23)"""
    item = _mock_facility_item(facility_id)
    item.name = req.name
    item.address = req.address
    item.unit_id = req.unit_id
    item.latitude = req.latitude
    item.longitude = req.longitude
    item.is_active = req.is_active
    return item


async def delete_facility(
    db: AsyncSession,
    user: User,
    facility_id: int,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """Mock/Stub: Xóa mềm trạm tái chế (STT 23)"""
    return {
        "success": True,
        "message": "Đã xoá thành công trạm tái chế (Mock)",
        "facility_id": facility_id,
        "facility_code": f"REC-HCM-{facility_id:02d}",
    }
