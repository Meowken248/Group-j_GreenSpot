import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.incident_export.incident_export_interface import IIncidentExportRepository
from app.models.incident_export.exported_file import ExportedIncidentFile
from app.schemas.incident_export.schemas import IncidentExportFilterParams


STATUS_MAPPING = {
    "Chờ tiếp nhận": "PENDING",
    "Đang xử lý": "IN_PROGRESS",
    "Đã hoàn tất": "RESOLVED",
    "Đã đóng": "CLOSED",
    "PENDING": "PENDING",
    "IN_PROGRESS": "IN_PROGRESS",
    "RESOLVED": "RESOLVED",
    "CLOSED": "CLOSED",
}

STATUS_DISPLAY_MAPPING = {
    "PENDING": "Chờ tiếp nhận",
    "IN_PROGRESS": "Đang xử lý",
    "RESOLVED": "Đã hoàn tất",
    "CLOSED": "Đã đóng",
}

DEFAULT_DISTRICTS = [
    "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8",
    "Quận 10", "Quận 11", "Quận 12", "Quận Bình Tân", "Quận Bình Thạnh",
    "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú",
    "TP. Thủ Đức", "Huyện Bình Chánh", "Huyện Cần Giờ", "Huyện Củ Chi",
    "Huyện Hóc Môn", "Huyện Nhà Bè"
]

DEFAULT_CATEGORIES = [
    "Rác thải tự phát",
    "Ngập úng đô thị",
    "Xả khói bụi",
    "Ô nhiễm kênh rạch"
]


