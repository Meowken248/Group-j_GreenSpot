"""
GreenSpot Business Service - Waste Category & SLA Management (STT 22)
[MOCK/STUB MODE]
Lưu ý: Bảng waste_categories trong database và models/incident.py VẪN ĐƯỢC GIỮ NGUYÊN để không làm hỏng FK của Incidents, Triage, Dispatch!
"""

import math
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rbac import User
from app.schemas.waste_category import (
    WasteCategoryItem,
    WasteCategoryListResponse,
    WasteCategoryCreateRequest,
    WasteCategoryUpdateRequest,
    ValidationCheckResponse,
)


def _mock_category_item(category_id: int = 1) -> WasteCategoryItem:
    return WasteCategoryItem(
        category_id=category_id,
        category_code=f"CAT_{category_id:02d}",
        name=f"Danh mục rác thải mẫu {category_id}",
        description="Mô tả danh mục rác thải (Mock)",
        default_severity="MEDIUM",
        sla_hours=24,
        sla_warning_hours=12,
        color_hex="#22C55E",
        icon_name="trash-2",
        is_active=True,
        unresolved_incidents_count=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


async def list_categories(
    db: AsyncSession,
    page: int = 1,
    limit: int = 10,
    status_filter: str = "ALL",
    search: Optional[str] = None,
) -> WasteCategoryListResponse:
    """Mock/Stub: Danh sách danh mục rác thải (STT 22)"""
    return WasteCategoryListResponse(
        items=[],
        total=0,
        page=page,
        limit=limit,
        total_pages=1,
        active_count=0,
        inactive_count=0,
    )


async def get_category_by_id(db: AsyncSession, category_id: int) -> WasteCategoryItem:
    """Mock/Stub: Chi tiết danh mục rác thải (STT 22)"""
    return _mock_category_item(category_id)


async def create_category(
    db: AsyncSession,
    user: User,
    req: WasteCategoryCreateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> WasteCategoryItem:
    """Mock/Stub: Thêm mới danh mục rác thải (STT 22)"""
    item = _mock_category_item(1)
    item.category_code = req.category_code.upper()
    item.name = req.name
    item.sla_hours = req.sla_hours
    item.sla_warning_hours = req.sla_warning_hours
    return item


async def update_category(
    db: AsyncSession,
    user: User,
    category_id: int,
    req: WasteCategoryUpdateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> WasteCategoryItem:
    """Mock/Stub: Cập nhật danh mục rác thải (STT 22)"""
    item = _mock_category_item(category_id)
    item.name = req.name
    item.sla_hours = req.sla_hours
    item.sla_warning_hours = req.sla_warning_hours
    item.is_active = req.is_active
    return item


async def delete_category(
    db: AsyncSession,
    user: User,
    category_id: int,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """Mock/Stub: Xóa mềm danh mục rác thải (STT 22)"""
    return {
        "success": True,
        "message": "Đã xoá thành công danh mục rác thải (Mock)",
        "category_id": category_id,
        "category_code": f"CAT_{category_id:02d}",
        "unresolved_incidents_count": 0,
    }


async def check_code_unique(db: AsyncSession, code: str) -> ValidationCheckResponse:
    """Mock/Stub: Kiểm tra mã danh mục duy nhất (STT 22)"""
    return ValidationCheckResponse(is_valid=True)


async def check_name_unique(
    db: AsyncSession, name: str, exclude_id: Optional[int] = None
) -> ValidationCheckResponse:
    """Mock/Stub: Kiểm tra tên danh mục duy nhất (STT 22)"""
    return ValidationCheckResponse(is_valid=True)
