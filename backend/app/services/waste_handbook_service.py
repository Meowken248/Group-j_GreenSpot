from typing import Optional, List
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.waste_handbook import WasteHandbookItem
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
        "facility_filter": None,
    },
    {
        "code": "RECYCLABLE",
        "name": "Rác Tái Chế",
        "description": "Giấy báo, bìa carton, chai nhựa PET, lon nhôm, vỏ hộp kim loại.",
        "color_hex": "#3b82f6",
        "icon_name": "recycle",
        "bin_name": "Thùng xanh dương / trắng (Rác Tái Chế)",
        "examples_hint": "Chai nhựa PET, lon nước ngọt, thùng carton, giấy vụn",
        "facility_filter": "RECYCLING_CENTER",
    },
    {
        "code": "HAZARDOUS",
        "name": "Rác Nguy Hại",
        "description": "Pin đã qua sử dụng, bóng đèn huỳnh quang, ắc quy, chai lọ hóa chất tẩy rửa.",
        "color_hex": "#ef4444",
        "icon_name": "alert-triangle",
        "bin_name": "Thùng đỏ / cam (Rác Nguy Hại)",
        "examples_hint": "Pin cũ, bóng huỳnh quang, ắc quy hỏng, lọ thuốc trừ sâu",
        "facility_filter": "BATTERY_DROP_OFF",
    },
    {
        "code": "OTHER",
        "name": "Rác Khác",
        "description": "Túi nilon dùng một lần, tã bỉm, gốm sứ vỡ, đầu mẩu thuốc lá.",
        "color_hex": "#6b7280",
        "icon_name": "trash-2",
        "bin_name": "Thùng xám / vàng (Rác Thải Khác)",
        "examples_hint": "Túi bóng kính, tã bỉm sinh hoạt, bát đĩa sành vỡ",
        "facility_filter": None,
    },
]

CAT_LOOKUP = {c["code"]: c for c in CATEGORIES_META}

class WasteHandbookService:
    @staticmethod
    async def get_overview(db: AsyncSession) -> WasteHandbookOverviewResponse:
        categories_resp: List[WasteCategoryResponse] = []

        for cat in CATEGORIES_META:
            count_q = select(func.count(WasteHandbookItem.item_id)).where(
                WasteHandbookItem.category_code == cat["code"],
                WasteHandbookItem.is_active == True
            )
            count = (await db.execute(count_q)).scalar() or 0
            categories_resp.append(
                WasteCategoryResponse(
                    code=cat["code"],
                    name=cat["name"],
                    description=cat["description"],
                    color_hex=cat["color_hex"],
                    icon_name=cat["icon_name"],
                    bin_name=cat["bin_name"],
                    examples_hint=cat["examples_hint"],
                    item_count=count
                )
            )

        # Featured items
        featured_q = select(WasteHandbookItem).where(WasteHandbookItem.is_active == True).limit(8)
        featured_res = await db.execute(featured_q)
        items = featured_res.scalars().all()

        featured_resp: List[WasteItemSummaryResponse] = []
        for it in items:
            cat_meta = CAT_LOOKUP.get(it.category_code, CATEGORIES_META[3])
            featured_resp.append(
                WasteItemSummaryResponse(
                    item_id=it.item_id,
                    name=it.name,
                    category_code=it.category_code,
                    category_name=cat_meta["name"],
                    category_color=cat_meta["color_hex"],
                    image_url=it.image_url,
                    bin_name=it.bin_name
                )
            )

        return WasteHandbookOverviewResponse(
            categories=categories_resp,
            featured_items=featured_resp
        )

    @staticmethod
    async def search_items(
        db: AsyncSession,
        query: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[WasteItemSummaryResponse]:
        q = select(WasteHandbookItem).where(WasteHandbookItem.is_active == True)

        if category and category.upper() in CAT_LOOKUP:
            q = q.where(WasteHandbookItem.category_code == category.upper())

        if query and query.strip():
            term = f"%{query.strip().lower()}%"
            q = q.where(
                or_(
                    func.lower(WasteHandbookItem.name).ilike(term),
                    func.lower(WasteHandbookItem.alternative_names).ilike(term)
                )
            )

        q = q.limit(limit)
        res = await db.execute(q)
        items = res.scalars().all()

        out: List[WasteItemSummaryResponse] = []
        for it in items:
            cat_meta = CAT_LOOKUP.get(it.category_code, CATEGORIES_META[3])
            out.append(
                WasteItemSummaryResponse(
                    item_id=it.item_id,
                    name=it.name,
                    category_code=it.category_code,
                    category_name=cat_meta["name"],
                    category_color=cat_meta["color_hex"],
                    image_url=it.image_url,
                    bin_name=it.bin_name
                )
            )
        return out

    @staticmethod
    async def get_item_detail(db: AsyncSession, item_id: str) -> WasteItemDetailResponse:
        q = select(WasteHandbookItem).where(WasteHandbookItem.item_id == item_id)
        res = await db.execute(q)
        item = res.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy loại rác phù hợp")

        cat_meta = CAT_LOOKUP.get(item.category_code, CATEGORIES_META[3])
        action_label = "Tìm điểm thu gom" if item.has_dedicated_station else "Thu gom rác sinh hoạt định kỳ"

        return WasteItemDetailResponse(
            item_id=item.item_id,
            name=item.name,
            category_code=item.category_code,
            category_name=cat_meta["name"],
            category_color=cat_meta["color_hex"],
            alternative_names=item.alternative_names,
            image_url=item.image_url,
            sorting_guide=item.sorting_guide,
            bin_color=item.bin_color,
            bin_name=item.bin_name,
            safety_notes=item.safety_notes,
            has_dedicated_station=item.has_dedicated_station,
            station_action_label=action_label,
            facility_filter_type=cat_meta.get("facility_filter")
        )
