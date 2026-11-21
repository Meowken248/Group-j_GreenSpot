"""
GreenSpot Domain Service: Penalty Regulations Service (Chức năng 11: Tra cứu quy định xử phạt)
[MOCK/STUB MODE]
Giữ nguyên Models/Schemas/Helpers để router và các component khác không bị gián đoạn.
"""

import math
import uuid
import unicodedata
import re
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.penalty import (
    PenaltySearchParams,
    PenaltySummaryItem,
    PenaltySearchResponse,
    PenaltyDetailResponse,
    CreatePenaltyReportRequest,
    UpdatePenaltyReportStatusRequest,
    PenaltyReportItem,
    PenaltyReportListResponse,
    PenaltyReportStatsResponse,
)


def remove_vietnamese_accents(text: str) -> str:
    if not text:
        return ""
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    return unicodedata.normalize("NFC", text).strip()


QUICK_CATEGORY_METADATA = {
    "Rác thải sinh hoạt": {
        "icon": "🗑️",
        "description": "Vứt rác vỉa hè, lòng đường, vứt tàn thuốc lá, không phân loại rác tại nguồn.",
    },
    "Rác công nghiệp/nguy hại": {
        "icon": "☢️",
        "description": "Chôn lấp chất thải nguy hại, đốt chất thải công nghiệp ngoài cơ sở được cấp phép.",
    },
    "Nước thải": {
        "icon": "💧",
        "description": "Xả nước thải sinh hoạt vào cống thoát nước mưa, xả trộm nước thải ra kênh rạch, sông suối.",
    },
    "Khí thải": {
        "icon": "🌫️",
        "description": "Thải khí thải công nghiệp nguy hại vượt chuẩn, đốt rác sinh hoạt lộ thiên gây khói bụi.",
    },
    "Tiếng ồn": {
        "icon": "📢",
        "description": "Gây tiếng ồn vượt quy chuẩn (karaoke loa kéo sau 22h, thi công máy móc công trường).",
    },
}


class PenaltyRegulationService:
    """Service tra cứu quy định pháp luật môi trường (STT 11) [MOCK/STUB MODE]"""

    async def search_regulations(
        self,
        session: AsyncSession,
        params: PenaltySearchParams,
    ) -> PenaltySearchResponse:
        """Mock/Stub: Tìm kiếm và lọc danh sách quy định xử phạt (STT 11)"""
        return PenaltySearchResponse(
            items=[],
            total=0,
            page=params.page,
            limit=params.limit,
            total_pages=1,
            target=params.target.upper(),
        )

    async def get_regulation_detail(
        self,
        session: AsyncSession,
        regulation_id: uuid.UUID,
        target: str = "INDIVIDUAL",
    ) -> Optional[PenaltyDetailResponse]:
        """Mock/Stub: Lấy chi tiết một điều khoản vi phạm (STT 11)"""
        return PenaltyDetailResponse(
            id=regulation_id,
            title="Quy định xử phạt mẫu (Mock)",
            domain="Rác thải sinh hoạt",
            quick_category="Rác thải sinh hoạt",
            target=target.upper(),
            min_fine=1000000,
            max_fine=2000000,
            avg_fine=1500000,
            description="Mô tả hành vi vi phạm mẫu",
            aggravating_circumstances="Tái phạm nhiều lần",
            supplementary_measures="Buộc khắc phục hậu quả",
            legal_basis="Nghị định 45/2022/NĐ-CP",
            effective_date=datetime.now(timezone.utc),
            amendment_warning=None,
            version=1,
        )

    async def get_quick_category_stats(
        self,
        session: AsyncSession,
    ) -> List[Dict[str, Any]]:
        """Mock/Stub: Lấy danh sách 5 lĩnh vực chuyên đề (STT 11)"""
        return [
            {
                "category_name": domain_name,
                "count": 0,
                "icon": meta["icon"],
                "description": meta["description"],
            }
            for domain_name, meta in QUICK_CATEGORY_METADATA.items()
        ]

    async def get_available_domains(
        self,
        session: AsyncSession,
    ) -> List[str]:
        """Mock/Stub: Danh sách các lĩnh vực chuyên đề (STT 11)"""
        return list(QUICK_CATEGORY_METADATA.keys())

    async def get_domain_counts(
        self,
        session: AsyncSession,
    ) -> Dict[str, int]:
        """Mock/Stub: Thống kê số lượng điều luật theo lĩnh vực (STT 11)"""
        return {k: 0 for k in QUICK_CATEGORY_METADATA}

    async def create_penalty_report(
        self,
        session: AsyncSession,
        data: CreatePenaltyReportRequest,
        reporter_id: Optional[uuid.UUID] = None,
        reporter_name: Optional[str] = None,
    ) -> PenaltyReportItem:
        """Mock/Stub: Tạo mới hồ sơ phản ánh vi phạm (STT 11)"""
        return PenaltyReportItem(
            id=uuid.uuid4(),
            tracking_code="INC-MOCK-001",
            penalty_id=data.penalty_id,
            violation_title=data.violation_title,
            legal_basis=data.legal_basis,
            fine_range=data.fine_range,
            address_text=data.address_text,
            description=data.description,
            is_anonymous=data.is_anonymous,
            reporter_id=reporter_id,
            reporter_name=reporter_name or "Công dân",
            status="PENDING",
            officer_note=None,
            created_at=datetime.now(timezone.utc),
            resolved_at=None,
            version=1,
        )

    async def get_penalty_reports(
        self,
        session: AsyncSession,
        status_filter: Optional[str] = None,
        query: Optional[str] = None,
        is_anonymous: Optional[bool] = None,
        page: int = 1,
        limit: int = 10,
    ) -> PenaltyReportListResponse:
        """Mock/Stub: Danh sách phản ánh vi phạm (STT 11)"""
        return PenaltyReportListResponse(
            items=[],
            total=0,
            page=page,
            limit=limit,
            total_pages=1,
        )

    async def get_penalty_report_stats(
        self,
        session: AsyncSession,
    ) -> PenaltyReportStatsResponse:
        """Mock/Stub: Thống kê tổng hợp số lượng phản ánh (STT 11)"""
        return PenaltyReportStatsResponse(
            total=0,
            pending=0,
            verified=0,
            resolved=0,
            rejected=0,
        )

    async def update_penalty_report_status(
        self,
        session: AsyncSession,
        report_id: uuid.UUID,
        data: UpdatePenaltyReportStatusRequest,
    ) -> Optional[PenaltyReportItem]:
        """Mock/Stub: Cập nhật trạng thái xử lý phản ánh (STT 11)"""
        return PenaltyReportItem(
            id=report_id,
            tracking_code="INC-MOCK-001",
            penalty_id=None,
            violation_title="Vi phạm mẫu",
            legal_basis="Nghị định 45/2022/NĐ-CP",
            fine_range="1.000.000đ - 2.000.000đ",
            address_text="Địa chỉ mẫu",
            description="Mô tả",
            is_anonymous=False,
            reporter_id=None,
            reporter_name="Công dân",
            status=data.status,
            officer_note=data.officer_note,
            created_at=datetime.now(timezone.utc),
            resolved_at=datetime.now(timezone.utc),
            version=2,
        )
