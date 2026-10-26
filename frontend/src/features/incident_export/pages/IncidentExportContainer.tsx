import React, { useCallback, useEffect, useRef, useState } from "react";
import { IncidentExportHeader } from "../components/IncidentExportHeader";
import { IncidentExportFooter } from "../components/IncidentExportFooter";
import {
  IncidentExportConsole,
  ConsoleImperativeHandle,
} from "../components/IncidentExportConsole";
import { ExportFormatModal } from "../components/ExportFormatModal";
import { ExportSuccessModal } from "../components/ExportSuccessModal";
import { ExportEmptyWarningModal } from "../components/ExportEmptyWarningModal";
import { incidentExportApi } from "../services/incidentExportApi";
import type {
  ExportCreatedResponse,
  ExportFormatType,
  ExportMetadataOptionsResponse,
  ExportModalState,
  IncidentExportFilterParams,
  IncidentPreviewItem,
} from "../types/incident_export.types";
import "../styles/incident_export.scss";

const DEFAULT_METADATA: ExportMetadataOptionsResponse = {
  districts: [
    "Tất cả",
    "Quận 1",
    "Quận 3",
    "Quận 4",
    "Quận 5",
    "Quận 6",
    "Quận 7",
    "Quận 8",
    "Quận 10",
    "Quận 11",
    "Quận 12",
    "Quận Bình Tân",
    "Quận Bình Thạnh",
    "Quận Gò Vấp",
    "Quận Phú Nhuận",
    "Quận Tân Bình",
    "Quận Tân Phú",
    "TP. Thủ Đức",
    "Huyện Bình Chánh",
    "Huyện Cần Giờ",
    "Huyện Củ Chi",
    "Huyện Hóc Môn",
    "Huyện Nhà Bè",
  ],
  categories: [
    "Tất cả",
    "Rác thải tự phát",
    "Ngập úng đô thị",
    "Xả khói bụi",
    "Ô nhiễm kênh rạch",
  ],
  statuses: [
    { value: "Tất cả", label: "Tất cả" },
    { value: "Chờ tiếp nhận", label: "Chờ tiếp nhận" },
    { value: "Đang xử lý", label: "Đang xử lý" },
    { value: "Đã hoàn tất", label: "Đã hoàn tất" },
    { value: "Đã đóng", label: "Đã đóng" },
  ],
  quick_ranges: [
    { value: "TODAY", label: "Hôm nay" },
    { value: "THIS_WEEK", label: "Tuần này" },
    { value: "THIS_MONTH", label: "Tháng này" },
    { value: "THIS_QUARTER", label: "Quý này" },
  ],
};

