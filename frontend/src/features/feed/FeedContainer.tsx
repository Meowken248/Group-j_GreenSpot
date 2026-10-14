/**
 * FeedContainer.tsx - Trung tâm điều phối Bảng tin Geo-Feed (Chức năng STT 08)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 97 - 102)
 * Kiến trúc 3 cột mạng xã hội Facebook/Threads cao cấp
 */

import React, { useState, useEffect, useCallback } from "react";
import type {
  FeedTab,
  FeedSortBy,
  FeedPostItem,
} from "./types/feed.types";
import { feedService } from "./services/feedService";
import { FeedLeftSidebar } from "./components/FeedLeftSidebar";
import { FeedRightSidebar } from "./components/FeedRightSidebar";
import { FeedComposerBox } from "./components/FeedComposerBox";
import { FeedPostCard } from "./components/FeedPostCard";
import { BirthdayBanner } from "./components/BirthdayBanner";
import { RadiusPickerModal } from "./components/RadiusPickerModal";
import { PostCreatorContainer } from "../posts/PostCreatorContainer";
import { EditPostModal } from "../profile/components/EditPostModal";
import { DeletePostModal } from "../profile/components/DeletePostModal";
import { HidePostModal } from "../profile/components/HidePostModal";
import { PostCommentsView, SharePostModal } from "../comments";
import api from "../../api/client";
import { AUTH_STORAGE_KEYS } from "../auth/types/auth.types";
import "./styles/Feed.scss";

interface FeedToast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface FeedContainerProps {
  onNavigateTab?: (tab: string) => void;
  onNavigateLogin?: () => void;
}

