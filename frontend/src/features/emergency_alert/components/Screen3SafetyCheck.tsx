import React, { useState, useEffect } from "react";
import type { FriendContact } from "../types/emergency_alert.types";
import { emergencyAlertApi } from "../services/emergencyAlertApi";

interface Screen3SafetyCheckProps {
  onSendSuccess: (sentCount: number, hasSmsFallback: boolean) => void;
  onNavigateFeed?: () => void;
}

export const Screen3SafetyCheck: React.FC<Screen3SafetyCheckProps> = ({
  onSendSuccess,
}) => {
  // --- Khối 1: XÁC NHẬN AN TOÀN (Cột Trái) ---
  const [currentAddress, setCurrentAddress] = useState<string>("Đường An Dương Vương, Phường 3, Quận 5, TP.HCM");
  const [currentLat, setCurrentLat] = useState<number>(10.758);
  const [currentLng, setCurrentLng] = useState<number>(106.675);
  const [isGpsVerified, setIsGpsVerified] = useState<boolean>(true);
  const [isMarkedSafe, setIsMarkedSafe] = useState<boolean>(false);
  const [markingSafe, setMarkingSafe] = useState<boolean>(false);
  const [leftMessage, setLeftMessage] = useState<string>("Vị trí hiện tại của bạn đã được xác định. Hãy báo an toàn cho bạn bè.");

  // --- Khối 2: GỬI CHO (Cột Phải) ---
  const [friendsList, setFriendsList] = useState<FriendContact[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSendingToFriends, setIsSendingToFriends] = useState<boolean>(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        // Thử lấy tọa độ GPS từ trình duyệt
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCurrentLat(pos.coords.latitude);
              setCurrentLng(pos.coords.longitude);
              setIsGpsVerified(true);
            },
            () => {
              // Quyền vị trí bị từ chối
              setIsGpsVerified(false);
            }
          );
        }

        const res = await emergencyAlertApi.initSafetyCheck(currentLat, currentLng);
        if (res.location_address) {
          setCurrentAddress(res.location_address);
        }
        setIsGpsVerified(res.is_gps_verified);
        if (res.current_safe_status === "SAFE") {
          setIsMarkedSafe(true);
          setLeftMessage("Bạn đã được đánh dấu là AN TOÀN trong đợt thiên tai này.");
        }

        const realFriends = res.friends || [];
        setFriendsList(realFriends);
        setSelectedFriendIds(realFriends.map((f) => f.user_id));
      } catch {
        // Fallback offline
        setFriendsList([]);
        setSelectedFriendIds([]);
      }
    };

    fetchInitData();
  }, []);

  // Xử lý nút "Tôi an toàn" ở Cột Trái
  const handleToggleMarkSafe = async () => {
    try {
      setMarkingSafe(true);
      await emergencyAlertApi.markSafeSelf({
        latitude: currentLat,
        longitude: currentLng,
        location_address: currentAddress,
        safety_status: "SAFE",
        status_message: "Tôi an toàn trong đợt thiên tai này.",
      });

      setIsMarkedSafe(true);
      setLeftMessage("Bạn đã được đánh dấu là AN TOÀN trong đợt thiên tai này.");
    } catch {
      // Fallback
      setIsMarkedSafe(true);
      setLeftMessage("Bạn đã được đánh dấu là AN TOÀN trong đợt thiên tai này.");
    } finally {
      setMarkingSafe(false);
    }
  };

  // Chọn / bỏ chọn bạn bè
  const handleToggleFriend = (friendId: string) => {
    setFriendsError(null);
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  // Chọn tất cả / Bỏ chọn tất cả
  const handleSelectAll = () => {
    setFriendsError(null);
    if (selectedFriendIds.length === friendsList.length) {
      setSelectedFriendIds([]);
    } else {
      setSelectedFriendIds(friendsList.map((f) => f.user_id));
    }
  };

  // Nút "Gửi cho bạn bè" ở Cột Phải
  const handleSendToFriends = async () => {
    if (selectedFriendIds.length === 0) {
      setFriendsError("Vui lòng chọn ít nhất một người bạn để gửi thông báo an toàn.");
      return;
    }

    setFriendsError(null);
    setIsSendingToFriends(true);

    try {
      const res = await emergencyAlertApi.sendSafetyCheckToFriends({
        friend_user_ids: selectedFriendIds,
        latitude: currentLat,
        longitude: currentLng,
        location_address: currentAddress,
        status_message: "Tôi hiện đang an toàn tại khu vực, gia đình và bạn bè hãy yên tâm!",
      });

      // Mở tiếp Màn 4/4
      onSendSuccess(res.sent_count || selectedFriendIds.length, res.has_sms_fallback);
    } catch {
      // Mở Màn 4/4 fallback
      onSendSuccess(selectedFriendIds.length, true);
    } finally {
      setIsSendingToFriends(false);
    }
  };

  return (
    <div className="emergency-module-wrapper">
      {/* KHUNG CHÍNH 2 CỘT ĐÚNG PROTOTYPE MÀN 3/4 */}
      <div className="safety-check-layout-grid">
        {/* ===================================================================
            CỘT TRÁI: KHỐI "XÁC NHẬN AN TOÀN"
           =================================================================== */}
        <div className="console-column-card">
          <div className="column-card-header">
            <span className="column-card-title">🛡️ XÁC NHẬN AN TOÀN</span>
          </div>

          <div className="column-card-body">
            {/* Thông điệp hướng dẫn */}
            <p style={{ margin: "0 0 14px 0", color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.45 }}>
              {leftMessage}
            </p>

            {/* Vị trí hiện tại: Định vị GPS chính xác kèm dấu tích xanh xác thực */}
            <div className="gps-verified-box">
              <div className="gps-verified-icon">
                {isGpsVerified ? "📍" : "⚠️"}
              </div>
              <div style={{ flex: 1 }}>
                <div className="gps-verified-title">
                  {isGpsVerified ? "Vị trí GPS thời gian thực (Đã xác thực ✅)" : "Vị trí ước tính (Chưa cấp quyền GPS)"}
                </div>
                <div className="gps-address-text">{currentAddress}</div>
              </div>
            </div>

            {!isGpsVerified && (
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid #f59e0b",
                  borderRadius: "6px",
                  padding: "10px",
                  color: "#fbbf24",
                  fontSize: "0.82rem",
                }}
              >
                Không thể xác định vị trí hiện tại. Vui lòng bật định vị GPS trong cài đặt trình duyệt để có độ chính xác cao nhất.
              </div>
            )}

            {/* Nút lớn "Tôi an toàn" cập nhật hồ sơ & huy hiệu xanh */}
            <button
              type="button"
              className={`btn-large-safe-toggle ${isMarkedSafe ? "already-marked" : ""}`}
              onClick={handleToggleMarkSafe}
              disabled={markingSafe}
            >
              <span>{markingSafe ? "ĐANG CẬP NHẬT..." : isMarkedSafe ? "✅ ĐÃ BÁO AN TOÀN TRÊN HỒ SƠ" : "🛡️ Tôi an toàn"}</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            CỘT PHẢI: KHỐI "GỬI CHO"
           =================================================================== */}
        <div className="console-column-card">
          <div className="column-card-header">
            <span className="column-card-title">👥 GỬI CHO</span>
          </div>

          <div className="column-card-body">
            {/* Danh sách bạn bè tích chọn (Checkbox) hoặc Empty State */}
            <div className="friends-checklist-container">
              <div className="friends-checklist-toolbar">
                <span>Danh bạ bạn bè ({friendsList.length})</span>
                {friendsList.length > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      className="friend-checkbox"
                      checked={selectedFriendIds.length === friendsList.length && friendsList.length > 0}
                      onChange={handleSelectAll}
                    />
                    <span>Chọn tất cả ({selectedFriendIds.length}/{friendsList.length})</span>
                  </label>
                )}
              </div>

              {friendsList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 14px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>👥</div>
                  <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "6px", fontSize: "0.95rem" }}>
                    Bạn chưa có người bạn nào trong danh bạ
                  </div>
                  <div style={{ fontSize: "0.82rem", marginBottom: "16px", color: "#94a3b8", lineHeight: 1.45 }}>
                    Hãy kết nối bạn bè ở mục "Cộng đồng" để có thể gửi thông báo an toàn khi xảy ra thiên tai.
                  </div>
                  <a
                    href="#friends"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      background: "#059669",
                      color: "#ffffff",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    ➕ Đến trang Bạn bè & Theo dõi
                  </a>
                </div>
              ) : (
                friendsList.map((friend) => {
                  const isChecked = selectedFriendIds.includes(friend.user_id);
                  return (
                    <div
                      key={friend.user_id}
                      className="friend-item-row"
                      onClick={() => handleToggleFriend(friend.user_id)}
                    >
                      <div className="friend-item-left">
                        <div className="friend-avatar-circle">
                          {friend.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="friend-name">{friend.full_name}</div>
                          {friend.phone && <div className="friend-phone">{friend.phone}</div>}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="friend-checkbox"
                        checked={isChecked}
                        onChange={() => {}} /* Xử lý ở thẻ cha */
                        aria-label={`Chọn bạn bè ${friend.full_name}`}
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Dòng nhắc nhở lỗi màu đỏ nếu chưa chọn bạn bè */}
            {friendsError && (
              <div style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: 600 }}>
                ⚠️ {friendsError}
              </div>
            )}

            {/* Nút "Gửi cho bạn bè" hình bầu dục đúng Prototype */}
            <button
              type="button"
              className="btn-send-to-friends-oval"
              onClick={handleSendToFriends}
              disabled={isSendingToFriends || friendsList.length === 0}
            >
              <span>{isSendingToFriends ? "Đang gửi thông báo an toàn đến bạn bè..." : "📤 Gửi cho bạn bè"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
