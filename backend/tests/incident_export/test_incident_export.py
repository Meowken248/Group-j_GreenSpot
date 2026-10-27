import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import AsyncMock, MagicMock

import pytest
import openpyxl
from reportlab.pdfgen import canvas

from app.interface.incident_export.incident_export_interface import IIncidentExportRepository
from app.models.incident_export.exported_file import ExportedIncidentFile
from app.schemas.incident_export.schemas import (
    IncidentExportFilterParams,
    TriggerExportRequest,
)
from app.services.incident_export.incident_export_service import (
    IncidentExportService,
    format_file_size,
)


class MockIncidentExportRepository(IIncidentExportRepository):
    """Giả lập Repository độc lập phục vụ kiểm thử đơn vị tầng Service"""

    def __init__(self, sample_data: Optional[List[Dict[str, Any]]] = None):
        self.sample_data = sample_data if sample_data is not None else [
            {
                "incident_id": str(uuid.uuid4()),
                "tracking_code": "SC-2026-081",
                "category_name": "Rác thải tự phát",
                "district_name": "Quận Bình Tân",
                "status": "Đang xử lý",
                "status_code": "IN_PROGRESS",
                "severity": "HIGH",
                "title": "Bãi rác tự phát lớn",
                "address_text": "123 Đường Số 7, Phường An Lạc, Bình Tân",
                "created_at": "26/10/2026 14:30",
            },
            {
                "incident_id": str(uuid.uuid4()),
                "tracking_code": "SC-2026-082",
                "category_name": "Ngập úng đô thị",
                "district_name": "Quận 6",
                "status": "Đã hoàn tất",
                "status_code": "RESOLVED",
                "severity": "CRITICAL",
                "title": "Ngập sâu ngã tư Hậu Giang",
                "address_text": "456 Đường Hậu Giang, Phường 11, Quận 6",
                "created_at": "26/10/2026 15:10",
            },
        ]
        self.files_db: Dict[uuid.UUID, ExportedIncidentFile] = {}

    async def get_preview_incidents(
        self, params: IncidentExportFilterParams
    ) -> Tuple[List[Dict[str, Any]], int]:
        filtered = self.sample_data
        if params.district and params.district != "Tất cả":
            filtered = [d for d in filtered if params.district.lower() in d["district_name"].lower()]
        if params.status and params.status != "Tất cả":
            filtered = [d for d in filtered if params.status == d["status"]]
        total = len(filtered)
        return filtered, total

    async def get_all_matching_incidents(
        self, params: IncidentExportFilterParams
    ) -> List[Dict[str, Any]]:
        filtered = self.sample_data
        if params.district and params.district != "Tất cả":
            filtered = [d for d in filtered if params.district.lower() in d["district_name"].lower()]
        return filtered

    async def save_exported_file(
        self, file_record: ExportedIncidentFile
    ) -> ExportedIncidentFile:
        self.files_db[file_record.export_id] = file_record
        return file_record

    async def get_exported_file_by_id(
        self, export_id: uuid.UUID
    ) -> Optional[ExportedIncidentFile]:
        return self.files_db.get(export_id)

    async def mark_as_downloaded(
        self, export_id: uuid.UUID
    ) -> Optional[ExportedIncidentFile]:
        rec = self.files_db.get(export_id)
        if rec:
            rec.is_downloaded = True
            rec.download_count += 1
        return rec

    async def get_available_districts(self) -> List[str]:
        return ["Quận Bình Tân", "Quận 6", "TP. Thủ Đức"]

    async def get_available_categories(self) -> List[str]:
        return ["Rác thải tự phát", "Ngập úng đô thị", "Xả khói bụi", "Ô nhiễm kênh rạch"]


# ==============================================================================
# BỘ TEST CASES TỰ ĐỘNG CHO STT 47 (XUẤT DANH SÁCH SỰ CỐ RA EXCEL/PDF THEO BỘ LỌC)
# ==============================================================================