class IncidentExportRepository(IIncidentExportRepository):
    """
    Hiện thực hóa việc truy vấn CSDL cho tính năng trích xuất sự cố.
    Sử dụng Explicit SQL và Parameter Bindings chuẩn hóa.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    def _build_filter_conditions(
        self, params: IncidentExportFilterParams
    ) -> Tuple[str, Dict[str, Any]]:
        where_clauses = ["i.deleted_at IS NULL"]
        bind_params: Dict[str, Any] = {}

        # 1. Lọc theo Quận/Huyện
        if params.district and params.district.strip() and params.district.strip().lower() != "tất cả":
            clean_district = params.district.strip()
            where_clauses.append(
                "(au.name ILIKE :district OR i.address_text ILIKE :district_like)"
            )
            bind_params["district"] = f"%{clean_district}%"
            bind_params["district_like"] = f"%{clean_district}%"

        # 2. Lọc theo Loại/Danh mục
        if params.category and params.category.strip() and params.category.strip().lower() != "tất cả":
            clean_category = params.category.strip()
            where_clauses.append("(wc.name ILIKE :category OR wc.category_code ILIKE :category)")
            bind_params["category"] = f"%{clean_category}%"

        # 3. Lọc theo Trạng thái
        if params.status and params.status.strip() and params.status.strip().lower() != "tất cả":
            raw_status = params.status.strip()
            mapped_status = STATUS_MAPPING.get(raw_status, raw_status)
            where_clauses.append("i.status = :status")
            bind_params["status"] = mapped_status

        # 4. Lọc theo Khoảng thời gian
        if params.from_date and params.from_date.strip():
            where_clauses.append("i.created_at >= :from_date")
            bind_params["from_date"] = f"{params.from_date.strip()} 00:00:00"

        if params.to_date and params.to_date.strip():
            where_clauses.append("i.created_at <= :to_date")
            bind_params["to_date"] = f"{params.to_date.strip()} 23:59:59"

        where_sql = " AND ".join(where_clauses)
        return where_sql, bind_params

    async def get_preview_incidents(
        self, params: IncidentExportFilterParams
    ) -> Tuple[List[Dict[str, Any]], int]:
        where_sql, bind_params = self._build_filter_conditions(params)

        # Đếm tổng số bản ghi
        count_sql = text(f"""
            SELECT COUNT(i.incident_id) AS total_count
            FROM incidents i
            LEFT JOIN waste_categories wc ON i.category_id = wc.category_id
            LEFT JOIN administrative_units au ON i.unit_id = au.unit_id
            WHERE {where_sql}
        """)
        count_result = await self.session.execute(count_sql, bind_params)
        total_count = count_result.scalar_one_or_none() or 0

        if total_count == 0:
            return [], 0

        # Lấy dữ liệu xem trước theo phân trang
        offset = (params.page - 1) * params.page_size
        pagination_params = {**bind_params, "limit": params.page_size, "offset": offset}

        data_sql = text(f"""
            SELECT 
                i.incident_id,
                i.tracking_code,
                COALESCE(wc.name, 'Chung') AS category_name,
                COALESCE(au.name, 'Quận Bình Tân') AS district_name,
                i.status,
                i.title,
                i.address_text,
                i.created_at
            FROM incidents i
            LEFT JOIN waste_categories wc ON i.category_id = wc.category_id
            LEFT JOIN administrative_units au ON i.unit_id = au.unit_id
            WHERE {where_sql}
            ORDER BY i.created_at DESC
            LIMIT :limit OFFSET :offset
        """)

        data_result = await self.session.execute(data_sql, pagination_params)
        rows = data_result.fetchall()

        items: List[Dict[str, Any]] = []
        for r in rows:
            status_code = str(r.status)
            status_display = STATUS_DISPLAY_MAPPING.get(status_code, status_code)
            items.append({
                "incident_id": str(r.incident_id),
                "tracking_code": str(r.tracking_code),
                "category_name": str(r.category_name),
                "district_name": str(r.district_name),
                "status": status_display,
                "status_code": status_code,
                "title": str(r.title or ""),
                "address_text": str(r.address_text or ""),
                "created_at": r.created_at.strftime("%d/%m/%Y %H:%M") if r.created_at else "",
            })

        return items, total_count

    async def get_all_matching_incidents(
        self, params: IncidentExportFilterParams
    ) -> List[Dict[str, Any]]:
        where_sql, bind_params = self._build_filter_conditions(params)

        export_sql = text(f"""
            SELECT 
                i.incident_id,
                i.tracking_code,
                COALESCE(wc.name, 'Chung') AS category_name,
                COALESCE(au.name, 'Quận Bình Tân') AS district_name,
                i.status,
                i.severity,
                i.title,
                i.address_text,
                i.created_at
            FROM incidents i
            LEFT JOIN waste_categories wc ON i.category_id = wc.category_id
            LEFT JOIN administrative_units au ON i.unit_id = au.unit_id
            WHERE {where_sql}
            ORDER BY i.created_at DESC
        """)

        result = await self.session.execute(export_sql, bind_params)
        rows = result.fetchall()

        items: List[Dict[str, Any]] = []
        for r in rows:
            status_code = str(r.status)
            status_display = STATUS_DISPLAY_MAPPING.get(status_code, status_code)
            items.append({
                "incident_id": str(r.incident_id),
                "tracking_code": str(r.tracking_code),
                "category_name": str(r.category_name),
                "district_name": str(r.district_name),
                "status": status_display,
                "status_code": status_code,
                "severity": str(r.severity or "MEDIUM"),
                "title": str(r.title or ""),
                "address_text": str(r.address_text or ""),
                "created_at": r.created_at.strftime("%d/%m/%Y %H:%M") if r.created_at else "",
            })

        return items

    async def save_exported_file(
        self, file_record: ExportedIncidentFile
    ) -> ExportedIncidentFile:
        self.session.add(file_record)
        await self.session.commit()
        await self.session.refresh(file_record)
        return file_record

    async def get_exported_file_by_id(
        self, export_id: uuid.UUID
    ) -> Optional[ExportedIncidentFile]:
        query = text("""
            SELECT * FROM exported_incident_files
            WHERE export_id = :export_id AND deleted_at IS NULL
        """)
        # Hoặc dùng session.get để lấy ORM instance
        return await self.session.get(ExportedIncidentFile, export_id)

    async def mark_as_downloaded(
        self, export_id: uuid.UUID
    ) -> Optional[ExportedIncidentFile]:
        record = await self.session.get(ExportedIncidentFile, export_id)
        if record:
            record.is_downloaded = True
            record.download_count += 1
            await self.session.commit()
            await self.session.refresh(record)
        return record

    async def get_available_districts(self) -> List[str]:
        try:
            sql = text("""
                SELECT DISTINCT name 
                FROM administrative_units 
                WHERE level IN ('DISTRICT', 'CITY', 'COUNTY') OR name ILIKE '%quận%' OR name ILIKE '%huyện%' OR name ILIKE '%thủ đức%'
                ORDER BY name ASC
            """)
            result = await self.session.execute(sql)
            districts = [row[0] for row in result.fetchall() if row[0]]
            if len(districts) >= 10:
                return districts
        except Exception:
            pass
        return DEFAULT_DISTRICTS

    async def get_available_categories(self) -> List[str]:
        try:
            sql = text("""
                SELECT DISTINCT name 
                FROM waste_categories 
                WHERE is_active = TRUE
                ORDER BY name ASC
            """)
            result = await self.session.execute(sql)
            cats = [row[0] for row in result.fetchall() if row[0]]
            if cats:
                return cats
        except Exception:
            pass
        return DEFAULT_CATEGORIES
