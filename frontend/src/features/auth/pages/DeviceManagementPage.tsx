import React, { useState, useEffect } from "react";
import { AuthHeader } from "../components/AuthHeader";
import { AuthFooter } from "../components/AuthFooter";
import { Toast } from "../components/Toast";
import { LogoutConfirmModal } from "../components/LogoutConfirmModal";
import type { ToastState } from "../types/auth.types";
import { AUTH_STORAGE_KEYS } from "../types/auth.types";
import {
  fetchUserSessions,
  revokeSession,
  revokeAllSessions,
  type SessionItem,
} from "../services/authService";
import "../styles/DeviceManagementPage.scss";

interface DeviceManagementPageProps {
  onNavigateToLogin: (redirectUrl?: string) => void;
  onLogoClick?: () => void;
}

export const DeviceManagementPage: React.FC<DeviceManagementPageProps> = ({
  onNavigateToLogin,
  onLogoClick,
}) => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Trạng thái điều khiển Modal Màn 3
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [isAllDevices, setIsAllDevices] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // 1. Kiểm tra đăng nhập khi mở màn hình: chưa có token chuyển về Màn 1 kèm redirect
  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      onNavigateToLogin("/devices");
      return;
    }
    loadSessions();
  }, [onNavigateToLogin]);

  // Tải danh sách thiết bị
  const loadSessions = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetchUserSessions();
      if (res.success && res.sessions) {
        setSessions(res.sessions);
      } else if (res.status === "SESSION_INVALID") {
        localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
        onNavigateToLogin("/devices");
      } else {
        setFetchError("Không thể tải danh sách thiết bị. Vui lòng thử lại");
        setToast({
          id: Date.now(),
          type: "error",
          message: "Không thể tải danh sách thiết bị. Vui lòng thử lại",
        });
      }
    } catch {
      setFetchError("Không thể tải danh sách thiết bị. Vui lòng thử lại");
      setToast({
        id: Date.now(),
        type: "error",
        message: "Không thể tải danh sách thiết bị. Vui lòng thử lại",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mở Popup Màn 3 - Dạng 1: Một thiết bị
  const handleOpenSingleRevoke = (session: SessionItem) => {
    setSelectedSession(session);
    setIsAllDevices(false);
    setModalOpen(true);
  };

  // Mở Popup Màn 3 - Dạng 2: Tất cả thiết bị
  const handleOpenAllRevoke = () => {
    setSelectedSession(null);
    setIsAllDevices(true);
    setModalOpen(true);
  };

  // Đóng Popup
  const handleCloseModal = () => {
    if (!isRevoking) {
      setModalOpen(false);
      setSelectedSession(null);
    }
  };

  // Xác nhận đăng xuất trong Popup
  const handleConfirmLogout = async () => {
    setIsRevoking(true);

    try {
      // Trường hợp 1: Đăng xuất tất cả
      if (isAllDevices) {
        const res = await revokeAllSessions();
        if (res.success) {
          localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);

          setModalOpen(false);
          setToast({
            id: Date.now(),
            type: "success",
            message: "Đã đăng xuất khỏi tất cả thiết bị",
          });

          setTimeout(() => {
            onNavigateToLogin("/devices");
          }, 1000);
        } else {
          setToast({
            id: Date.now(),
            type: "error",
            message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
          });
          setIsRevoking(false);
        }
        return;
      }

      // Trường hợp 2: Đăng xuất một thiết bị
      if (selectedSession) {
        const res = await revokeSession(selectedSession.session_id);

        if (res.success) {
          setModalOpen(false);

          // Nếu đăng xuất đúng thiết bị đang dùng -> chuyển về Màn 1
          if (selectedSession.is_current) {
            localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(AUTH_STORAGE_KEYS.USER_INFO);

            setToast({
              id: Date.now(),
              type: "success",
              message: "Bạn đã đăng xuất",
            });

            setTimeout(() => {
              onNavigateToLogin("/devices");
            }, 1000);
          } else {
            // Đăng xuất thiết bị khác thành công -> Xóa dòng khỏi danh sách
            setToast({
              id: Date.now(),
              type: "success",
              message: "Đã đăng xuất thiết bị",
            });
            setSessions((prev) =>
              prev.filter((s) => s.session_id !== selectedSession.session_id)
            );
          }
        } else if (res.status === "ALREADY_REVOKED") {
          // Phiên đã bị thu hồi trước đó -> Đóng popup, báo lỗi và xóa dòng khỏi bảng
          setModalOpen(false);
          setToast({
            id: Date.now(),
            type: "error",
            message: "Phiên này đã được đăng xuất trước đó",
          });
          setSessions((prev) =>
            prev.filter((s) => s.session_id !== selectedSession.session_id)
          );
        } else {
          // Lỗi máy chủ: giữ popup, báo toast đỏ, mở lại 2 nút
          setToast({
            id: Date.now(),
            type: "error",
            message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
          });
          setIsRevoking(false);
        }
      }
    } catch {
      setToast({
        id: Date.now(),
        type: "error",
        message: "Không thể kết nối đến máy chủ. Vui lòng thử lại",
      });
      setIsRevoking(false);
    }
  };

  // Định dạng thời gian hoạt động thân thiện
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="devices-page-wrapper">
      {/* Toast thông báo */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Popup Màn 3 */}
      <LogoutConfirmModal
        isOpen={modalOpen}
        isAllDevices={isAllDevices}
        deviceName={selectedSession?.device_name}
        isCurrentDevice={selectedSession?.is_current}
        isLoading={isRevoking}
        onConfirm={handleConfirmLogout}
        onCancel={handleCloseModal}
      />

      {/* Header hệ thống */}
      <AuthHeader
        onLogoClick={onLogoClick}
        isLoggedIn={true}
        onNavigateToDevices={loadSessions}
        onLogout={handleOpenAllRevoke}
      />

      <main className="devices-main-content">
        <section className="devices-card">
          <div className="card-header-section">
            <div className="badge-tag">
              <span>💻</span>
              <span>BẢO MẬT & ĐA NỀN TẢNG</span>
            </div>
            <h1 className="card-title">THIẾT BỊ ĐANG ĐĂNG NHẬP</h1>
            <p className="card-subtitle">
              Danh sách các thiết bị đang có phiên hoạt động của tài khoản GreenSpot
            </p>
          </div>

          <div className="devices-list-container">
            {/* 1. Trạng thái đang tải: 2 dòng giả skeleton */}
            {isLoading && (
              <>
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </>
            )}

            {/* 2. Trạng thái lỗi tải danh sách kèm link Tải lại */}
            {!isLoading && fetchError && (
              <div className="fetch-error-box">
                <span>{fetchError}</span>
                <button
                  type="button"
                  className="btn-retry-link"
                  onClick={loadSessions}
                >
                  Tải lại
                </button>
              </div>
            )}

            {/* 3. Danh sách thiết bị tải thành công */}
            {!isLoading && !fetchError && sessions.length > 0 && (
              sessions.map((session) => (
                <div
                  key={session.session_id}
                  className={`device-item-row ${
                    session.is_current ? "is-current-device" : ""
                  }`}
                >
                  <div className="device-info-col">
                    <div
                      className={`device-icon-box ${
                        session.is_current ? "current-icon" : ""
                      }`}
                    >
                      {session.device_name.toLowerCase().includes("ios") ||
                      session.device_name.toLowerCase().includes("android")
                        ? "📱"
                        : "💻"}
                    </div>

                    <div className="device-text-meta">
                      <div className="device-name-heading">
                        <span>{session.device_name || "Thiết bị không xác định"}</span>
                        {session.is_current && (
                          <span className="current-badge">Thiết bị này</span>
                        )}
                      </div>

                      <div className="device-sub-detail">
                        {session.ip_address ? `IP: ${session.ip_address} • ` : ""}
                        Hoạt động: {formatTime(session.last_active_at)}
                      </div>
                    </div>
                  </div>

                  <div className="device-action-col">
                    <button
                      type="button"
                      className="btn-revoke-device"
                      onClick={() => handleOpenSingleRevoke(session)}
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Nút Đăng xuất tất cả (vô hiệu hóa khi đang tải hoặc khi có lỗi) */}
          <button
            type="button"
            className="btn-logout-all"
            onClick={handleOpenAllRevoke}
            disabled={isLoading || Boolean(fetchError) || sessions.length === 0}
          >
            Đăng xuất tất cả
          </button>
        </section>
      </main>

      <AuthFooter />
    </div>
  );
};
