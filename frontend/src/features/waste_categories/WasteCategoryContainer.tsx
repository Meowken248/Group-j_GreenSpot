import React, { useState, useEffect, useCallback } from "react";
import type {
  WasteCategoryItem,
  WasteCategoryCreateRequest,
  WasteCategoryUpdateRequest,
} from "./types/wasteCategory.types";
import {
  getWasteCategories,
  createWasteCategory,
  updateWasteCategory,
  deleteWasteCategory,
} from "./services/wasteCategoryService";
import { CategoryFilterPanel } from "./components/CategoryFilterPanel";
import { CategoryListPanel } from "./components/CategoryListPanel";
import { CategoryActionPanel } from "./components/CategoryActionPanel";
import { CategoryFormView } from "./components/CategoryFormView";
import { CategoryDeleteConfirmModal } from "./components/CategoryDeleteConfirmModal";
import { CategoryDeleteSuccessModal } from "./components/CategoryDeleteSuccessModal";
import { UnsavedChangesModal } from "./components/UnsavedChangesModal";
import "./WasteCategory.scss";

interface Props {
  currentUser?: { role?: string; email?: string } | null;
  onNavigateHome?: () => void;
}

export const WasteCategoryContainer: React.FC<Props> = ({
  currentUser,
  onNavigateHome,
}) => {
  // 1. Phân quyền Admin
  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";

  // 2. Chế độ hiển thị màn hình: list (Màn 1) | create (Màn 2) | edit (Màn 3)
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [selectedCategory, setSelectedCategory] =
    useState<WasteCategoryItem | null>(null);

  // 3. Trạng thái danh sách Màn 1
  const [categories, setCategories] = useState<WasteCategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 4. Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  // 5. Phân trang (10 mục / trang)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const pageSize = 10;

  // 6. Trạng thái Modal Màn 4 & Màn 5 & Thoát chưa lưu
  const [deletingCategory, setDeletingCategory] =
    useState<WasteCategoryItem | null>(null);
  const [deletedCategorySuccess, setDeletedCategorySuccess] =
    useState<WasteCategoryItem | null>(null);
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

  // 8. Tải danh sách từ Server
  const fetchCategories = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getWasteCategories({
        page: currentPage,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: statusFilter,
        sort_by: "created_at",
        sort_order: "desc",
      });

      setCategories(res.items);
      setTotalPages(res.total_pages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Không thể tải danh mục. Vui lòng thử lại";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentPage, search, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Nếu không có quyền Admin -> thông báo và chặn
  if (!isAdmin) {
    return (
      <div className="waste-category-denied-container">
        <div className="access-denied-card">
          <div className="denied-icon">🚫</div>
          <h2 className="denied-title">Truy cập bị từ chối</h2>
          <p className="denied-message">
            Bạn không có quyền truy cập chức năng này. Chức năng Quản trị Danh mục Rác thải & Cấu hình SLA chỉ dành cho tài khoản Quản trị viên (Admin).
          </p>
          {onNavigateHome && (
            <button
              type="button"
              className="btn-back-home"
              onClick={onNavigateHome}
            >
              ⬅️ Quay về trang chủ
            </button>
          )}
        </div>
      </div>
    );
  }

  // Xử lý bộ lọc
  const handleApplyFilter = (
    newSearch: string,
    newStatus: "ALL" | "ACTIVE" | "INACTIVE"
  ) => {
    setSearch(newSearch);
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearch("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  // Mở Màn 2: Thêm mới
  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setViewMode("create");
  };

  // Mở Màn 3: Sửa
  const handleOpenEdit = (item: WasteCategoryItem) => {
    setSelectedCategory(item);
    setViewMode("edit");
  };

  // Hủy form tạo/sửa
  const handleCancelForm = (hasChanges: boolean) => {
    if (hasChanges) {
      setShowUnsavedModal(true);
    } else {
      setViewMode("list");
      setSelectedCategory(null);
    }
  };

  // Lưu tạo mới (Màn 2)
  const handleSaveCreate = async (data: WasteCategoryCreateRequest) => {
    await createWasteCategory(data);
    showToast("Đã thêm danh mục thành công", "success");
    setViewMode("list");
    setSelectedCategory(null);
    setCurrentPage(1); // Trở về trang 1 để danh mục mới nằm đầu danh sách
    fetchCategories();
  };

  // Lưu cập nhật (Màn 3)
  const handleSaveUpdate = async (
    id: number,
    data: WasteCategoryUpdateRequest
  ) => {
    await updateWasteCategory(id, data);
    showToast("Đã cập nhật danh mục thành công", "success");
    setViewMode("list");
    setSelectedCategory(null);
    fetchCategories();
  };

  // Mở popup xác nhận xóa (Màn 4)
  const handleOpenDelete = (item: WasteCategoryItem) => {
    setDeletingCategory(item);
  };

  // Xác nhận xóa mềm
  const handleConfirmDelete = async (id: number) => {
    await deleteWasteCategory(id);
    const deleted = deletingCategory;
    setDeletingCategory(null);
    // Chuyển sang Màn 5 popup thành công
    setDeletedCategorySuccess(deleted);
  };

  // Đóng Màn 5
  const handleCloseDeleteSuccess = () => {
    setDeletedCategorySuccess(null);
    // Quy tắc: sau khi xóa, nếu trang hiện tại bị rỗng và > 1 thì lùi về trang trước
    if (categories.length <= 1 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    } else {
      fetchCategories();
    }
  };

  // Thống kê nhanh số lượng
  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = categories.filter((c) => !c.is_active).length;

  return (
    <div className="waste-category-management-root">
      {/* TOAST THÔNG BÁO TỔNG THỂ */}
      {toastMessage && (
        <div className={`waste-toast-banner ${toastType}`} role="status">
          <span className="toast-icon">
            {toastType === "success" ? "✅" : toastType === "error" ? "❌" : "ℹ️"}
          </span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION TIÊU ĐỀ KHUNG */}
      <header className="waste-category-header">
        <div className="header-breadcrumbs">
          <span className="crumb-root">Hệ thống Quản trị</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Danh mục Rác thải & Quy chuẩn SLA</span>
        </div>
        <div className="header-title-bar">
          <h1 className="header-title">
            <span className="title-icon">🗑️</span>
            Quản trị Danh mục Rác thải Đô thị & Cấu hình Quy chuẩn SLA
          </h1>
          <div className="header-badge-group">
            <span className="admin-pill">Vai trò: Admin</span>
            <span className="audit-pill">Audit Log: Enabled</span>
          </div>
        </div>
        <p className="header-desc">
          Quản lý toàn bộ danh mục các loại rác thải đô thị, thiết lập thời hạn cam kết xử lý SLA và mức ưu tiên tương ứng làm cơ sở tiếp nhận và cảnh báo quá hạn.
        </p>
      </header>

      {/* NỘI DUNG CHÍNH (THEO CHẾ ĐỘ HIỂN THỊ) */}
      <main className="waste-category-main-content">
        {viewMode === "list" ? (
          /* MÀN 1: BỐ CỤC 3 KHỐI THEO CHIỀU NGANG */
          <div className="three-columns-layout">
            {/* KHỐI 1: BỘ LỌC */}
            <CategoryFilterPanel
              initialSearch={search}
              initialStatus={statusFilter}
              onApply={handleApplyFilter}
              onReset={handleResetFilter}
              disabled={loading}
            />

            {/* KHỐI 2: DANH SÁCH DANH MỤC RÁC */}
            <CategoryListPanel
              categories={categories}
              loading={loading}
              error={error}
              hasFilters={Boolean(search.trim() || statusFilter !== "ALL")}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onAddNew={handleOpenCreate}
              onRetry={fetchCategories}
            />

            {/* KHỐI 3: THAO TÁC & PHÂN TRANG */}
            <CategoryActionPanel
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
          <CategoryFormView
            mode={viewMode}
            initialItem={selectedCategory}
            onSaveCreate={handleSaveCreate}
            onSaveUpdate={handleSaveUpdate}
            onCancelRequest={handleCancelForm}
          />
        )}
      </main>

      {/* MÀN 4: POPUP XÁC NHẬN XOÁ */}
      <CategoryDeleteConfirmModal
        isOpen={Boolean(deletingCategory)}
        category={deletingCategory}
        onConfirmDelete={handleConfirmDelete}
        onCancel={() => setDeletingCategory(null)}
      />

      {/* MÀN 5: POPUP THÀNH CÔNG XOÁ */}
      <CategoryDeleteSuccessModal
        isOpen={Boolean(deletedCategorySuccess)}
        category={deletedCategorySuccess}
        onClose={handleCloseDeleteSuccess}
      />

      {/* POPUP PHỤ: XÁC NHẬN THOÁT KHI CÓ THAY ĐỔI CHƯA LƯU */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onConfirmExit={() => {
          setShowUnsavedModal(false);
          setViewMode("list");
          setSelectedCategory(null);
        }}
        onStay={() => setShowUnsavedModal(false)}
      />
    </div>
  );
};