export const FeedContainer: React.FC<FeedContainerProps> = ({
  onNavigateTab,
  onNavigateLogin,
}) => {
  // 1. Quản lý người dùng hiện tại
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
        setCurrentUser(userStr ? JSON.parse(userStr) : null);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener("auth_change", handleAuthChange);
    return () => window.removeEventListener("auth_change", handleAuthChange);
  }, []);

  const isLoggedIn = Boolean(
    currentUser && localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
  );

  // 2. Trạng thái điều hướng và lọc Geo-Feed
  const [activeTab, setActiveTab] = useState<FeedTab>("nearby");
  const [radiusKm, setRadiusKm] = useState<number>(2.0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<FeedSortBy>("newest");
  const [district, setDistrict] = useState<string>("");

  // 3. Trạng thái định vị GPS thực tế
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [gpsStatus, setGpsStatus] = useState<"locating" | "ready" | "denied">(
    "locating"
  );

  // 4. Dữ liệu bài viết
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [, setTotalPosts] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 5. Quản lý Modal
  const [showRadiusModal, setShowRadiusModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<FeedPostItem | null>(null);
  const [deletingPost, setDeletingPost] = useState<FeedPostItem | null>(null);
  const [hidingPost, setHidingPost] = useState<FeedPostItem | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<FeedPostItem | null>(null);
  const [sharingPost, setSharingPost] = useState<FeedPostItem | null>(null);

  // 6. Quản lý Toast thông báo
  const [toasts, setToasts] = useState<FeedToast[]>([]);

  const showToast = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  // =========================================================================
  // A. LẤY TOẠ ĐỘ GPS CỦA THIẾT BỊ (SRS MÀN 1)
  // =========================================================================
  const requestGeolocation = useCallback(() => {
    setGpsStatus("locating");
    if (!navigator.geolocation) {
      // Thiết bị không hỗ trợ Geolocation -> fallback trung tâm TP.HCM
      setUserCoords({ lat: 10.7769, lon: 106.7009 });
      setGpsStatus("ready");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setGpsStatus("ready");
      },
      (_err) => {
        // Người dùng từ chối quyền hoặc lỗi thiết bị
        setGpsStatus("denied");
        // Vẫn dùng fallback TP.HCM để hiển thị bài viết
        setUserCoords({ lat: 10.7769, lon: 106.7009 });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  // =========================================================================
  // B. TRUY VẤN DANH SÁCH BÀI VIẾT TỪ BACKEND
  // =========================================================================
  const fetchFeed = useCallback(
    async (
      targetPage = 1,
      append = false,
      currentTab = activeTab,
      currentRadius = radiusKm,
      currentCat = selectedCategory,
      currentSort = sortBy,
      currentDist = district
    ) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await feedService.getGeoFeed({
          tab: currentTab,
          latitude: userCoords?.lat,
          longitude: userCoords?.lon,
          radius_km: currentRadius,
          district: currentDist,
          category: currentCat,
          sort_by: currentSort,
          page: targetPage,
          limit: 10,
        });

        if (append) {
          setPosts((prev) => [...prev, ...res.items]);
        } else {
          setPosts(res.items);
        }
        setTotalPosts(res.total);
        setHasMore(res.has_more);
        setPage(targetPage);
      } catch (err: any) {
        const msg = err?.response?.data?.detail || "Không thể tải bảng tin. Vui lòng thử lại";
        setError(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, radiusKm, selectedCategory, sortBy, district, userCoords]
  );

  // Nạp dữ liệu khi thay đổi Tab, Bán kính, Lọc, Tọa độ GPS
  useEffect(() => {
    if (gpsStatus !== "locating") {
      fetchFeed(1, false);
    }
  }, [gpsStatus, activeTab, radiusKm, selectedCategory, sortBy, district, fetchFeed]);

  // =========================================================================
  // C. XỬ LÝ CHUYỂN TAB & KIỂM TRA ĐĂNG NHẬP (SRS MÀN 2)
  // =========================================================================
  const handleTabChange = (tab: FeedTab) => {
    if ((tab === "friends" || tab === "groups") && !isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    setActiveTab(tab);
    setPage(1);
  };

  // =========================================================================
  // D. XỬ LÝ ĐỔI BÁN KÍNH (SRS MÀN 3)
  // =========================================================================
  const handleApplyRadius = (newRadius: number) => {
    setRadiusKm(newRadius);
    setShowRadiusModal(false);
    showToast("success", `Đã cập nhật bán kính: ${newRadius < 1 ? `${Math.round(newRadius * 1000)}m` : `${newRadius.toFixed(1)} km`}`);
    fetchFeed(1, false, activeTab, newRadius);
  };

  // Nạp thêm bài viết
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchFeed(page + 1, true);
  };

  // Thả cảm xúc
  const handleReactPost = async (postId: string, type: string) => {
    await feedService.reactToPost(postId, type);
  };

  // Điều hướng ngoài
  const handleNavigate = (route: string) => {
    if (onNavigateTab) {
      onNavigateTab(route);
    } else {
      window.location.hash = `#${route}`;
    }
  };

  // Cập nhật sau khi sửa bài viết thành công (STT 13)
  const handleEditSuccess = (updated: any) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.post_id === updated.post_id
          ? {
              ...p,
              content: updated.content,
              is_edited: true,
              address: updated.address || p.address,
              latitude: updated.latitude ?? p.latitude,
              longitude: updated.longitude ?? p.longitude,
              visibility: updated.visibility || p.visibility,
            }
          : p
      )
    );
    setEditingPost(null);
    showToast("success", "Cập nhật bài viết thành công!");
  };

  // Cập nhật sau khi xoá bài viết thành công (STT 13)
  const handleDeleteSuccess = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.post_id !== postId));
    setTotalPosts((prev) => Math.max(0, prev - 1));
    setDeletingPost(null);
    showToast("success", "Đã xoá bài viết khỏi bảng tin.");
  };

  // Cập nhật sau khi ẩn bài viết thành công (STT 13)
  const handleHideSuccess = (hiddenPost: any) => {
    setPosts((prev) => prev.filter((p) => p.post_id !== hiddenPost.post_id));
    setTotalPosts((prev) => Math.max(0, prev - 1));
    setHidingPost(null);
    showToast("info", "Đã ẩn bài viết. Chỉ bạn nhìn thấy bài này.");
  };

  // Điều hướng xem bình luận bài viết qua URL Hash (#post-comments?id=...)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes("post-comments") || hash.includes("comments")) {
        const idMatch = hash.match(/[?&]id=([a-fA-F0-9-]+)/);
        if (idMatch && idMatch[1]) {
          const targetId = idMatch[1];
          const found = posts.find((p) => p.post_id === targetId);
          if (found) {
            setSelectedPostForComments(found);
          } else {
            api
              .get(`/posts/${targetId}`)
              .then((res) => {
                if (res.data) setSelectedPostForComments(res.data);
              })
              .catch(() => {
                showToast("error", "Bài viết không còn tồn tại");
                window.location.hash = "#posts";
              });
          }
        }
      } else if (
        !hash.includes("post-comments") &&
        !hash.includes("comments") &&
        selectedPostForComments
      ) {
        setSelectedPostForComments(null);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [posts, selectedPostForComments, showToast]);

  // Nếu đang mở xem bình luận bài viết (Màn 1 & Màn 2 - STT 14)
  if (selectedPostForComments) {
    return (
      <PostCommentsView
        post={selectedPostForComments}
        onBackToFeed={() => {
          setSelectedPostForComments(null);
          if (
            window.location.hash.includes("post-comments") ||
            window.location.hash.includes("comments")
          ) {
            window.location.hash = "#posts";
          }
        }}
        onNavigateLogin={onNavigateLogin}
        onPostUpdated={(updatedPost) => {
          setPosts((prev) =>
            prev.map((p) => (p.post_id === updatedPost.post_id ? updatedPost : p))
          );
          setSelectedPostForComments(updatedPost);
        }}
      />
    );
  }

  return (
    <div className="greenspot-feed-container">
      {/* Toast notifications */}
      <div className="feed-toasts-queue" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`feed-toast-card toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span className="toast-text">{t.message}</span>
          </div>
        ))}
      </div>

      <div className="feed-layout-grid">
        {/* =================================================================== */}
        {/* CỘT TRÁI: ĐIỀU HƯỚNG TABS & MINI PROFILE */}
        {/* =================================================================== */}
        <FeedLeftSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentUser={currentUser}
          onNavigate={handleNavigate}
        />

        {/* =================================================================== */}
        {/* CỘT GIỮA: DÒNG THỜI GIAN BẢNG TIN CHÍNH */}
        {/* =================================================================== */}
        <main className="feed-main-stream">
          {/* 1. Khung đăng bài nhanh Facebook (STT 09) */}
          <FeedComposerBox
            userAvatar={currentUser?.avatar_url}
            userName={currentUser?.full_name}
            onOpenCreatePost={() => {
              if (!isLoggedIn) {
                setShowLoginPrompt(true);
              } else {
                setShowCreateModal(true);
              }
            }}
          />

          {/* 2. Banner Sinh nhật bạn bè (STT 17) */}
          <BirthdayBanner
            onSendWish={(friendName) =>
              showToast("success", `Đã gửi lời chúc xanh đến ${friendName}!`)
            }
          />

          {/* 3. Banner Cảnh báo cấp quyền GPS nếu bị từ chối */}
          {gpsStatus === "denied" && activeTab === "nearby" && (
            <div className="feed-gps-alert-card">
              <div className="gps-alert-icon">📍</div>
              <div className="gps-alert-content">
                <h5>Vui lòng bật định vị GPS</h5>
                <p>
                  Bật quyền vị trí giúp hệ thống quét và đo khoảng cách chính xác đến các điểm ô nhiễm xung quanh bạn.
                </p>
              </div>
              <button
                type="button"
                className="btn-enable-gps"
                onClick={requestGeolocation}
              >
                Bật định vị
              </button>
            </div>
          )}

          {/* 4. Danh sách bài viết Geo-Feed Stream */}
          <div className="feed-cards-collection">
            {loading ? (
              // Skeleton loading khi đang tải bài viết
              <div className="feed-skeleton-loader">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="post-skeleton-card">
                    <div className="skeleton-header">
                      <div className="skeleton-avatar"></div>
                      <div className="skeleton-lines">
                        <div className="skeleton-line line-short"></div>
                        <div className="skeleton-line line-tiny"></div>
                      </div>
                    </div>
                    <div className="skeleton-body">
                      <div className="skeleton-line line-full"></div>
                      <div className="skeleton-line line-med"></div>
                    </div>
                    <div className="skeleton-media"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              // Khối lỗi khi tải bảng tin (SRS pp. 99)
              <div className="feed-error-state-box">
                <div className="error-icon">⚠️</div>
                <h4 className="error-title">Không thể tải bảng tin</h4>
                <p className="error-desc">{error}</p>
                <button
                  type="button"
                  className="btn-feed-retry"
                  onClick={() => fetchFeed(1, false)}
                >
                  Thử lại
                </button>
              </div>
            ) : posts.length === 0 ? (
              // Các trạng thái rỗng chuẩn SRS (pp. 99 - 100)
              <div className="feed-empty-state-box">
                <div className="empty-state-emoji">
                  {activeTab === "nearby"
                    ? "📡"
                    : activeTab === "friends"
                    ? "👥"
                    : activeTab === "groups"
                    ? "🤝"
                    : "🌱"}
                </div>

                <h4 className="empty-state-title">
                  {activeTab === "nearby"
                    ? `Không có bài viết nào trong bán kính ${radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm} km`}`
                    : activeTab === "friends"
                    ? "Bạn chưa có bài viết nào từ bạn bè"
                    : activeTab === "groups"
                    ? "Bạn chưa tham gia nhóm tình nguyện nào"
                    : "Chưa có bài viết nào phù hợp"}
                </h4>

                <p className="empty-state-desc">
                  {activeTab === "nearby"
                    ? "Hãy thử nới rộng phạm vi quét radar hoặc chia sẻ bài viết đầu tiên tại khu vực của bạn!"
                    : activeTab === "friends"
                    ? "Kết nối thêm bạn bè cùng chung lý tưởng sống xanh để cập nhật tin tức."
                    : activeTab === "groups"
                    ? "Gia nhập các hội nhóm dọn rác, tái chế tại địa phương để chung tay hành động."
                    : "Thử đổi sang chủ đề khác hoặc bỏ bớt các bộ lọc đang chọn."}
                </p>

                {/* Các nút hành động tương ứng với từng trạng thái rỗng */}
                {activeTab === "nearby" && (
                  <button
                    type="button"
                    className="btn-empty-action"
                    onClick={() => setShowRadiusModal(true)}
                  >
                    Mở rộng bán kính
                  </button>
                )}

                {activeTab === "friends" && (
                  <button
                    type="button"
                    className="btn-empty-action"
                    onClick={() => handleNavigate("friends")}
                  >
                    Gợi ý kết bạn
                  </button>
                )}

                {activeTab === "groups" && (
                  <button
                    type="button"
                    className="btn-empty-action"
                    onClick={() => showToast("info", "Đang chuyển đến danh mục nhóm...")}
                  >
                    Khám phá nhóm tình nguyện
                  </button>
                )}
              </div>
            ) : (
              // Danh sách bài viết thực tế
              posts.map((post) => (
                <FeedPostCard
                  key={post.post_id}
                  post={post}
                  currentUserId={currentUser?.user_id || currentUser?.id}
                  onEditPost={(p) => setEditingPost(p)}
                  onHidePost={(p) => setHidingPost(p)}
                  onDeletePost={(p) => setDeletingPost(p)}
                  onReactPost={handleReactPost}
                  onOpenComments={(p) => {
                    setSelectedPostForComments(p);
                    window.location.hash = `#post-comments?id=${p.post_id}`;
                  }}
                  onOpenShare={(p) => setSharingPost(p)}
                  onShowToast={showToast}
                />
              ))
            )}
          </div>

          {/* 5. Nút Xem thêm / Infinite Scroll (SRS pp. 100) */}
          {!loading && !error && posts.length > 0 && (
            <div className="feed-pagination-footer">
              {hasMore ? (
                <button
                  type="button"
                  className="btn-load-more-feed"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Đang tải thêm bài viết..." : "Xem thêm"}
                </button>
              ) : (
                <div className="all-posts-loaded-text">
                  Bạn đã xem hết bài viết
                </div>
              )}
            </div>
          )}
        </main>

        {/* =================================================================== */}
        {/* CỘT PHẢI: RADAR BÁN KÍNH GPS, BỘ LỌC CHỦ ĐỀ, SẮP XẾP */}
        {/* =================================================================== */}
        <FeedRightSidebar
          radiusKm={radiusKm}
          onOpenRadiusPicker={() => setShowRadiusModal(true)}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          sortBy={sortBy}
          onSelectSortBy={(s) => setSortBy(s)}
          activeDistrict={district}
          onSelectDistrict={(d) => setDistrict(d)}
          isDistrictTab={activeTab === "district"}
        />
      </div>

      {/* =================================================================== */}
      {/* CÁC SUB-MODALS HỆ THỐNG */}
      {/* =================================================================== */}

      {/* 1. Modal Slider chọn bán kính (Màn 3) */}
      <RadiusPickerModal
        isOpen={showRadiusModal}
        currentRadius={radiusKm}
        onApply={handleApplyRadius}
        onClose={() => setShowRadiusModal(false)}
      />

      {/* 2. Modal Tạo bài viết (STT 09) */}
      {showCreateModal && (
        <div className="feed-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div
            className="feed-modal-content create-post-modal-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="create-modal-header">
              <h3>Tạo bài viết cộng đồng (STT 09)</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <PostCreatorContainer
              onNavigateHome={() => {
                setShowCreateModal(false);
                fetchFeed(1, false);
              }}
              onNavigateLogin={() => {
                setShowCreateModal(false);
                onNavigateLogin?.();
              }}
              onViewCreatedPost={(_id) => {
                setShowCreateModal(false);
                showToast("success", "Bài viết đã xuất hiện trên bảng tin!");
                fetchFeed(1, false);
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Modal Sửa bài viết (STT 13) */}
      {editingPost && (
        <EditPostModal
          isOpen={Boolean(editingPost)}
          post={editingPost as any}
          onClose={() => setEditingPost(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 4. Modal Xóa bài viết (STT 13) */}
      {deletingPost && (
        <DeletePostModal
          isOpen={Boolean(deletingPost)}
          post={deletingPost as any}
          onClose={() => setDeletingPost(null)}
          onDeleted={handleDeleteSuccess}
        />
      )}

      {/* 5. Modal Ẩn bài viết (STT 13) */}
      {hidingPost && (
        <HidePostModal
          isOpen={Boolean(hidingPost)}
          post={hidingPost as any}
          onClose={() => setHidingPost(null)}
          onUndoSuccess={() => {
            setHidingPost(null);
            showToast("success", "Đã hoàn tác ẩn bài viết.");
          }}
          onConfirmedHidden={handleHideSuccess}
        />
      )}

      {/* 6. Popup Nhắc đăng nhập (SRS pp. 100) */}
      {showLoginPrompt && (
        <div
          className="feed-modal-backdrop"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="feed-modal-content login-prompt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="login-prompt-icon">🔒</div>
            <h4 className="login-prompt-title">Vui lòng đăng nhập</h4>
            <p className="login-prompt-desc">
              Bạn cần đăng nhập tài khoản để xem bài viết từ bạn bè kết nối hoặc tham gia hoạt động của các nhóm tình nguyện xanh.
            </p>
            <div className="login-prompt-actions">
              <button
                type="button"
                className="btn-prompt-cancel"
                onClick={() => setShowLoginPrompt(false)}
              >
                Để sau
              </button>
              <button
                type="button"
                className="btn-prompt-login"
                onClick={() => {
                  setShowLoginPrompt(false);
                  onNavigateLogin ? onNavigateLogin() : handleNavigate("auth");
                }}
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Chia sẻ bài viết (STT 14 Màn 3) */}
      {sharingPost && (
        <SharePostModal
          isOpen={Boolean(sharingPost)}
          postId={sharingPost.post_id}
          onClose={() => setSharingPost(null)}
          onShareSuccess={(message) => {
            showToast("success", message);
            const newShares = (sharingPost.shares_count || 0) + 1;
            setPosts((prev) =>
              prev.map((p) =>
                p.post_id === sharingPost.post_id
                  ? { ...p, shares_count: newShares }
                  : p
              )
            );
          }}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};