@pytest.mark.asyncio
async def test_preview_incidents_success():
    """Màn 1/4: Áp dụng bộ lọc thành công và có dữ liệu -> Báo số lượng tìm thấy"""
    repo = MockIncidentExportRepository()
    service = IncidentExportService(repository=repo)

    params = IncidentExportFilterParams(
        district="Tất cả",
        category="Tất cả",
        status="Tất cả",
        page=1,
        page_size=10,
    )
    res = await service.preview_incidents(params)

    assert res.success is True
    assert res.total_records == 2
    assert "Tìm thấy 2 bản ghi sự cố phù hợp với bộ lọc." in res.message
    assert len(res.items) == 2
    assert res.items[0].tracking_code == "SC-2026-081"
    assert res.is_empty is False
    assert res.date_range_invalid is False


@pytest.mark.asyncio
async def test_preview_incidents_empty():
    """Màn 1/4 & Màn 4/4: Áp dụng bộ lọc không tìm thấy bản ghi nào -> Báo Không có dữ liệu"""
    repo = MockIncidentExportRepository(sample_data=[])
    service = IncidentExportService(repository=repo)

    params = IncidentExportFilterParams(
        district="Quận 1",
        category="Tất cả",
        page=1,
        page_size=10,
    )
    res = await service.preview_incidents(params)

    assert res.success is True
    assert res.total_records == 0
    assert res.is_empty is True
    assert "Không có dữ liệu sự cố nào phù hợp để xuất báo cáo." in res.message


@pytest.mark.asyncio
async def test_preview_incidents_invalid_date_range():
    """Màn 4/4: Cảnh báo đỏ khi Ngày bắt đầu > Ngày kết thúc"""
    repo = MockIncidentExportRepository()
    service = IncidentExportService(repository=repo)

    params = IncidentExportFilterParams(
        from_date="2026-10-28",
        to_date="2026-10-20",  # Ngày bắt đầu lớn hơn ngày kết thúc
    )
    res = await service.preview_incidents(params)

    assert res.date_range_invalid is True
    assert res.is_empty is True
    assert "Khoảng ngày không hợp lệ dẫn đến không có dữ liệu. Vui lòng kiểm tra lại." in res.message


@pytest.mark.asyncio
async def test_generate_export_excel_success():
    """Màn 2/4 & Màn 3/4: Xuất tệp Excel (.xlsx) chuẩn chỉnh kèm thời hạn 15 phút"""
    repo = MockIncidentExportRepository()
    service = IncidentExportService(repository=repo)

    req = TriggerExportRequest(
        export_format="EXCEL",
        district="Tất cả",
        category="Tất cả",
        status="Tất cả",
    )
    res = await service.generate_export(req)

    assert res.success is True
    assert res.file_type == "EXCEL"
    assert res.file_name.endswith(".xlsx")
    assert res.file_size_bytes > 0
    assert "BaoCao_SuCo_" in res.file_name
    assert "/api/v1/incidents/export/" in res.download_url
    assert res.is_expired is False

    # Kiểm tra thời hạn 15 phút
    now_utc = datetime.now(timezone.utc)
    diff = res.expires_at - now_utc
    assert 13 * 60 <= diff.total_seconds() <= 16 * 60

    # Kiểm tra tệp Excel thực tế sinh ra
    file_record = await repo.get_exported_file_by_id(uuid.UUID(res.export_id))
    assert file_record is not None
    assert os.path.exists(file_record.file_path)

    # Đọc tệp bằng openpyxl để kiểm chứng nội dung bảng
    wb = openpyxl.load_workbook(file_record.file_path)
    sheet = wb.active
    assert sheet.title == "Danh Sách Sự Cố"
    assert "BÁO CÁO TRÍCH XUẤT DANH SÁCH SỰ CỐ MÔI TRƯỜNG" in sheet["A2"].value
    # Dòng 8 là header, dòng 9 là bản ghi 1
    assert sheet["B9"].value == "SC-2026-081"
    assert sheet["C9"].value == "Rác thải tự phát"


