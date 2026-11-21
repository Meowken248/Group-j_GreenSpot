"""
Waste Handbook Service (STT 27: Cẩm nang phân loại rác) - Mock/Stub Mode
Đã chuyển sang chế độ Mock/Stub an toàn để sẵn sàng triển khai lại từ đầu.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.schemas.waste_handbook import (
    WasteCategoryResponse,
    WasteItemSummaryResponse,
    WasteItemDetailResponse,
    WasteHandbookOverviewResponse,
)

CATEGORIES_META = [
    {
        "code": "ORGANIC",
        "name": "Rác Hữu Cơ",
        "description": "Thức ăn thừa, rau củ quả hư hỏng, lá cây, bã trà, bã cà phê.",
        "color_hex": "#22c55e",
        "icon_name": "leaf",
        "bin_name": "Thùng xanh lá (Rác Hữu Cơ)",
        "examples_hint": "Thức ăn thừa, vỏ chuối, lá cây rụng, bã cà phê",
    },
    {
        "code": "RECYCLABLE",
        "name": "Rác Tái Chế",
        "description": "Giấy báo, bìa carton, chai nhựa PET, lon nhôm, vỏ hộp kim loại.",
        "color_hex": "#3b82f6",
        "icon_name": "recycle",
        "bin_name": "Thùng xanh dương / trắng (Rác Tái Chế)",
        "examples_hint": "Chai nhựa PET, lon nước ngọt, thùng carton, giấy vụn",
    },
]


class WasteHandbookService:
    @staticmethod
    async def get_overview(db: AsyncSession) -> WasteHandbookOverviewResponse:
        cats = [
            WasteCategoryResponse(
                code=c["code"],
                name=c["name"],
                description=c["description"],
                color_hex=c["color_hex"],
                icon_name=c["icon_name"],
                bin_name=c["bin_name"],
                examples_hint=c["examples_hint"],
                item_count=0,
            )
            for c in CATEGORIES_META
        ]
        return WasteHandbookOverviewResponse(
            categories=cats,
            featured_items=[],
        )

    @staticmethod
    async def search_items(
        db: AsyncSession, query: Optional[str] = None, category_code: Optional[str] = None
    ) -> List[WasteItemSummaryResponse]:
        return []

    @staticmethod
    async def get_item_detail(db: AsyncSession, item_id: str) -> WasteItemDetailResponse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chức năng đang ở chế độ Mock/Stub",
        )
