import React, { useState, useEffect } from "react";
import type {
  MediaItem,
  LocationData,
  FriendOption,
  VolunteerGroupOption,
  PostDetail,
} from "./types/postTypes";
import { postService } from "./services/postService";
import { MediaUploader } from "./components/MediaUploader";
import { LocationPickerModal } from "./components/LocationPickerModal";
import { TagFriendsAndGroupModal } from "./components/TagFriendsAndGroupModal";
import { PostSuccessModal } from "./components/PostSuccessModal";
import { DiscardConfirmModal } from "./components/DiscardConfirmModal";
import { AUTH_STORAGE_KEYS } from "../auth/types/auth.types";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import "./styles/PostCreator.scss";

interface PostCreatorContainerProps {
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onViewCreatedPost?: (postId: string) => void;
}

export const PostCreatorContainer: React.FC<PostCreatorContainerProps> = ({
  onNavigateHome,
  onNavigateLogin,
  onViewCreatedPost,
}) => {
  // 1. Kiểm tra trạng thái đăng nhập & thông tin người dùng
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const token =
        localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) ||
        localStorage.getItem("access_token");
      return Boolean(token);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const token =
          localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) ||
          localStorage.getItem("access_token");
        setIsLoggedIn(Boolean(token));
        const userStr = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
        setCurrentUser(userStr ? JSON.parse(userStr) : null);
      } catch {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("auth_change", handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("auth_change", handleAuthChange);
    };
  }, []);

  // 2. Dữ liệu form bài đăng (Màn 1)
  const [content, setContent] = useState<string>("");
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FRIENDS" | "ONLY_ME">("PUBLIC");

  // 3. Danh sách bạn bè & nhóm
  const [friendsList, setFriendsList] = useState<FriendOption[]>([]);
  const [groupsList, setGroupsList] = useState<VolunteerGroupOption[]>([]);

  // 4. Trạng thái Modal
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showTagModal, setShowTagModal] = useState<boolean>(false);
  const [tagModalMode, setTagModalMode] = useState<"FRIENDS" | "GROUP">("FRIENDS");
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);

  // 5. Trạng thái gửi & lỗi
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdPost, setCreatedPost] = useState<PostDetail | null>(null);

  // Tải danh sách bạn bè và nhóm khi mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [friends, groups] = await Promise.all([
          postService.getFriends(),
          postService.getVolunteerGroups(),
        ]);
        setFriendsList(friends);
        setGroupsList(groups);
      } catch (err) {
        console.warn("Lỗi tải danh mục bạn bè/nhóm:", err);
      }
    };
    fetchData();
  }, []);

  // Kiểm tra độ dài nội dung (tối đa 3000 ký tự)
  const charCount = content.length;
  const isOverCharLimit = charCount > 3000;

  // Kiểm tra tính hợp lệ của bài viết
  const hasText = content.trim().length > 0;
  const hasMedia = mediaList.length > 0;
  const isValidPost = (hasText || hasMedia) && !isOverCharLimit;

  // Xử lý gắn hashtag nhanh
  const handleAddHashtag = (tag: string) => {
    if (content.includes(tag)) return;
    const newContent = content ? `${content} ${tag}` : tag;
    setContent(newContent);
    setContentError(null);
  };

  // Mở modal vị trí (Màn 2)
  const handleOpenLocation = () => {
    setShowLocationModal(true);
  };

  // Mở modal tag bạn bè (Màn 3)
  const handleOpenTagFriends = () => {
    setTagModalMode("FRIENDS");
    setShowTagModal(true);
  };

  // Mở modal chọn nhóm (Màn 3)
  const handleOpenSelectGroup = () => {
    setTagModalMode("GROUP");
    setShowTagModal(true);
  };

  // Xử lý nút Huỷ
  const handleCancelClick = () => {
    const hasEnteredData = content.trim().length > 0 || mediaList.length > 0 || selectedLocation !== null;
    if (hasEnteredData) {
      setShowDiscardModal(true);
    } else {
      if (onNavigateHome) onNavigateHome();
    }
  };

  // Xác nhận thoát hủy
  const handleConfirmDiscard = () => {
    setShowDiscardModal(false);
    setContent("");
    setMediaList([]);
    setSelectedLocation(null);
    setSelectedFriendIds([]);
    setSelectedGroupId(null);
    if (onNavigateHome) onNavigateHome();
  };

  // Xử lý Đăng bài (Submit)
  const handlePublishPost = async () => {
    setContentError(null);
    setSubmitError(null);

    // Bắt buộc đăng nhập
    if (!isLoggedIn) {
      if (onNavigateLogin) {
        onNavigateLogin();
      } else {
        setSubmitError("Vui lòng đăng nhập tài khoản để đăng bài viết");
      }
      return;
    }

    // 1. Kiểm tra: Để trống cả nội dung và ảnh/video
    if (!hasText && !hasMedia) {
      setContentError("Vui lòng nhập nội dung hoặc thêm ảnh/video");
      return;
    }

    // 2. Kiểm tra: Quá 3000 ký tự
    if (isOverCharLimit) {
      setContentError("Nội dung bài viết tối đa 3000 ký tự");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        content: content.trim(),
        media_urls: mediaList.map((m) => ({
          url: m.url,
          media_type: m.media_type,
          size_bytes: m.size_bytes,
          duration_seconds: m.duration_seconds,
        })),
        latitude: selectedLocation?.latitude || null,
        longitude: selectedLocation?.longitude || null,
        address: selectedLocation?.address || null,
        tagged_friend_ids: selectedFriendIds,
        group_id: selectedGroupId || null,
        visibility: visibility,
      };

      const newPost = await postService.createPost(payload);
      setCreatedPost(newPost);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Lỗi đăng bài:", err);
      const detailMsg = err?.response?.data?.detail?.message;
      setSubmitError(detailMsg || "Không thể đăng bài viết lúc này. Vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nhóm đang chọn
  const selectedGroupObj = groupsList.find((g) => g.group_id === selectedGroupId);

  return (
    <div className="post-creator-container">
      {/* Tiêu đề trang */}
      <div className="post-creator-header">
        <div className="header-badge">Cộng đồng sinh thái GreenSpot</div>
        <h1>Tạo bài viết & Phản ánh môi trường</h1>
        <p>Gắn kết hình ảnh, toạ độ thực tế và bạn bè để lan tỏa thông điệp sống xanh.</p>
      </div>

      {!isLoggedIn && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef3c7", borderRadius: 8, color: "#92400e", fontSize: 14 }}>
          ⚠️ Bạn chưa đăng nhập. Vui lòng đăng nhập để có thể đăng bài viết công khai.
        </div>
      )}

      {/* Lưới 3 cột: NỘI DUNG (Trái) | TUỲ CHỌN (Giữa) | ĐĂNG (Phải) */}
      <div className="post-creator-grid">
        {/* ========================================================= */}
        {/* KHỐI 1: NỘI DUNG (Cột trái) */}
        {/* ========================================================= */}
        <div className="creator-card col-content">
          <div className="card-title">
            <span className="icon">✍️</span>
            <span>Khối Nội dung</span>
          </div>

          {/* Thông tin tác giả & Quyền riêng tư (Facebook-style) */}
          <div className="creator-author-row">
            <div className="creator-avatar-wrap">
              {currentUser?.avatar_url ? (
                <img
                  src={resolveMediaUrl(currentUser.avatar_url)}
                  alt={currentUser.full_name || "Bạn"}
                  className="creator-user-avatar"
                />
              ) : (
                <div className="creator-avatar-fallback">
                  {(currentUser?.full_name || "B").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="creator-meta-wrap">
              <span className="creator-user-name">
                {currentUser?.full_name || "Công dân sinh thái"}
                {selectedGroupObj && (
                  <span className="group-posting-label">
                    {" "}▶ 🏢 <strong>{selectedGroupObj.name}</strong>
                  </span>
                )}
              </span>
              <div className="creator-privacy-badge">
                {visibility === "PUBLIC" && <span>🌍 Công khai</span>}
                {visibility === "FRIENDS" && <span>👥 Bạn bè</span>}
                {visibility === "ONLY_ME" && <span>🔒 Chỉ mình tôi</span>}
              </div>
            </div>
          </div>

          <div className="textarea-wrapper">
            <textarea
              placeholder="Chia sẻ trải nghiệm sống xanh, phản ánh bãi rác hoặc kêu gọi dọn dẹp môi trường… (#Hashtag)"
              value={content}
              disabled={isSubmitting}
              className={contentError ? "is-error" : ""}
              onChange={(e) => {
                setContent(e.target.value);
                if (contentError) setContentError(null);
              }}
            />
            <div className={`char-counter ${isOverCharLimit ? "is-limit" : ""}`}>
              {charCount} / 3.000 ký tự
            </div>
          </div>

          {contentError && (
            <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginTop: -10, marginBottom: 12 }}>
              {contentError}
            </div>
          )}

          {/* Gợi ý Hashtags nhanh */}
          <div className="hashtag-suggestions">
            <span style={{ fontSize: 12, color: "#6b7280", alignSelf: "center", marginRight: 4 }}>Gợi ý:</span>
            {["#SaiGonXanh", "#ZeroWaste", "#ChủNhậtXanh", "#PhânLoạiRác", "#SongXanh"].map((tag) => (
              <button
                type="button"
                key={tag}
                className="tag-pill"
                onClick={() => handleAddHashtag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Khối tải ảnh/video xem trước */}
          <MediaUploader
            mediaList={mediaList}
            disabled={isSubmitting}
            onChange={(items) => {
              setMediaList(items);
              if (contentError) setContentError(null);
            }}
          />
        </div>

        {/* ========================================================= */}
        {/* KHỐI 2: TUỲ CHỌN (Cột giữa) */}
        {/* ========================================================= */}
        <div className="creator-card col-options">
          <div className="card-title">
            <span className="icon">⚙️</span>
            <span>Khối Tuỳ chọn</span>
          </div>

          <div className="option-button-group">
            {/* Nút 1: Gắn vị trí */}
            <button
              type="button"
              className="option-btn"
              disabled={isSubmitting}
              onClick={handleOpenLocation}
            >
              <span className="btn-icon">📍</span>
              <span>Gắn vị trí</span>
            </button>
            {selectedLocation && (
              <div className="selected-option-summary">
                <span className="text-wrap" title={selectedLocation.address}>
                  📍 {selectedLocation.address}
                </span>
                <button
                  type="button"
                  className="clear-btn"
                  title="Gỡ vị trí"
                  onClick={() => setSelectedLocation(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Nút 2: Gắn thẻ bạn bè */}
            <button
              type="button"
              className="option-btn"
              disabled={isSubmitting}
              onClick={handleOpenTagFriends}
            >
              <span className="btn-icon">👥</span>
              <span>Gắn thẻ bạn bè</span>
            </button>
            {selectedFriendIds.length > 0 && (
              <div className="selected-option-summary">
                <span className="text-wrap">
                  👥 Đã gắn thẻ {selectedFriendIds.length} người bạn
                </span>
                <button
                  type="button"
                  className="clear-btn"
                  title="Gỡ gắn thẻ"
                  onClick={() => setSelectedFriendIds([])}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Nút 3: Đăng vào nhóm */}
            <button
              type="button"
              className="option-btn"
              disabled={isSubmitting}
              onClick={handleOpenSelectGroup}
            >
              <span className="btn-icon">🏢</span>
              <span>Đăng vào nhóm</span>
            </button>
            {selectedGroupObj && (
              <div className="selected-option-summary">
                <span className="text-wrap">
                  🏢 {selectedGroupObj.name}
                </span>
                <button
                  type="button"
                  className="clear-btn"
                  title="Hủy chọn nhóm"
                  onClick={() => setSelectedGroupId(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Mục 4: Quyền riêng tư (Công khai / Bạn bè / Chỉ mình tôi) */}
            <div className="privacy-selector-card">
              <div className="privacy-selector-title">
                <span className="p-icon">🛡️</span>
                <span>Quyền riêng tư</span>
              </div>
              <div className="visibility-segmented-control">
                <button
                  type="button"
                  className={`visibility-option-btn ${visibility === "PUBLIC" ? "is-selected" : ""}`}
                  onClick={() => setVisibility("PUBLIC")}
                  disabled={isSubmitting}
                  title="Công khai: Mọi người đều có thể nhìn thấy bài viết này"
                >
                  <span className="vis-icon">🌍</span>
                  <span className="vis-text">Công khai</span>
                </button>
                <button
                  type="button"
                  className={`visibility-option-btn ${visibility === "FRIENDS" ? "is-selected" : ""}`}
                  onClick={() => setVisibility("FRIENDS")}
                  disabled={isSubmitting}
                  title="Bạn bè: Chỉ bạn bè của bạn mới nhìn thấy bài viết"
                >
                  <span className="vis-icon">👥</span>
                  <span className="vis-text">Bạn bè</span>
                </button>
                <button
                  type="button"
                  className={`visibility-option-btn ${visibility === "ONLY_ME" ? "is-selected" : ""}`}
                  onClick={() => setVisibility("ONLY_ME")}
                  disabled={isSubmitting}
                  title="Chỉ mình tôi: Chỉ một mình bạn mới nhìn thấy bài viết"
                >
                  <span className="vis-icon">🔒</span>
                  <span className="vis-text">Chỉ mình tôi</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* KHỐI 3: ĐĂNG (Cột phải) */}
        {/* ========================================================= */}
        <div className="creator-card col-submit">
          <div className="card-title">
            <span className="icon">🚀</span>
            <span>Khối Đăng</span>
          </div>

          <div className="submit-button-group">
            {submitError && (
              <div className="submit-error-banner">
                {submitError}
              </div>
            )}

            <button
              type="button"
              className={`btn-publish ${isSubmitting ? "is-loading" : ""}`}
              disabled={!isValidPost || isSubmitting}
              onClick={handlePublishPost}
            >
              {isSubmitting ? (
                <>
                  <span>🔄</span>
                  <span>Đang đăng bài…</span>
                </>
              ) : (
                <span>Đăng bài</span>
              )}
            </button>

            <button
              type="button"
              className="btn-cancel"
              disabled={isSubmitting}
              onClick={handleCancelClick}
            >
              Huỷ
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CÁC MODAL & POPUP PHỤ TRỢ (MÀN 2, 3, 4 & CONFIRM) */}
      {/* ========================================================= */}

      {/* Màn 2: Bản đồ tương tác định vị toạ độ */}
      <LocationPickerModal
        isOpen={showLocationModal}
        initialLocation={selectedLocation}
        onConfirm={(loc) => setSelectedLocation(loc)}
        onClose={() => setShowLocationModal(false)}
      />

      {/* Màn 3: Popup gắn thẻ bạn bè / Chọn nhóm */}
      <TagFriendsAndGroupModal
        isOpen={showTagModal}
        initialMode={tagModalMode}
        friendsList={friendsList}
        groupsList={groupsList}
        selectedFriendIds={selectedFriendIds}
        selectedGroupId={selectedGroupId}
        onConfirm={(friendIds, groupId) => {
          setSelectedFriendIds(friendIds);
          setSelectedGroupId(groupId);
        }}
        onClose={() => setShowTagModal(false)}
      />

      {/* Màn 4: Popup đã đăng bài thành công */}
      <PostSuccessModal
        isOpen={showSuccessModal}
        post={createdPost}
        isPendingApproval={Boolean(selectedGroupObj?.requires_approval)}
        onViewPost={(postId) => {
          setShowSuccessModal(false);
          if (onViewCreatedPost) {
            onViewCreatedPost(postId);
          } else if (onNavigateHome) {
            onNavigateHome();
          }
        }}
        onClose={() => {
          setShowSuccessModal(false);
          if (onViewCreatedPost && createdPost) {
            onViewCreatedPost(createdPost.post_id);
          } else if (onNavigateHome) {
            onNavigateHome();
          }
        }}
      />

      {/* Popup xác nhận hủy soạn thảo */}
      <DiscardConfirmModal
        isOpen={showDiscardModal}
        onStay={() => setShowDiscardModal(false)}
        onConfirmExit={handleConfirmDiscard}
      />
    </div>
  );
};

export default PostCreatorContainer;
