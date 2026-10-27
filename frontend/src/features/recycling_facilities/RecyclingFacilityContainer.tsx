import React, { useState, useEffect, useCallback } from "react";
import type {
  RecyclingFacilityItem,
  RecyclingFacilityCreateRequest,
  RecyclingFacilityUpdateRequest,
  DistrictItem,
} from "./types/recyclingFacility.types";
import {
  fetchRecyclingFacilities,
  fetchFacilityDetail,
  createRecyclingFacility,
  updateRecyclingFacility,
  deleteRecyclingFacility,
  fetchHcmcDistricts,
} from "./services/recyclingFacilityService";
import { FacilityFilterPanel } from "./components/FacilityFilterPanel";
import { FacilityListPanel } from "./components/FacilityListPanel";
import { FacilityActionPanel } from "./components/FacilityActionPanel";
import { FacilityFormView } from "./components/FacilityFormView";
import { FacilityDeleteConfirmModal } from "./components/FacilityDeleteConfirmModal";
import { FacilityDeleteSuccessModal } from "./components/FacilityDeleteSuccessModal";
import { FacilityQRCodeModal } from "./components/FacilityQRCodeModal";
import { UnsavedFacilityModal } from "./components/UnsavedFacilityModal";
import "./RecyclingFacility.scss";

interface RecyclingFacilityContainerProps {
  currentUser?: { role?: string; email?: string } | null;
  onNavigateHome?: () => void;
}