export const IncidentExportContainer: React.FC = () => {
  const consoleRef = useRef<ConsoleImperativeHandle>(null);

  // 1. Dữ liệu bộ lọc & Tùy chọn
  const [filterOptions, setFilterOptions] =
    useState<ExportMetadataOptionsResponse>(DEFAULT_METADATA);
  const [filterParams, setFilterParams] = useState<IncidentExportFilterParams>({
    district: "Tất cả",
    category: "Tất cả",
    status: "Tất cả",
    page: 1,
    page_size: 10,
  });

  // 2. Dữ liệu bảng xem trước
  const [items, setItems] = useState<IncidentPreviewItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateRangeInvalid, setDateRangeInvalid] = useState<boolean>(false);

  // 3. Trạng thái Modal (Màn 2/4, 3/4, 4/4)
  const [modalState, setModalState] = useState<ExportModalState>("NONE");
  const [exportResult, setExportResult] = useState<ExportCreatedResponse | null>(null);

  // Tải danh mục dropdown ban đầu
  useEffect(() => {
    let isMounted = true;
    incidentExportApi
      .getFilterOptions()
      .then((opts) => {
        if (isMounted && opts && opts.districts) {
          setFilterOptions(opts);
        }
      })
      .catch(() => {
        // Fallback dùng DEFAULT_METADATA nếu API chưa kết nối CSDL
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Hàm thực thi truy vấn dữ liệu theo bộ lọc
  const executeQuery = useCallback(
    async (paramsToQuery: IncidentExportFilterParams) => {
      setIsLoading(true);
      setErrorMessage(null);
      setDateRangeInvalid(false);

      try {
        const res = await incidentExportApi.previewIncidents(paramsToQuery);

        if (res.date_range_invalid) {
          setDateRangeInvalid(true);
          setItems([]);
          setTotalRecords(0);
          setTotalPages(0);
          return;
        }

        setItems(res.items || []);
        setTotalRecords(res.total_records || 0);
        setTotalPages(res.total_pages || 0);
        setCurrentPage(res.page || 1);
      } catch {
        setErrorMessage("Lỗi truy vấn danh sách sự cố. Vui lòng thử lại sau ít phút.");
        setItems([]);
        setTotalRecords(0);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Tự động tải dữ liệu lần đầu
  useEffect(() => {
    executeQuery(filterParams);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Xử lý thay đổi từng tham số bộ lọc
  const handleFilterChange = (newValues: Partial<IncidentExportFilterParams>) => {
    setFilterParams((prev) => ({ ...prev, ...newValues, page: 1 }));
  };

  // Bấm nút "Áp dụng" ở Cột 1
  const handleApplyFilter = () => {
    executeQuery({ ...filterParams, page: 1 });
  };

  // Đổi trang
  const handlePageChange = (newPage: number) => {
    const updated = { ...filterParams, page: newPage };
    setFilterParams(updated);
    executeQuery(updated);
  };

  // Mở modal Màn 2/4 (Xác nhận định dạng) khi bảng có dữ liệu
  const handleOpenExportModal = () => {
    setModalState("FORMAT_SELECT");
  };

  // Mở modal Màn 4/4 (Cảnh báo không có dữ liệu) khi bảng rỗng
  const handleOpenEmptyModal = () => {
    setModalState("EMPTY_WARNING");
  };

  // Đóng modal an toàn
  const handleCloseModal = () => {
    setModalState("NONE");
  };

  // Màn 2/4 -> Màn 3/4: Khởi tạo xuất tệp trên máy chủ
  const handleConfirmExport = async (format: ExportFormatType) => {
    try {
      const res = await incidentExportApi.generateExport({
        export_format: format,
        district: filterParams.district !== "Tất cả" ? filterParams.district : undefined,
        category: filterParams.category !== "Tất cả" ? filterParams.category : undefined,
        status: filterParams.status !== "Tất cả" ? filterParams.status : undefined,
        from_date: filterParams.from_date,
        to_date: filterParams.to_date,
        quick_range: filterParams.quick_range,
      });

      setExportResult(res);
      setModalState("DOWNLOAD_SUCCESS"); // Chuyển sang Màn 3/4 (Đã tạo tệp)
    } catch (err: any) {
      const errDetail = err?.response?.data?.detail || "Lỗi khởi tạo tệp xuất dữ liệu.";
      if (errDetail.includes("Không có dữ liệu")) {
        setModalState("EMPTY_WARNING");
      } else {
        alert(errDetail);
        setModalState("NONE");
      }
    }
  };

  // Tự động focus con trỏ vào ô chọn bộ lọc sau khi đóng Modal Màn 4/4
  const handleFocusFilterField = (fieldName: "district" | "date") => {
    if (fieldName === "date") {
      consoleRef.current?.focusDate();
    } else {
      consoleRef.current?.focusDistrict();
    }
  };

  return (
    <div className="export-console-container" data-testid="export-console-container">
      {/* Header chuẩn */}
      <IncidentExportHeader activeTab="export" />

      {/* Giao diện chính 3 Cột (Màn 1/4) */}
      <IncidentExportConsole
        ref={consoleRef}
        filterOptions={filterOptions}
        filterParams={filterParams}
        onFilterChange={handleFilterChange}
        onApplyFilter={handleApplyFilter}
        items={items}
        totalRecords={totalRecords}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onOpenExportModal={handleOpenExportModal}
        onOpenEmptyModal={handleOpenEmptyModal}
      />

      {/* Màn 2/4: Modal Popup "XUẤT DANH SÁCH" */}
      <ExportFormatModal
        isOpen={modalState === "FORMAT_SELECT"}
        onClose={handleCloseModal}
        onConfirmExport={handleConfirmExport}
        filterParams={filterParams}
        totalRecords={totalRecords}
      />

      {/* Màn 3/4: Modal Popup "ĐÃ TẠO TỆP" */}
      <ExportSuccessModal
        isOpen={modalState === "DOWNLOAD_SUCCESS"}
        onClose={handleCloseModal}
        exportResult={exportResult}
      />

      {/* Màn 4/4: Modal Popup "KHÔNG CÓ DỮ LIỆU" */}
      <ExportEmptyWarningModal
        isOpen={modalState === "EMPTY_WARNING"}
        onClose={handleCloseModal}
        dateRangeInvalid={dateRangeInvalid}
        onFocusFilterField={handleFocusFilterField}
      />

      {/* Footer chuẩn */}
      <IncidentExportFooter />
    </div>
  );
};
