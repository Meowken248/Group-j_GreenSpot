"""
GreenSpot Domain Service: Penalty Regulations Service (Chức năng 11: Tra cứu quy định xử phạt)
Xử lý nghiệp vụ tra cứu văn bản pháp luật môi trường, bộ lọc chuyên đề, nhân đôi tiền phạt tổ chức.
"""

import math
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.penalty import PenaltyRegulation
from app.schemas.penalty import (
    PenaltySearchParams,
    PenaltySummaryItem,
    PenaltySearchResponse,
    PenaltyDetailResponse,
    QuickCategoryStat,
)

# Cấu hình danh mục nhanh Màn 1 với icon và mô tả thân thiện
QUICK_CATEGORY_METADATA = {
    "Xả rác": {
        "icon": "🗑️",
        "description": "Vứt rác sinh hoạt bừa bãi tại vỉa hè, lòng đường, công viên, kênh rạch.",
    },
    "Đốt rác": {
        "icon": "🔥",
        "description": "Đốt chất thải rắn sinh hoạt, rác công nghiệp, phụ phẩm nông nghiệp gây khói bụi.",
    },
    "Nước thải": {
        "icon": "💧",
        "description": "Xả nước thải bẩn, dầu mỡ, hóa chất vào cống nước mưa hoặc sông suối.",
    },
    "Tiếng ồn": {
        "icon": "📢",
        "description": "Gây tiếng ồn vượt quy chuẩn kỹ thuật (karaoke loa kéo, máy móc thi công).",
    },
}


class PenaltyRegulationService:
    """Service xử lý tra cứu quy định pháp luật môi trường (Nghị định 45/2022/NĐ-CP)"""

    async def search_regulations(
        self,
        session: AsyncSession,
        params: PenaltySearchParams,
    ) -> PenaltySearchResponse:
        """
        Tìm kiếm và lọc danh sách quy định xử phạt theo từ khóa, danh mục, lĩnh vực và đối tượng
        """
        filters = [PenaltyRegulation.deleted_at.is_(None)]

        # 1. Lọc theo từ khóa tìm kiếm (Full text search / Keyword matching)
        if params.query and params.query.strip():
            raw_query = params.query.strip()
            # Tách từ khóa và tìm kiếm trên tiêu đề, mô tả, từ khóa và căn cứ
            query_filter = or_(
                PenaltyRegulation.title.ilike(f"%{raw_query}%"),
                PenaltyRegulation.description.ilike(f"%{raw_query}%"),
                PenaltyRegulation.keywords.ilike(f"%{raw_query}%"),
                PenaltyRegulation.legal_basis.ilike(f"%{raw_query}%"),
            )
            filters.append(query_filter)

        # 2. Lọc theo mảng chuyên đề / Lĩnh vực môi trường (Màn 2)
        if params.domain and params.domain.strip():
            filters.append(PenaltyRegulation.domain == params.domain.strip())

        # 3. Lọc theo danh mục truy cập nhanh (Màn 1)
        if params.quick_category and params.quick_category.strip():
            filters.append(PenaltyRegulation.quick_category == params.quick_category.strip())

        # Tính tổng số kết quả
        count_stmt = select(func.count(PenaltyRegulation.id)).where(and_(*filters))
        total_result = await session.execute(count_stmt)
        total = total_result.scalar_one()

        # Phân trang
        offset = (params.page - 1) * params.limit
        stmt = (
            select(PenaltyRegulation)
            .where(and_(*filters))
            .order_by(PenaltyRegulation.title.asc())
            .offset(offset)
            .limit(params.limit)
        )
        records = (await session.execute(stmt)).scalars().all()

        is_org = params.target.upper() == "ORGANIZATION"

        items: List[PenaltySummaryItem] = []
        for reg in records:
            min_fine = reg.min_fine_organization if is_org else reg.min_fine_individual
            max_fine = reg.max_fine_organization if is_org else reg.max_fine_individual
            avg_fine = reg.avg_fine_organization if is_org else reg.avg_fine_individual

            items.append(
                PenaltySummaryItem(
                    id=reg.id,
                    title=reg.title,
                    domain=reg.domain,
                    quick_category=reg.quick_category,
                    target=params.target.upper(),
                    displayed_min_fine=min_fine,
                    displayed_max_fine=max_fine,
                    displayed_avg_fine=avg_fine,
                    legal_basis=reg.legal_basis,
                    amendment_warning=reg.amendment_warning,
                )
            )

        total_pages = math.ceil(total / params.limit) if total > 0 else 1

        return PenaltySearchResponse(
            items=items,
            total=total,
            page=params.page,
            limit=params.limit,
            total_pages=total_pages,
            target=params.target.upper(),
        )

    async def get_regulation_detail(
        self,
        session: AsyncSession,
        regulation_id: uuid.UUID,
        target: str = "INDIVIDUAL",
    ) -> Optional[PenaltyDetailResponse]:
        """
        Lấy thông tin chi tiết đầy đủ 3 khối của một điều khoản vi phạm (Màn 3)
        """
        stmt = select(PenaltyRegulation).where(
            PenaltyRegulation.id == regulation_id,
            PenaltyRegulation.deleted_at.is_(None),
        )
        reg = (await session.execute(stmt)).scalars().first()
        if not reg:
            return None

        is_org = target.upper() == "ORGANIZATION"
        min_fine = reg.min_fine_organization if is_org else reg.min_fine_individual
        max_fine = reg.max_fine_organization if is_org else reg.max_fine_individual
        avg_fine = reg.avg_fine_organization if is_org else reg.avg_fine_individual

        return PenaltyDetailResponse(
            id=reg.id,
            title=reg.title,
            domain=reg.domain,
            quick_category=reg.quick_category,
            target=target.upper(),
            min_fine=min_fine,
            max_fine=max_fine,
            avg_fine=avg_fine,
            description=reg.description,
            aggravating_circumstances=reg.aggravating_circumstances,
            supplementary_measures=reg.supplementary_measures,
            legal_basis=reg.legal_basis,
            effective_date=reg.effective_date,
            amendment_warning=reg.amendment_warning,
            version=reg.version,
        )

    async def get_quick_category_stats(
        self,
        session: AsyncSession,
    ) -> List[Dict[str, Any]]:
        """
        Lấy danh sách 4 danh mục phổ biến Màn 1 kèm số lượng điều khoản thực tế
        """
        results = []
        for cat_name, meta in QUICK_CATEGORY_METADATA.items():
            stmt = select(func.count(PenaltyRegulation.id)).where(
                PenaltyRegulation.quick_category == cat_name,
                PenaltyRegulation.deleted_at.is_(None),
            )
            count = (await session.execute(stmt)).scalar_one()
            results.append({
                "category_name": cat_name,
                "count": count,
                "icon": meta["icon"],
                "description": meta["description"],
            })
        return results

    async def get_available_domains(
        self,
        session: AsyncSession,
    ) -> List[str]:
        """
        Lấy danh sách các lĩnh vực chuyên đề có trong hệ thống phục vụ bộ lọc Màn 2
        """
        stmt = (
            select(PenaltyRegulation.domain)
            .where(PenaltyRegulation.deleted_at.is_(None))
            .distinct()
            .order_by(PenaltyRegulation.domain.asc())
        )
        domains = (await session.execute(stmt)).scalars().all()
        return list(domains)
