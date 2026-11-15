import uuid
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

from app.models.incident_export.exported_file import ExportedIncidentFile
from app.schemas.incident_export.schemas import IncidentExportFilterParams


class IIncidentExportRepository(ABC):
    """
    Interface trừu tượng cho tầng truy xuất dữ liệu sự cố và lưu trữ tệp xuất báo cáo.
    Tuân thủ Clean Architecture & Dependency Inversion Principle (DIP).
    """

    @abstractmethod
    async def get_preview_incidents(
        self, params: IncidentExportFilterParams
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Lấy danh sách xem trước phân trang cho Màn 1/4 (Cột giữa).
        Trả về: (Danh sách sự cố, Tổng số bản ghi thỏa điều kiện).
        """
        pass

    @abstractmethod
    async def get_all_matching_incidents(
        self, params: IncidentExportFilterParams
    ) -> List[Dict[str, Any]]:
        """
        Lấy toàn bộ danh sách sự cố khớp với bộ lọc để tạo tệp báo cáo Excel/PDF (không phân trang).
        """
        pass

    @abstractmethod
    async def save_exported_file(
        self, file_record: ExportedIncidentFile
    ) -> ExportedIncidentFile:
        """
        Lưu thông tin tệp đã tạo thành công vào CSDL.
        """
        pass

    @abstractmethod
    async def get_exported_file_by_id(
        self, export_id: uuid.UUID
    ) -> Optional[ExportedIncidentFile]:
        """
        Truy vấn thông tin tệp xuất theo export_id.
        """
        pass

    @abstractmethod
    async def mark_as_downloaded(
        self, export_id: uuid.UUID
    ) -> Optional[ExportedIncidentFile]:
        """
        Cập nhật trạng thái và số lần tải xuống của tệp.
        """
        pass

    @abstractmethod
    async def get_available_districts(self) -> List[str]:
        """
        Lấy danh sách 22 quận/huyện và TP. Thủ Đức phục vụ bộ lọc.
        """
        pass

    @abstractmethod
    async def get_available_categories(self) -> List[str]:
        """
        Lấy danh mục sự cố môi trường phục vụ bộ lọc.
        """
        pass