@pytest.mark.asyncio
async def test_generate_export_pdf_success():
    """Màn 2/4 & Màn 3/4: Xuất tệp PDF (.pdf) chuẩn thể thức hành chính"""
    repo = MockIncidentExportRepository()
    service = IncidentExportService(repository=repo)

    req = TriggerExportRequest(
        export_format="PDF",
        district="Quận Bình Tân",
    )
    res = await service.generate_export(req)

    assert res.success is True
    assert res.file_type == "PDF"
    assert res.file_name.endswith(".pdf")
    assert res.file_size_bytes > 0

    file_record = await repo.get_exported_file_by_id(uuid.UUID(res.export_id))
    assert file_record is not None
    assert os.path.exists(file_record.file_path)


@pytest.mark.asyncio
async def test_generate_export_empty_data_raises_error():
    """Màn 4/4: Khởi tạo xuất khi không có dữ liệu sẽ báo lỗi ngăn chặn tệp trắng rỗng"""
    repo = MockIncidentExportRepository(sample_data=[])
    service = IncidentExportService(repository=repo)

    req = TriggerExportRequest(export_format="EXCEL")
    with pytest.raises(ValueError, match="Không có dữ liệu sự cố nào phù hợp để xuất báo cáo."):
        await service.generate_export(req)


@pytest.mark.asyncio
async def test_download_file_valid_and_expired_safeguard():
    """Màn 3/4: Kiểm tra tải tệp thành công và cơ chế vô hiệu hóa khi quá hạn 15 phút"""
    repo = MockIncidentExportRepository()
    service = IncidentExportService(repository=repo)

    req = TriggerExportRequest(export_format="EXCEL")
    created = await service.generate_export(req)
    export_uuid = uuid.UUID(created.export_id)

    # 1. Tải khi còn hạn (< 15 phút)
    file_path, file_name, mime_type = await service.get_download_file(export_uuid)
    assert os.path.exists(file_path)
    assert file_name.endswith(".xlsx")
    assert "openxmlformats" in mime_type

    status_res = await service.get_export_status(export_uuid)
    assert status_res.is_expired is False
    assert status_res.message == "ĐÃ TẠO TỆP. Tệp sẵn sàng tải về."

    # 2. Giả lập hết hạn 15 phút (expires_at lùi về quá khứ)
    record = await repo.get_exported_file_by_id(export_uuid)
    record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)

    status_expired = await service.get_export_status(export_uuid)
    assert status_expired.is_expired is True
    assert "Liên kết tải tệp đã hết hạn do chính sách bảo mật. Vui lòng xuất lại tệp." in status_expired.message

    # Tải khi hết hạn phải raise PermissionError (HTTP 410)
    with pytest.raises(PermissionError, match="Liên kết tải tệp đã hết hạn do chính sách bảo mật"):
        await service.get_download_file(export_uuid)


@pytest.mark.asyncio
async def test_get_metadata_options():
    """Màn 1/4: Cung cấp danh mục 22 quận/huyện, loại sự cố, trạng thái, quick_range"""
    repo = MockIncidentExportRepository()
    service = IncidentExportService(repository=repo)

    opts = await service.get_metadata_options()
    assert "Tất cả" in opts.districts
    assert "Quận Bình Tân" in opts.districts
    assert "Tất cả" in opts.categories
    assert "Rác thải tự phát" in opts.categories
    assert len(opts.statuses) == 5
    assert len(opts.quick_ranges) == 4


def test_format_file_size_utility():
    """Kiểm tra hàm format dung lượng tệp chuẩn xác"""
    assert format_file_size(500) == "500 B"
    assert format_file_size(1024 * 340) == "340.0 KB"
    assert format_file_size(1024 * 1024 * 2) == "2.0 MB"
