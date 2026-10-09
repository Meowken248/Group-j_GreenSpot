import React, { useState, useEffect, useCallback } from "react";
import { profileService } from "./services/profile.service";
import type {
  UserProfile,
  PostListResponse,
  GreenPassportData,
  UserBadgesData,
  ActivityListResponse,
  UpdateProfilePayload,
} from "./types/profile.types";
import { ProfileTimeline } from "./components/ProfileTimeline";
import { GreenPassportView } from "./components/GreenPassportView";
import { ContributionHistoryView } from "./components/ContributionHistoryView";
import { EditProfileView } from "./components/EditProfileView";
import "./styles/Profile.scss";

type ProfileViewMode = "timeline" | "passport" | "history" | "edit";

interface ToastItem {
  id: string;
  type: "success" | "error";
  message: string;
}

interface ProfileContainerProps {
  onBackToMap?: () => void;
  onNavigateToAqi?: () => void;
  onNavigateToAuth?: () => void;
}

export const ProfileContainer: React.FC<ProfileContainerProps> = ({
  onBackToMap,
  onNavigateToAqi,
  onNavigateToAuth,
}) => {
  // Trạng thái kiểm tra quyền truy cập (chưa đăng nhập / phiên hết hạn)
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem("greenspot_access_token");
      const user = localStorage.getItem("greenspot_user");
      return !(token && user);
    } catch {
      return true;
    }
  });

  // Chế độ xem hiện tại của trang cá nhân
  const [currentView, setCurrentView] = useState<ProfileViewMode>("timeline");

  // Dữ liệu Profile (Cột trái & Cột phải)
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Dữ liệu Bài đăng (Cột giữa) - Tải độc lập
  const [posts, setPosts] = useState<PostListResponse | null>(null);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsPage, setPostsPage] = useState<number>(1);
  const [loadingMorePosts, setLoadingMorePosts] = useState<boolean>(false);

  // Dữ liệu Màn 2: Green Passport & Huy hiệu
  const [passportData, setPassportData] = useState<GreenPassportData | null>(null);
  const [passportLoading, setPassportLoading] = useState<boolean>(false);
  const [passportError, setPassportError] = useState<string | null>(null);

  const [badgesData, setBadgesData] = useState<UserBadgesData | null>(null);
  const [badgesLoading, setBadgesLoading] = useState<boolean>(false);
  const [badgesError, setBadgesError] = useState<string | null>(null);

  // Dữ liệu Màn 3: Lịch sử đóng góp
  const [historyData, setHistoryData] = useState<ActivityListResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyOffset, setHistoryOffset] = useState<number>(0);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState<boolean>(false);
  const [historyFilters, setHistoryFilters] = useState<{
    activity_type?: string;
    from_date?: string;
    to_date?: string;
  }>({});

  // Trạng thái lưu hồ sơ (Màn 4)
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Hệ thống Toast thông báo (tự tắt sau 3 giây)
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // =========================================================================
  // 1. TẢI DỮ LIỆU PROFILE (HỒ SƠ CÁ NHÂN)
  // =========================================================================
  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("greenspot_access_token");
    const user = localStorage.getItem("greenspot_user");
    if (!token || !user) {
      setIsUnauthorized(true);
      setProfileLoading(false);
      setPostsLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setIsUnauthorized(false);
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number }; message?: string };
      if (
        errorObj?.response?.status === 401 ||
        errorObj?.message?.includes("SESSION_EXPIRED") ||
        errorObj?.message?.includes("401")
      ) {
        setIsUnauthorized(true);
        return;
      }
      const msg = err instanceof Error ? err.message : "Không thể tải thông tin hồ sơ";
      setProfileError(msg);
      showToast("error", "Lỗi tải thông tin cá nhân. Vui lòng bấm 'Tải lại'.");
    } finally {
      setProfileLoading(false);
    }
  }, [showToast]);

  // =========================================================================
  // 2. TẢI DỮ LIỆU BÀI ĐĂNG (ĐỘC LẬP VỚI PROFILE)
  // =========================================================================
  const fetchPosts = useCallback(
    async (userId: string, page = 1, append = false) => {
      if (append) {
        setLoadingMorePosts(true);
      } else {
        setPostsLoading(true);
        setPostsError(null);
      }

      try {
        const data = await profileService.getUserPosts(userId, page, 10);
        if (append) {
          setPosts((prev) =>
            prev
              ? {
                  ...data,
                  items: [...prev.items, ...data.items],
                }
              : data
          );
        } else {
          setPosts(data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Không thể tải danh sách bài đăng";
        if (!append) {
          setPostsError(msg);
          showToast("error", "Lỗi tải bài đăng. Bạn có thể bấm 'Tải lại' ở cột bài viết.");
        }
      } finally {
        setPostsLoading(false);
        setLoadingMorePosts(false);
      }
    },
    [showToast]
  );

  // Tải ban đầu cả hai luồng độc lập khi component mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const uid = profile?.user_id || profile?.id;
    if (uid) {
      fetchPosts(uid, 1, false);
      setPostsPage(1);
    }
  }, [profile?.user_id, profile?.id, fetchPosts]);

  // Tải thêm bài đăng phân trang
  const handleLoadMorePosts = () => {
    const uid = profile?.user_id || profile?.id;
    if (!uid || loadingMorePosts) return;
    const nextPage = postsPage + 1;
    setPostsPage(nextPage);
    fetchPosts(uid, nextPage, true);
  };

  // =========================================================================
  // 3. TẢI DỮ LIỆU MÀN 2: GREEN PASSPORT & HUY HIỆU
  // =========================================================================
  const fetchPassportData = useCallback(async (userId: string) => {
    setPassportLoading(true);
    setPassportError(null);
    try {
      const data = await profileService.getGreenPassport(userId);
      setPassportData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải thông tin Green Passport";
      setPassportError(msg);
    } finally {
      setPassportLoading(false);
    }
  }, []);

  const fetchBadgesData = useCallback(async (userId: string) => {
    setBadgesLoading(true);
    setBadgesError(null);
    try {
      const data = await profileService.getUserBadges(userId);
      setBadgesData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải huy hiệu";
      setBadgesError(msg);
    } finally {
      setBadgesLoading(false);
    }
  }, []);

  // Tải dữ liệu Passport khi chuyển view
  useEffect(() => {
    const uid = profile?.user_id || profile?.id;
    if (currentView === "passport" && uid) {
      fetchPassportData(uid);
      fetchBadgesData(uid);
    }
  }, [currentView, profile?.user_id, profile?.id, fetchPassportData, fetchBadgesData]);

  // =========================================================================
  // 4. TẢI DỮ LIỆU MÀN 3: LỊCH SỬ ĐÓNG GÓP
  // =========================================================================
  const fetchActivities = useCallback(
    async (
      userId: string,
      filters: { activity_type?: string; from_date?: string; to_date?: string },
      offset = 0,
      append = false
    ) => {
      if (append) {
        setLoadingMoreHistory(true);
      } else {
        setHistoryLoading(true);
        setHistoryError(null);
      }

      try {
        const data = await profileService.getUserActivities(userId, {
          activity_type: filters.activity_type,
          from_date: filters.from_date,
          to_date: filters.to_date,
          limit: 20,
          offset,
        });

        if (append) {
          setHistoryData((prev) =>
            prev
              ? {
                  ...data,
                  items: [...prev.items, ...data.items],
                }
              : data
          );
        } else {
          setHistoryData(data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Không thể tải lịch sử đóng góp";
        if (!append) {
          setHistoryError(msg);
        }
      } finally {
        setHistoryLoading(false);
        setLoadingMoreHistory(false);
      }
    },
    []
  );

  useEffect(() => {
    const uid = profile?.user_id || profile?.id;
    if (currentView === "history" && uid) {
      setHistoryOffset(0);
      fetchActivities(uid, historyFilters, 0, false);
    }
  }, [currentView, profile?.user_id, profile?.id, historyFilters, fetchActivities]);

  const handleFilterChange = (filters: {
    activity_type?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    setHistoryFilters(filters);
    setHistoryOffset(0);
    const uid = profile?.user_id || profile?.id;
    if (uid) {
      fetchActivities(uid, filters, 0, false);
    }
  };

  const handleLoadMoreHistory = () => {
    const uid = profile?.user_id || profile?.id;
    if (!uid || loadingMoreHistory || !historyData) return;
    const nextOffset = historyOffset + 20;
    setHistoryOffset(nextOffset);
    fetchActivities(uid, historyFilters, nextOffset, true);
  };

  // =========================================================================
  // 5. LƯU CHỈNH SỬA HỒ SƠ (MÀN 4: OCC & VALIDATION)
  // =========================================================================
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh"));
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProfile = async (
    payload: UpdateProfilePayload,
    coverFile?: File | null,
    avatarFile?: File | null
  ) => {
    setSavingProfile(true);
    try {
      let finalCoverUrl = payload.cover_image_url || profile?.cover_image_url || null;
      let finalAvatarUrl = payload.avatar_url || profile?.avatar_url || null;

      // Xử lý nạp ảnh local nếu có chọn file mới
      if (coverFile) {
        finalCoverUrl = await readFileAsDataUrl(coverFile);
      }
      if (avatarFile) {
        finalAvatarUrl = await readFileAsDataUrl(avatarFile);
      }

      const completePayload: UpdateProfilePayload = {
        ...payload,
        cover_image_url: finalCoverUrl,
        avatar_url: finalAvatarUrl,
        version: profile?.version || 1, // OCC version
      };

      const res = await profileService.updateProfile(completePayload);
      const updatedUser = res.user || res.data;

      // Cập nhật profile state
      if (updatedUser) {
        setProfile(updatedUser);
      }

      // Cập nhật Header và User info trong localStorage
      try {
        const rawUser = localStorage.getItem("greenspot_user");
        if (rawUser && updatedUser) {
          const parsed = JSON.parse(rawUser);
          parsed.full_name = updatedUser.full_name;
          if (updatedUser.avatar_url) {
            parsed.avatar_url = updatedUser.avatar_url;
          }
          localStorage.setItem("greenspot_user", JSON.stringify(parsed));
          window.dispatchEvent(new Event("auth_change"));
        }
      } catch {
        // bỏ qua nếu parse lỗi
      }

      showToast("success", res.message || "Đã cập nhật hồ sơ");
      setCurrentView("timeline");
    } catch (err: unknown) {
      // Bắt lỗi xung đột OCC (HTTP 409)
      const errorObj = err as {
        response?: {
          status?: number;
          data?: { detail?: string | { message?: string } };
        };
      };
      if (errorObj?.response?.status === 409) {
        showToast(
          "error",
          "Dữ liệu hồ sơ đã được cập nhật từ một phiên đăng nhập khác. Đang tải lại dữ liệu mới nhất..."
        );
        // Tự động tải lại hồ sơ để lấy version mới nhất
        await fetchProfile();
      } else {
        const detail = errorObj?.response?.data?.detail;
        const errorMsg =
          typeof detail === "object" && detail?.message
            ? detail.message
            : typeof detail === "string"
            ? detail
            : err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi lưu thông tin";
        showToast("error", errorMsg);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // =========================================================================
  // GIAO DIỆN CHẶN KHI CHƯA ĐĂNG NHẬP (AUTH GATE)
  // =========================================================================
  if (isUnauthorized) {
    return (
      <div className="profile-page-wrapper">
        <header className="profile-page-header">
          <div className="header-inner">
            <div className="header-left">
              <button
                type="button"
                className="brand-logo"
                onClick={onBackToMap}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <span className="brand-icon">🌱</span>
                <span className="brand-name">GreenSpot</span>
              </button>
            </div>
            <div className="header-right">
              {onNavigateToAuth && (
                <button
                  type="button"
                  className="btn-login-direct"
                  onClick={onNavigateToAuth}
                >
                  Đăng nhập / Đăng ký
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="profile-main-content auth-gate-wrapper">
          <div className="profile-auth-card">
            <div className="auth-card-icon">🌿🔐</div>
            <h2 className="auth-card-title">Yêu cầu Đăng nhập Tài khoản</h2>
            <p className="auth-card-description">
              Trang cá nhân, Hộ chiếu số Green Passport và Lịch sử đóng góp sinh thái
              dành riêng cho Công dân đã đăng nhập trên nền tảng GreenSpot.
            </p>

            <div className="auth-card-actions">
              {onNavigateToAuth && (
                <button
                  type="button"
                  className="btn-auth-primary"
                  onClick={onNavigateToAuth}
                >
                  🌱 Đăng nhập ngay
                </button>
              )}
              {onBackToMap && (
                <button
                  type="button"
                  className="btn-auth-secondary"
                  onClick={onBackToMap}
                >
                  🗺️ Quay lại Bản đồ WebGIS
                </button>
              )}
            </div>
          </div>
        </main>

        <footer className="profile-page-footer">
          <div className="footer-inner">
            <div className="footer-copyright">
              <strong>© 2026 GreenSpot.</strong> Hệ sinh thái Giám sát Môi trường & Bản đồ Xanh Việt Nam.
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // RENDER GIAO DIỆN CHÍNH
  // =========================================================================
  const avatarLetter = profile?.full_name?.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || "G";

  return (
    <div className="profile-page-wrapper">
      {/* KHUNG THÔNG BÁO TOAST */}
      <div className="profile-toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`profile-toast ${t.type === "error" ? "toast-error" : "toast-success"}`}
          >
            <span>{t.type === "error" ? "⚠️" : "✅"}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* HEADER ĐẶC TẢ: Logo, Menu, Chuông, Avatar */}
      <header className="profile-page-header">
        <div className="header-inner">
          <div className="header-left">
            <button
              type="button"
              className="brand-logo"
              onClick={onBackToMap}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <span className="brand-icon">🌱</span>
              <span className="brand-name">GreenSpot</span>
            </button>

            <nav className="header-nav">
              <button
                type="button"
                className="nav-link-btn"
                onClick={onBackToMap}
              >
                🗺️ Bản đồ số
              </button>
              <button
                type="button"
                className="nav-link-btn"
                onClick={onNavigateToAqi}
              >
                📊 Giám sát AQI
              </button>
              <button
                type="button"
                className={`nav-link-btn ${currentView === "timeline" ? "active" : ""}`}
                onClick={() => setCurrentView("timeline")}
              >
                👤 Trang cá nhân
              </button>
            </nav>
          </div>

          <div className="header-right">
            <button
              type="button"
              className="bell-notification-btn"
              title="Thông báo hoạt động sinh thái"
              onClick={() => showToast("success", "Không có thông báo mới nào.")}
            >
              🔔
              <span className="bell-dot" />
            </button>

            <div
              className="header-user-avatar"
              title={`Hồ sơ của ${profile?.full_name || "Công dân"}`}
              onClick={() => setCurrentView("timeline")}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" />
              ) : (
                <span>{avatarLetter}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SUBNAV / BREADCRUMB QUAY LẠI TIMELINE NẾU ĐANG Ở CÁC MÀN CON */}
      {currentView !== "timeline" && (
        <div className="profile-subnav-bar">
          <button
            type="button"
            className="back-profile-link"
            onClick={() => setCurrentView("timeline")}
          >
            ← Quay lại Trang cá nhân
          </button>
        </div>
      )}

      {/* THÂN TRANG CHÍNH: HIỂN THỊ TỪNG MÀN HÌNH THEO ĐẶC TẢ */}
      <main className="profile-main-content">
        {currentView === "timeline" && (
          <ProfileTimeline
            profile={profile}
            posts={posts}
            profileLoading={profileLoading}
            postsLoading={postsLoading}
            profileError={profileError}
            postsError={postsError}
            onRetryProfile={fetchProfile}
            onRetryPosts={() => {
              const uid = profile?.user_id || profile?.id;
              if (uid) fetchPosts(uid, 1, false);
            }}
            onLoadMorePosts={handleLoadMorePosts}
            loadingMore={loadingMorePosts}
            onOpenEditProfile={() => setCurrentView("edit")}
            onOpenPassport={() => setCurrentView("passport")}
            onOpenHistory={() => setCurrentView("history")}
            onNavigateToFeed={() => showToast("success", "Đang chuyển đến Bảng tin chung...")}
          />
        )}

        {currentView === "passport" && (
          <GreenPassportView
            userProfile={profile}
            passportData={passportData}
            badgesData={badgesData}
            passportLoading={passportLoading}
            badgesLoading={badgesLoading}
            passportError={passportError}
            badgesError={badgesError}
            onRetryPassport={() => {
              const uid = profile?.user_id || profile?.id;
              if (uid) fetchPassportData(uid);
            }}
            onRetryBadges={() => {
              const uid = profile?.user_id || profile?.id;
              if (uid) fetchBadgesData(uid);
            }}
            onBackToTimeline={() => setCurrentView("timeline")}
            onOpenHistory={() => setCurrentView("history")}
          />
        )}

        {currentView === "history" && (
          <ContributionHistoryView
            userProfile={profile}
            historyData={historyData}
            historyLoading={historyLoading}
            historyError={historyError}
            onRetryHistory={() => {
              const uid = profile?.user_id || profile?.id;
              if (uid) fetchActivities(uid, historyFilters, 0, false);
            }}
            onFilterChange={handleFilterChange}
            onLoadMoreHistory={handleLoadMoreHistory}
            loadingMore={loadingMoreHistory}
            onBackToTimeline={() => setCurrentView("timeline")}
          />
        )}

        {currentView === "edit" && profile && (
          <EditProfileView
            userProfile={profile}
            onSave={handleSaveProfile}
            onCancel={() => setCurrentView("timeline")}
            saving={savingProfile}
          />
        )}
      </main>

      {/* FOOTER ĐẶC TẢ: Bản quyền, Liên hệ, Chính sách */}
      <footer className="profile-page-footer">
        <div className="footer-inner">
          <div className="footer-copyright">
            <strong>© 2026 GreenSpot.</strong> Hệ sinh thái Giám sát Môi trường & Bản đồ Xanh
            Việt Nam. Tất cả quyền được bảo lưu.
          </div>

          <div className="footer-links">
            <span
              className="footer-link-item"
              onClick={() => showToast("success", "Liên hệ hỗ trợ: support@greenspot.eco | Hotline: 1900-GREEN")}
            >
              📞 Liên hệ hỗ trợ
            </span>
            <span className="footer-divider">•</span>
            <span
              className="footer-link-item"
              onClick={() => showToast("success", "Chính sách bảo mật dữ liệu công dân số")}
            >
              🛡️ Chính sách bảo mật
            </span>
            <span className="footer-divider">•</span>
            <span
              className="footer-link-item"
              onClick={() => showToast("success", "Điều khoản tham gia cộng đồng GreenSpot")}
            >
              📜 Điều khoản sử dụng
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
