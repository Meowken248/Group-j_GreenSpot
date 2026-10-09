import React, { useState, useEffect, useCallback } from "react";
import type {
  FriendRequestItem,
  FriendItem,
  GreenCitizenSuggestion,
  FollowingItem,
  ToastMessage,
} from "./types";
import { friendsService } from "./services";
import { FriendRequestsView } from "./components/FriendRequestsView";
import { FriendListView } from "./components/FriendListView";
import { UnfriendModal } from "./components/UnfriendModal";
import "./Friends.scss";

interface FriendsContainerProps {
  onBackToHome?: () => void;
  onNavigateToProfile?: () => void;
  currentUser?: {
    user_id?: string;
    email?: string;
    full_name?: string;
    role?: string;
  } | null;
}

export const FriendsContainer: React.FC<FriendsContainerProps> = ({
  onBackToHome,
  onNavigateToProfile,
  currentUser,
}) => {
  // Tab điều hướng: "requests" (Màn 1) hoặc "friends" (Màn 2)
  const [activeSubTab, setActiveSubTab] = useState<"requests" | "friends">("requests");

  // Dữ liệu Màn 1
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [suggestions, setSuggestions] = useState<GreenCitizenSuggestion[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Dữ liệu Màn 2
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [followingList, setFollowingList] = useState<FollowingItem[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dữ liệu Màn 3 Popup Hủy kết bạn
  const [selectedFriendToUnfriend, setSelectedFriendToUnfriend] = useState<FriendItem | null>(null);
  const [isUnfriendModalOpen, setIsUnfriendModalOpen] = useState(false);
  const [isUnfriendProcessing, setIsUnfriendProcessing] = useState(false);

  // Toasts thông báo tự biến mất sau 3 giây
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);

    // Ràng buộc đặc tả: Toast thông báo hiển thị trong 3 giây
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;
      if (activeSubTab === "requests") {
        setLoadingRequests(true);
        setLoadingSuggestions(true);
        Promise.all([
          friendsService.getReceivedRequests(),
          friendsService.getSuggestions(),
        ])
          .then(([reqData, sugData]) => {
            if (!isCancelled) {
              setRequests(reqData);
              setSuggestions(sugData);
            }
          })
          .catch(() => {
            if (!isCancelled) {
              showToast("Không thể tải dữ liệu lời mời kết bạn", "error");
            }
          })
          .finally(() => {
            if (!isCancelled) {
              setLoadingRequests(false);
              setLoadingSuggestions(false);
            }
          });
      } else {
        setLoadingFriends(true);
        setLoadingFollowing(true);
        Promise.all([
          friendsService.getFriendsList(searchQuery),
          friendsService.getFollowingList(),
        ])
          .then(([frData, folData]) => {
            if (!isCancelled) {
              setFriends(frData);
              setFollowingList(folData);
            }
          })
          .catch(() => {
            if (!isCancelled) {
              showToast("Không thể tải danh sách bạn bè", "error");
            }
          })
          .finally(() => {
            if (!isCancelled) {
              setLoadingFriends(false);
              setLoadingFollowing(false);
            }
          });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeSubTab, searchQuery, showToast]);

  // =========================================================================
  // XỬ LÝ SỰ KIỆN MÀN 1
  // =========================================================================

  // Chấp nhận lời mời kết bạn (làm mờ dòng tức thì)
  const handleAcceptRequest = async (req: FriendRequestItem) => {
    // Làm mờ dòng tức thì theo đặc tả
    setRequests((prev) =>
      prev.map((r) => (r.request_id === req.request_id ? { ...r, isFading: true } : r))
    );

    try {
      const res = await friendsService.respondToRequest(req.request_id, "ACCEPT");
      showToast(res.message, "success");

      // Đợi hiệu ứng mờ dòng 400ms rồi gỡ bản ghi
      setTimeout(() => {
        setRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
      }, 400);
    } catch {
      showToast("Xảy ra lỗi khi chấp nhận lời mời", "error");
      setRequests((prev) =>
        prev.map((r) => (r.request_id === req.request_id ? { ...r, isFading: false } : r))
      );
    }
  };

  // Từ chối lời mời kết bạn (làm mờ dòng tức thì)
  const handleRejectRequest = async (req: FriendRequestItem) => {
    // Làm mờ dòng tức thì theo đặc tả
    setRequests((prev) =>
      prev.map((r) => (r.request_id === req.request_id ? { ...r, isFading: true } : r))
    );

    try {
      const res = await friendsService.respondToRequest(req.request_id, "REJECT");
      showToast(res.message, "info");

      setTimeout(() => {
        setRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
      }, 400);
    } catch {
      showToast("Xảy ra lỗi khi từ chối lời mời", "error");
      setRequests((prev) =>
        prev.map((r) => (r.request_id === req.request_id ? { ...r, isFading: false } : r))
      );
    }
  };

  // Gửi lời mời kết bạn từ Gợi ý
  const handleSendFriendRequest = async (sug: GreenCitizenSuggestion) => {
    try {
      const res = await friendsService.sendFriendRequest(sug.user_id);
      showToast(res.message, "success");
      setSuggestions((prev) =>
        prev.map((s) => (s.user_id === sug.user_id ? { ...s, isRequested: true } : s))
      );
    } catch {
      showToast("Không thể gửi lời mời kết bạn", "error");
    }
  };

  // Bật/tắt theo dõi 1 chiều
  const handleToggleFollow = async (sug: GreenCitizenSuggestion) => {
    try {
      if (sug.is_following) {
        await friendsService.unfollowUser(sug.user_id);
        showToast(`Đã bỏ theo dõi ${sug.full_name}`, "info");
        setSuggestions((prev) =>
          prev.map((s) => (s.user_id === sug.user_id ? { ...s, is_following: false } : s))
        );
      } else {
        await friendsService.followUser(sug.user_id);
        showToast(`Đang theo dõi ${sug.full_name}`, "success");
        setSuggestions((prev) =>
          prev.map((s) => (s.user_id === sug.user_id ? { ...s, is_following: true } : s))
        );
      }
    } catch {
      showToast("Xử lý theo dõi thất bại", "error");
    }
  };

  // =========================================================================
  // XỬ LÝ SỰ KIỆN MÀN 2 & MÀN 3
  // =========================================================================

  // Mở Popup xác nhận hủy kết bạn
  const handleOpenUnfriendModal = (friend: FriendItem) => {
    setSelectedFriendToUnfriend(friend);
    setIsUnfriendModalOpen(true);
  };

  // Đóng Popup
  const handleCloseUnfriendModal = () => {
    if (!isUnfriendProcessing) {
      setIsUnfriendModalOpen(false);
      setSelectedFriendToUnfriend(null);
    }
  };

  // Xác nhận hủy kết bạn (Màn 3)
  const handleConfirmUnfriend = async () => {
    if (!selectedFriendToUnfriend) return;

    setIsUnfriendProcessing(true);
    const targetFriend = selectedFriendToUnfriend;

    try {
      await friendsService.unfriendUser(targetFriend.user_id);
      setIsUnfriendModalOpen(false);
      setSelectedFriendToUnfriend(null);

      // Ràng buộc đặc tả: Toast 3 giây thông báo "Đã huỷ kết bạn với {Họ tên}"
      showToast(`Đã huỷ kết bạn với ${targetFriend.full_name}`, "success");

      // Xóa bản ghi khỏi danh sách bạn bè
      setFriends((prev) => prev.filter((f) => f.user_id !== targetFriend.user_id));
    } catch {
      showToast("Xảy ra lỗi khi hủy kết bạn", "error");
    } finally {
      setIsUnfriendProcessing(false);
    }
  };

  // Bỏ theo dõi từ danh sách đang theo dõi
  const handleUnfollowFromList = async (targetUserId: string, name: string) => {
    try {
      await friendsService.unfollowUser(targetUserId);
      showToast(`Đã bỏ theo dõi ${name}`, "info");
      setFollowingList((prev) => prev.filter((item) => item.user_id !== targetUserId));
    } catch {
      showToast("Không thể bỏ theo dõi", "error");
    }
  };

  // Nhắn tin
  const handleOpenChat = (friend: FriendItem) => {
    showToast(`Mở hộp thoại trò chuyện cùng ${friend.full_name}`, "info");
  };

  return (
    <div className="friends-page-wrapper">
      {/* 1. KHUNG CHUNG: HEADER */}
      <header className="friends-header">
        <div className="header-inner">
          {/* Logo & Trở về */}
          <div className="brand-section" onClick={onBackToHome} role="button" tabIndex={0}>
            <div className="brand-logo">🌿</div>
            <div className="brand-text">GreenSpot Mạng Xã Hội Xanh</div>
          </div>

          {/* Menu chuyển đổi Màn 1 và Màn 2 */}
          <div className="header-navigation-tabs">
            <button
              type="button"
              className={`nav-tab-btn ${activeSubTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveSubTab("requests")}
            >
              <span>📩</span>
              <span>Lời mời & Gợi ý</span>
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${activeSubTab === "friends" ? "active" : ""}`}
              onClick={() => setActiveSubTab("friends")}
            >
              <span>👥</span>
              <span>Bạn bè & Theo dõi</span>
            </button>
          </div>

          {/* Chuông thông báo & Avatar */}
          <div className="header-actions">
            <button
              type="button"
              className="bell-btn"
              title="Thông báo tương tác"
              onClick={() => showToast("Bạn không có thông báo mới", "info")}
            >
              🔔
            </button>

            <div
              className="user-avatar-pill"
              onClick={onNavigateToProfile}
              role="button"
              tabIndex={0}
              title="Xem trang cá nhân của bạn"
            >
              <div className="avatar-circle">
                {currentUser?.full_name ? currentUser.full_name.trim().slice(0, 2).toUpperCase() : "GS"}
              </div>
              <span className="user-name">
                {currentUser?.full_name || "Công Dân Xanh"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. THÂN TRANG (MAIN CONTENT): 2 KHỐI THEO CHIỀU NGANG */}
      <main className="friends-main-container">
        {activeSubTab === "requests" ? (
          <FriendRequestsView
            requests={requests}
            suggestions={suggestions}
            loadingRequests={loadingRequests}
            loadingSuggestions={loadingSuggestions}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            onSendRequest={handleSendFriendRequest}
            onToggleFollow={handleToggleFollow}
          />
        ) : (
          <FriendListView
            friends={friends}
            followingList={followingList}
            loadingFriends={loadingFriends}
            loadingFollowing={loadingFollowing}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenUnfriendModal={handleOpenUnfriendModal}
            onUnfollow={handleUnfollowFromList}
            onOpenChat={handleOpenChat}
          />
        )}
      </main>

      {/* 3. KHUNG CHUNG: FOOTER */}
      <footer className="friends-footer">
        <div className="footer-inner">
          <div className="copyright-text">
            © 2026 GreenSpot. Hệ sinh thái giám sát môi trường và cộng đồng công dân xanh.
          </div>
          <div className="footer-links">
            <a href="#privacy">Chính sách bảo mật</a>
            <a href="#terms">Điều khoản sử dụng</a>
            <a href="#contact">Liên hệ hỗ trợ</a>
          </div>
        </div>
      </footer>

      {/* 4. MÀN 3: POPUP XÁC NHẬN HỦY KẾT BẠN */}
      <UnfriendModal
        isOpen={isUnfriendModalOpen}
        friend={selectedFriendToUnfriend}
        isProcessing={isUnfriendProcessing}
        onClose={handleCloseUnfriendModal}
        onConfirm={handleConfirmUnfriend}
      />

      {/* 5. TOAST NOTIFICATIONS CONTAINER (3 GIÂY) */}
      <div className="friends-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`friends-toast ${toast.type}`}>
            <span>
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