export const RecyclingFacilityContainer: React.FC<RecyclingFacilityContainerProps> = ({
  currentUser,
  onNavigateHome,
}) => {
  // 1. Phân quyền Admin
  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";

  // 2. Chế độ hiển thị màn hình: list (Màn 1) | create (Màn 2) | edit (Màn 3)
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [selectedFacility, setSelectedFacility] =
    useState<RecyclingFacilityItem | null>(null);

  // 3. Trạng thái danh sách Màn 1
  const [facilities, setFacilities] = useState<RecyclingFacilityItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 4. Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [selectedUnitId, setSelectedUnitId] = useState<number | undefined>(
    undefined
  );

  // 5. Phân trang (10 mục / trang)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [inactiveCount, setInactiveCount] = useState<number>(0);
  const pageSize = 10;

  // 6. Trạng thái Modals
  const [deletingFacility, setDeletingFacility] =
    useState<RecyclingFacilityItem | null>(null);
  const [deletedFacilitySuccess, setDeletedFacilitySuccess] =
    useState<RecyclingFacilityItem | null>(null);
  const [qrModalFacility, setQrModalFacility] =
    useState<RecyclingFacilityItem | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);

  // 7. Toast thông báo (3s)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success"
  );

  const showToast = useCallback(
    (msg: string, type: "success" | "error" | "info" = "success") => {
      setToastMessage(msg);
      setToastType(type);
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    },
    []
  );

  // 8. Tải danh sách quận/huyện TP.HCM
  useEffect(() => {
    if (!isAdmin) return;
    const loadDistricts = async () => {
      try {
        const data = await fetchHcmcDistricts();
        setDistricts(data);
      } catch (err) {
        console.error("Không thể tải danh sách quận/huyện:", err);
      }
    };
    loadDistricts();
  }, [isAdmin]);

  // 9. Tải danh sách trạm từ Server
  const fetchFacilities = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchRecyclingFacilities({
        page: currentPage,
        limit: pageSize,
        search: search.trim() || undefined,
        status: statusFilter,
        unit_id: selectedUnitId,
      });

      setFacilities(res.items);
      setTotalPages(res.total_pages || 1);
      setTotalCount(res.total || 0);
      setActiveCount(res.active_count || 0);
      setInactiveCount(res.inactive_count || 0);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Không thể tải danh sách trạm tái chế. Vui lòng thử lại";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentPage, search, statusFilter, selectedUnitId]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  // Nếu không có quyền Admin -> hiển thị màn hình từ chối
  if (!isAdmin) {
    return (
      <div className="recycling-facility-denied-container">
        <div className="access-denied-card">
          <div className="denied-icon">🚫</div>
          <h2 className="denied-title">Truy cập bị từ chối</h2>
          <p className="denied-message">
            Bạn không có quyền truy cập chức năng này. Chức năng Quản trị Mạng lưới Trạm Tái chế & Điểm Tiếp nhận chỉ dành cho tài khoản Quản trị viên (Admin).
          </p>
          {onNavigateHome && (
            <button
              type="button"
              className="btn-back-home"
              onClick={onNavigateHome}
            >
              ⬅️ Quay về bản đồ WebGIS
            </button>
          )}
        </div>
      </div>
    );
  }

  // Xử lý bộ lọc
  const handleApplyFilter = (
    newSearch: string,
    newStatus: "ALL" | "ACTIVE" | "INACTIVE",
    newUnitId?: number
  ) => {
    setSearch(newSearch);
    setStatusFilter(newStatus);
    setSelectedUnitId(newUnitId);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearch("");
    setStatusFilter("ALL");
    setSelectedUnitId(undefined);
    setCurrentPage(1);
  };

  // Mở Màn 2: Thêm mới
  const handleOpenCreate = () => {
    setSelectedFacility(null);
    setViewMode("create");
  };

  // Mở Màn 3: Sửa
  const handleOpenEdit = (item: RecyclingFacilityItem) => {
    setSelectedFacility(item);
    setViewMode("edit");
  };

  // Xem/In mã QR
  const handleViewQR = (item: RecyclingFacilityItem) => {
    setQrModalFacility(item);
  };

  // Hủy form tạo/sửa
  const handleCancelForm = (hasChanges: boolean) => {
    if (hasChanges) {
      setShowUnsavedModal(true);
    } else {
      setViewMode("list");
      setSelectedFacility(null);
    }
  };

  // Lưu tạo mới (Màn 2)
  const handleSaveCreate = async (data: RecyclingFacilityCreateRequest) => {
    const created = await createRecyclingFacility(data);
    showToast(`Đã thêm trạm ${created.name} (${created.facility_code}) thành công`, "success");
    setViewMode("list");
    setSelectedFacility(null);
    setCurrentPage(1); // Trở về trang 1 để trạm mới nằm đầu danh sách
    fetchFacilities();
  };

  // Lưu cập nhật (Màn 3)
  const handleSaveUpdate = async (
    id: number,
    data: RecyclingFacilityUpdateRequest
  ) => {
    await updateRecyclingFacility(id, data);
    showToast("Đã cập nhật thông tin trạm thành công", "success");
    setViewMode("list");
    setSelectedFacility(null);
    fetchFacilities();
  };

  // Nạp lại chi tiết trạm khi xảy ra xung đột version (Optimistic locking 409)
  const handleReloadFacility = async () => {
    if (!selectedFacility) return;
    try {
      const refreshed = await fetchFacilityDetail(selectedFacility.facility_id);
      setSelectedFacility(refreshed);
      showToast("Đã tải lại dữ liệu mới nhất từ máy chủ", "info");
    } catch {
      fetchFacilities();
    }
  };

  // Mở popup xác nhận xóa (Màn 4)
  const handleOpenDelete = (item: RecyclingFacilityItem) => {
    setDeletingFacility(item);
  };

  // Xác nhận xóa mềm
  const handleConfirmDelete = async (id: number) => {
    await deleteRecyclingFacility(id);
    const deleted = deletingFacility;
    setDeletingFacility(null);
    // Chuyển sang Màn 5 popup thành công
    setDeletedFacilitySuccess(deleted);
  };

  // Đóng Màn 5
  const handleCloseDeleteSuccess = () => {
    setDeletedFacilitySuccess(null);
    // Quy tắc: sau khi xóa, nếu trang hiện tại bị rỗng và > 1 thì lùi về trang trước
    if (facilities.length <= 1 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    } else {
      fetchFacilities();
    }
  };

  return (
    <div className="recycling-facility-management-root">
      {/* TOAST THÔNG BÁO TỔNG THỂ */}
      {toastMessage && (
        <div className={`facility-toast-banner ${toastType}`} role="status">
          <span className="toast-icon">
            {toastType === "success" ? "✅" : toastType === "error" ? "❌" : "ℹ️"}
          </span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION TIÊU ĐỀ KHUNG */}
      <header className="recycling-facility-header">
        <div className="header-breadcrumbs">
          <span className="crumb-root">Hệ thống Quản trị</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Mạng lưới Trạm Tái chế & Điểm Tiếp nhận</span>
        </div>
        <div className="header-title-bar">
          <h1 className="header-title">
            <span className="title-icon">♻️</span>
            Quản trị Mạng lưới Trạm Tái chế & Điểm Tiếp nhận
          </h1>
          <div className="header-badge-group">
            <span className="admin-pill">Vai trò: Admin</span>
            <span className="audit-pill">Audit Log: Enabled</span>
            <span className="gis-pill">WebGIS: Đồng bộ</span>
          </div>
        </div>
        <p className="header-desc">
          Quản lý toàn bộ mạng lưới các trạm tái chế và điểm tiếp nhận rác phân loại trên địa bàn TP.HCM, tự động sinh mã định danh và mã QR phục vụ người dân quét tích điểm xanh.
        </p>
      </header>

      {/* NỘI DUNG CHÍNH (THEO CHẾ ĐỘ HIỂN THỊ) */}
      <main className="recycling-facility-main-content">
        {viewMode === "list" ? (
          /* MÀN 1: BỐ CỤC 3 KHỐI THEO CHIỀU NGANG */
          <div className="three-columns-layout">
            {/* KHỐI 1: BỘ LỌC */}
            <FacilityFilterPanel
              initialSearch={search}
              initialStatus={statusFilter}
              initialUnitId={selectedUnitId}
              districts={districts}
              onApply={handleApplyFilter}
              onReset={handleResetFilter}
              disabled={loading}
            />

            {/* KHỐI 2: DANH SÁCH TRẠM */}
            <FacilityListPanel
              facilities={facilities}
              loading={loading}
              error={error}
              hasFilters={Boolean(
                search.trim() || statusFilter !== "ALL" || selectedUnitId !== undefined
              )}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onViewQR={handleViewQR}
              onAddNew={handleOpenCreate}
              onRetry={fetchFacilities}
            />

            {/* KHỐI 3: THAO TÁC & PHÂN TRANG */}
            <FacilityActionPanel
              total={totalCount}
              activeCount={activeCount}
              inactiveCount={inactiveCount}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
              onAddNew={handleOpenCreate}
              disabled={loading}
            />
          </div>
        ) : (
          /* MÀN 2 HOẶC MÀN 3: FORM THÊM MỚI / SỬA (3 KHỐI NGANG) */
          <FacilityFormView
            mode={viewMode}
            initialItem={selectedFacility}
            districts={districts}
            onSaveCreate={handleSaveCreate}
            onSaveUpdate={handleSaveUpdate}
            onCancelRequest={handleCancelForm}
            onReload={handleReloadFacility}
          />
        )}
      </main>

      {/* MÀN 4: POPUP XÁC NHẬN XOÁ */}
      <FacilityDeleteConfirmModal
        isOpen={Boolean(deletingFacility)}
        facility={deletingFacility}
        onConfirmDelete={handleConfirmDelete}
        onCancel={() => setDeletingFacility(null)}
      />

      {/* MÀN 5: POPUP THÀNH CÔNG XOÁ */}
      <FacilityDeleteSuccessModal
        isOpen={Boolean(deletedFacilitySuccess)}
        facility={deletedFacilitySuccess}
        onClose={handleCloseDeleteSuccess}
      />

      {/* POPUP XEM & TẢI MÃ QR */}
      <FacilityQRCodeModal
        isOpen={Boolean(qrModalFacility)}
        facility={qrModalFacility}
        onClose={() => setQrModalFacility(null)}
      />

      {/* POPUP PHỤ: XÁC NHẬN THOÁT KHI CÓ THAY ĐỔI CHƯA LƯU */}
      <UnsavedFacilityModal
        isOpen={showUnsavedModal}
        onConfirmExit={() => {
          setShowUnsavedModal(false);
          setViewMode("list");
          setSelectedFacility(null);
        }}
        onStay={() => setShowUnsavedModal(false)}
      />
    </div>
  );
};

