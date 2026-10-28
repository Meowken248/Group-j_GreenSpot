import uuid
import re
from typing import Optional, List
from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.waste_handbook import WasteHandbookItem
from app.models.audit import AuditLog
from app.schemas.waste_handbook import (
    WasteCategoryResponse,
    WasteItemSummaryResponse,
    WasteItemDetailResponse,
    WasteHandbookOverviewResponse,
    WasteItemCreateRequest,
    WasteItemUpdateRequest,
    WasteHandbookAdminItemResponse,
    WasteHandbookAdminListResponse,
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
        "facility_filter": "recycling",
    },
    {
        "code": "HAZARDOUS",
        "name": "Rác Nguy Hại",
        "description": "Pin đã qua sử dụng, bóng đèn huỳnh quang, ắc quy, chai lọ hóa chất tẩy rửa.",
        "color_hex": "#ef4444",
        "icon_name": "alert-triangle",
        "bin_name": "Thùng đỏ / cam (Rác Nguy Hại)",
        "examples_hint": "Pin cũ, bóng huỳnh quang, ắc quy hỏng, lọ thuốc trừ sâu",
        "facility_filter": "recycling",
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

    # ==========================================
    # ADMIN CRUD METHODS
    # ==========================================
    @staticmethod
    async def admin_get_items(
        db: AsyncSession,
        query: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> WasteHandbookAdminListResponse:
        q = select(WasteHandbookItem)

        if is_active is not None:
            q = q.where(WasteHandbookItem.is_active == is_active)

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

        count_q = select(func.count()).select_from(q.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        q = q.order_by(WasteHandbookItem.created_at.desc()).limit(limit).offset(offset)
        res = await db.execute(q)
        items = res.scalars().all()

        out: List[WasteHandbookAdminItemResponse] = []
        for it in items:
            cat_meta = CAT_LOOKUP.get(it.category_code, CATEGORIES_META[3])
            out.append(
                WasteHandbookAdminItemResponse(
                    item_id=it.item_id,
                    name=it.name,
                    category_code=it.category_code,
                    category_name=cat_meta["name"],
                    category_color=cat_meta["color_hex"],
                    alternative_names=it.alternative_names,
                    image_url=it.image_url,
                    sorting_guide=it.sorting_guide,
                    bin_color=it.bin_color,
                    bin_name=it.bin_name,
                    safety_notes=it.safety_notes,
                    has_dedicated_station=it.has_dedicated_station,
                    is_active=it.is_active
                )
            )

        return WasteHandbookAdminListResponse(
            total=total,
            items=out
        )

    @staticmethod
    async def admin_create_item(
        db: AsyncSession,
        payload: WasteItemCreateRequest,
        admin_id: uuid.UUID
    ) -> WasteHandbookItem:
        # Determine item_id
        item_id = payload.item_id
        if not item_id or not item_id.strip():
            slug = re.sub(r'[^a-zA-Z0-9]+', '_', payload.name).strip('_').upper()
            item_id = f"ITEM_{slug[:30]}_{uuid.uuid4().hex[:6].upper()}"
        else:
            item_id = item_id.strip()

        exists = await db.get(WasteHandbookItem, item_id)
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã loại rác '{item_id}' đã tồn tại"
            )

        cat_meta = CAT_LOOKUP.get(payload.category_code.upper(), CATEGORIES_META[3])
        bin_color = payload.bin_color or cat_meta["color_hex"]
        bin_name = payload.bin_name or cat_meta["bin_name"]

        item = WasteHandbookItem(
            item_id=item_id,
            name=payload.name,
            category_code=payload.category_code.upper(),
            alternative_names=payload.alternative_names,
            image_url=payload.image_url,
            sorting_guide=payload.sorting_guide,
            bin_color=bin_color,
            bin_name=bin_name,
            safety_notes=payload.safety_notes,
            has_dedicated_station=payload.has_dedicated_station,
            is_active=payload.is_active,
        )
        db.add(item)

        # Audit log
        audit = AuditLog(
            user_id=admin_id,
            action="UPDATE_DATA",
            table_name="waste_handbook_items",
            record_id=item_id,
            old_data=None,
            new_data={"item_id": item_id, "name": item.name, "category_code": item.category_code},
            ip_address="127.0.0.1",
            user_agent="Admin Portal Waste Handbook Service",
            request_uri="/api/v1/waste-handbook/admin/items",
            is_suspicious=False
        )
        db.add(audit)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def admin_update_item(
        db: AsyncSession,
        item_id: str,
        payload: WasteItemUpdateRequest,
        admin_id: uuid.UUID
    ) -> WasteHandbookItem:
        item = await db.get(WasteHandbookItem, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy loại rác")

        old_snapshot = {
            "name": item.name,
            "category_code": item.category_code,
            "alternative_names": item.alternative_names,
            "sorting_guide": item.sorting_guide,
            "bin_color": item.bin_color,
            "bin_name": item.bin_name,
            "safety_notes": item.safety_notes,
            "has_dedicated_station": item.has_dedicated_station,
            "is_active": item.is_active
        }

        if payload.name is not None:
            item.name = payload.name
        if payload.category_code is not None:
            item.category_code = payload.category_code.upper()
            cat_meta = CAT_LOOKUP.get(item.category_code, CATEGORIES_META[3])
            if payload.bin_color is None and not item.bin_color:
                item.bin_color = cat_meta["color_hex"]
            if payload.bin_name is None and not item.bin_name:
                item.bin_name = cat_meta["bin_name"]
        if payload.alternative_names is not None:
            item.alternative_names = payload.alternative_names
        if payload.image_url is not None:
            item.image_url = payload.image_url
        if payload.sorting_guide is not None:
            item.sorting_guide = payload.sorting_guide
        if payload.bin_color is not None:
            item.bin_color = payload.bin_color
        if payload.bin_name is not None:
            item.bin_name = payload.bin_name
        if payload.safety_notes is not None:
            item.safety_notes = payload.safety_notes
        if payload.has_dedicated_station is not None:
            item.has_dedicated_station = payload.has_dedicated_station
        if payload.is_active is not None:
            item.is_active = payload.is_active

        new_snapshot = {
            "name": item.name,
            "category_code": item.category_code,
            "alternative_names": item.alternative_names,
            "sorting_guide": item.sorting_guide,
            "bin_color": item.bin_color,
            "bin_name": item.bin_name,
            "safety_notes": item.safety_notes,
            "has_dedicated_station": item.has_dedicated_station,
            "is_active": item.is_active
        }

        audit = AuditLog(
            user_id=admin_id,
            action="UPDATE_DATA",
            table_name="waste_handbook_items",
            record_id=item_id,
            old_data=old_snapshot,
            new_data=new_snapshot,
            ip_address="127.0.0.1",
            user_agent="Admin Portal Waste Handbook Service",
            request_uri=f"/api/v1/waste-handbook/admin/items/{item_id}",
            is_suspicious=False
        )
        db.add(audit)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def admin_delete_item(
        db: AsyncSession,
        item_id: str,
        admin_id: uuid.UUID
    ):
        item = await db.get(WasteHandbookItem, item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy loại rác")

        old_data = {"item_id": item.item_id, "name": item.name}
        await db.delete(item)

        audit = AuditLog(
            user_id=admin_id,
            action="UPDATE_DATA",
            table_name="waste_handbook_items",
            record_id=item_id,
            old_data=old_data,
            new_data={"status": "DELETED"},
            ip_address="127.0.0.1",
            user_agent="Admin Portal Waste Handbook Service",
            request_uri=f"/api/v1/waste-handbook/admin/items/{item_id}",
            is_suspicious=False
        )
        db.add(audit)
        await db.commit()

