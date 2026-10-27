import React, { useState, useEffect, useCallback } from "react";
import type {
  FundraiserCampaignItem,
  FundraiserCampaignListResponse,
} from "./types/fundraiser.types";
import { fundraiserService } from "./services/fundraiserService";
import { CampaignListPanel } from "./components/CampaignListPanel";
import { CampaignCreationModal } from "./components/CampaignCreationModal";
import { CampaignDetailModal } from "./components/CampaignDetailModal";
import { AdminFundraiserDashboard } from "./components/AdminFundraiserDashboard";
import "./styles/Fundraiser.scss";

interface FundraiserContainerProps {
  currentUser?: {
    id?: string;
    username?: string;
    full_name?: string;
    role?: string;
  } | null;
  initialAdminMode?: boolean;
  onNavigateToLogin?: () => void;
}

export const FundraiserContainer: React.FC<FundraiserContainerProps> = ({
  currentUser,
  initialAdminMode = false,
  onNavigateToLogin = () => {
    window.location.hash = "#login";
  },
}) => {
  // Lấy user từ localStorage nếu chưa có qua props
  const [resolvedUser, setResolvedUser] = useState(() => {
    if (currentUser) return currentUser;
    try {
      const stored = localStorage.getItem("ecoreport_user_info") || localStorage.getItem("user");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      setResolvedUser(currentUser);
    }
  }, [currentUser]);

  const isLoggedIn = Boolean(resolvedUser);
  const isAdmin =
    resolvedUser?.role === "ADMIN" ||
    resolvedUser?.role === "admin" ||
    resolvedUser?.role_id === 1;

  // View Mode: public (Trang Khám phá) vs admin (Trung tâm Quản trị)
  const isHashAdmin =
    typeof window !== "undefined" &&
    (window.location.hash === "#fundraiser-admin" ||
      window.location.hash.startsWith("#fundraiser/admin"));

  const [viewMode, setViewMode] = useState<"public" | "admin">(() => {
    if (initialAdminMode || isHashAdmin) return "admin";
    return "public";
  });
  const [systemPendingCount, setSystemPendingCount] = useState<number>(0);

  useEffect(() => {
    if (initialAdminMode) {
      setViewMode("admin");
    }
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#fundraiser-admin" || hash.startsWith("#fundraiser/admin")) {
        setViewMode("admin");
      } else if (hash === "#fundraiser") {
        setViewMode("public");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [initialAdminMode]);

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [myCampaignsOnly, setMyCampaignsOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Data State
  const [campaigns, setCampaigns] = useState<FundraiserCampaignItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedCampaign, setSelectedCampaign] = useState<FundraiserCampaignItem | null>(null);
  const [pendingCampaignCount, setPendingCampaignCount] = useState<number>(0);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof fundraiserService.listCampaigns>[0] = {
        page: currentPage,
        page_size: pageSize,
      };

      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (districtFilter) {
        params.district = districtFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (myCampaignsOnly) {
        params.my_campaigns = true;
      }

      const res: FundraiserCampaignListResponse = await fundraiserService.listCampaigns(params);
      setCampaigns(res.items || []);
      setTotal(res.total || 0);

      // Đếm số chiến dịch pending của user hiện tại để chặn nếu >= 3
      if (isLoggedIn && resolvedUser?.id) {
        const myPendingRes = await fundraiserService.listCampaigns({
          my_campaigns: true,
          status: "pending",
          page_size: 10,
        });
        setPendingCampaignCount(myPendingRes.total || 0);
      }

      // Nếu là Admin, đếm tổng số chiến dịch pending toàn hệ thống
      if (isAdmin) {
        const adminPendingRes = await fundraiserService.listCampaigns({
          status: "pending",
          page_size: 1,
        });
        setSystemPendingCount(adminPendingRes.total || 0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách chiến dịch";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    statusFilter,
    districtFilter,
    searchQuery,
    myCampaignsOnly,
    isLoggedIn,
    resolvedUser?.id,
  ]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Handlers for filter change
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleDistrictChange = (district: string) => {
    setDistrictFilter(district);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleMyCampaignsToggle = () => {
    setMyCampaignsOnly((prev) => !prev);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectCampaign = (campaign: FundraiserCampaignItem) => {
    setSelectedCampaign(campaign);
  };

  const handleCampaignUpdated = (updated: FundraiserCampaignItem) => {
    setSelectedCampaign(updated);
    setCampaigns((prev) =>
      prev.map((c) =>
        (c.campaign_id || c.id) === (updated.campaign_id || updated.id)
          ? updated
          : c
      )
    );
  };

  const handleCampaignDeleted = () => {
    setSelectedCampaign(null);
    fetchCampaigns();
  };

  return (
    <div className="fundraiser-container" data-testid="fundraiser-module">
      {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ DÀNH CHO ADMIN */}
      {isAdmin && (
        <div className="fundraiser-admin-switch-bar" data-testid="admin-mode-switch-bar">
          <div className="switch-label">
            <span className="badge-admin">QUẢN TRỊ VIÊN HỆ THỐNG</span>
            <span>Chế độ hiển thị:</span>
          </div>
          <div className="switch-buttons">
            <button
              type="button"
              className={`btn-mode-switch ${viewMode === "public" ? "active" : ""}`}
              onClick={() => {
                setViewMode("public");
                window.location.hash = "#fundraiser";
              }}
              data-testid="btn-mode-public"
            >
              🌱 Trang Cộng Đồng (Khám Phá)
            </button>
            <button
              type="button"
              className={`btn-mode-switch ${viewMode === "admin" ? "active" : ""}`}
              onClick={() => {
                setViewMode("admin");
                window.location.hash = "#fundraiser-admin";
              }}
              data-testid="btn-mode-admin"
            >
              🛡️ Trung Tâm Quản Trị & Duyệt Quỹ
              {systemPendingCount > 0 && (
                <span className="pending-badge-counter">{systemPendingCount}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {viewMode === "admin" && isAdmin ? (
        <AdminFundraiserDashboard
          onSelectCampaign={handleSelectCampaign}
          onRefreshList={fetchCampaigns}
        />
      ) : (
        <CampaignListPanel
          campaigns={campaigns}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          isLoading={isLoading}
          error={error}
          statusFilter={statusFilter}
          districtFilter={districtFilter}
          searchQuery={searchQuery}
          myCampaignsOnly={myCampaignsOnly}
          isLoggedIn={isLoggedIn}
          onStatusChange={handleStatusChange}
          onDistrictChange={handleDistrictChange}
          onSearchChange={handleSearchChange}
          onMyCampaignsToggle={handleMyCampaignsToggle}
          onPageChange={handlePageChange}
          onSelectCampaign={handleSelectCampaign}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onRetry={fetchCampaigns}
          onNavigateToLogin={onNavigateToLogin}
        />
      )}

      {/* Màn 2: Modal tạo chiến dịch */}
      {isCreateModalOpen && (
        <CampaignCreationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            setCurrentPage(1);
            fetchCampaigns();
          }}
          pendingCampaignCount={pendingCampaignCount}
        />
      )}

      {/* Màn 3: Modal chi tiết chiến dịch (tích hợp Màn 4, 5, 6) */}
      {selectedCampaign && (
        <CampaignDetailModal
          isOpen={Boolean(selectedCampaign)}
          campaign={selectedCampaign}
          currentUserId={resolvedUser?.id ? String(resolvedUser.id) : null}
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          onClose={() => setSelectedCampaign(null)}
          onCampaignUpdated={handleCampaignUpdated}
          onCampaignDeleted={handleCampaignDeleted}
          onNavigateToLogin={onNavigateToLogin}
        />
      )}
    </div>
  );
};

export default FundraiserContainer;
