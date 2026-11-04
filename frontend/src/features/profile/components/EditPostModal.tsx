import React, { useState, useEffect, useRef } from "react";
import type { PostItem, UpdatePostPayload } from "../types/profile.types";
import { profileService } from "../services/profile.service";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { DiscardEditConfirmModal } from "./DiscardEditConfirmModal";
import type {
  LocationData,
  FriendOption,
  VolunteerGroupOption,
} from "../../posts/types/postTypes";
import { LocationPickerModal } from "../../posts/components/LocationPickerModal";
import { TagFriendsAndGroupModal } from "../../posts/components/TagFriendsAndGroupModal";
import { postService } from "../../posts/services/postService";
import "../../posts/styles/PostCreator.scss";

interface MediaItem {
  url: string;
  media_type: "IMAGE" | "VIDEO";
  file_name: string;
  size_bytes: number;
}

interface EditPostModalProps {
  isOpen: boolean;
  post: PostItem | null;
  onClose: () => void;
  onSuccess: (updatedPost: PostItem) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  post,
  onClose,
  onSuccess,
}) => {
  // 1. Trạng thái các trường soạn thảo
  const [content, setContent] = useState("");
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string>("PUBLIC");

  // 2. Trạng thái ban đầu để kiểm tra thay đổi (Discard guard)
  const [initialContent, setInitialContent] = useState("");
  const [initialMediaUrls, setInitialMediaUrls] = useState<string[]>([]);
  const [initialLocation, setInitialLocation] = useState<LocationData | null>(null);
  const [initialFriendIds, setInitialFriendIds] = useState<string[]>([]);
  const [initialGroupId, setInitialGroupId] = useState<string | null>(null);
  const [initialVisibility, setInitialVisibility] = useState<string>("PUBLIC");

  // 3. Danh mục bạn bè và nhóm tình nguyện
  const [friendsList, setFriendsList] = useState<FriendOption[]>([]);
  const [groupsList, setGroupsList] = useState<VolunteerGroupOption[]>([]);

  // 4. Trạng thái tải và các sub-modal
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagModalMode, setTagModalMode] = useState<"FRIENDS" | "GROUP">("FRIENDS");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tải danh mục bạn bè & nhóm khi component được nạp
  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const [friends, groups] = await Promise.all([
          postService.getFriends(),
          postService.getVolunteerGroups(),
        ]);
        if (isMounted) {
          setFriendsList(friends);
          setGroupsList(groups);
        }
      } catch (err) {
        console.warn("Lỗi tải danh mục bạn bè/nhóm cho Edit modal:", err);
      }
    };
    if (isOpen) {
      fetchMetadata();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Nạp dữ liệu cũ của bài viết khi mở Modal
  useEffect(() => {
    if (isOpen && post) {
      // 1. Nội dung
      const initialText = post.content || "";
      setContent(initialText);
      setInitialContent(initialText);

      // 2. Đa phương tiện
      let parsed: MediaItem[] = [];
      const urls: string[] = [];
      if (post.media_urls && Array.isArray(post.media_urls)) {
        parsed = post.media_urls.map((item: any, idx: number) => {
          if (typeof item === "string") {
            urls.push(item);
            const isVid =
              item.toLowerCase().endsWith(".mp4") || item.toLowerCase().endsWith(".mov");
            return {
              url: item,
              media_type: isVid ? ("VIDEO" as const) : ("IMAGE" as const),
              file_name: `Tệp ${idx + 1}`,
              size_bytes: 0,
            };
          } else if (item && typeof item === "object") {
            urls.push(item.url);
            return {
              url: item.url,
              media_type: item.media_type || "IMAGE",
              file_name: item.file_name || `Tệp ${idx + 1}`,
              size_bytes: item.size_bytes || 0,
            };
          }
          return {
            url: String(item),
            media_type: "IMAGE" as const,
            file_name: `Tệp ${idx + 1}`,
            size_bytes: 0,
          };
        });
      }
      setMediaList(parsed);
      setInitialMediaUrls(urls);

      // 3. Vị trí
      let initLoc: LocationData | null = null;
      if (post.address || (post.latitude != null && post.longitude != null)) {
        initLoc = {
          latitude: post.latitude || 10.7769,
          longitude: post.longitude || 106.7009,
          address: post.address || "Vị trí đã lưu",
        };
      }
      setSelectedLocation(initLoc);
      setInitialLocation(initLoc);

      // 4. Bạn bè gắn thẻ
      const friendIds =
        post.tagged_friends?.map((f) => f.user_id) || [];
      setSelectedFriendIds(friendIds);
      setInitialFriendIds(friendIds);

      // 5. Nhóm
      const grpId = post.group_id || null;
      setSelectedGroupId(grpId);
      setInitialGroupId(grpId);

      // 6. Chế độ hiển thị
      const vis = post.visibility || "PUBLIC";
      setVisibility(vis);
      setInitialVisibility(vis);

      setErrorMessage(null);
      setShowDiscardConfirm(false);
    }
  }, [isOpen, post]);

  // Kiểm tra xem đã có thay đổi so với dữ liệu gốc chưa
  const hasChanges = (): boolean => {
    // 1. So sánh nội dung chữ
    if (content.trim() !== initialContent.trim()) return true;

    // 2. So sánh danh sách media
    const currentUrls = mediaList.map((m) => m.url);
    if (currentUrls.length !== initialMediaUrls.length) return true;
    for (let i = 0; i < currentUrls.length; i++) {
      if (currentUrls[i] !== initialMediaUrls[i]) return true;
    }

    // 3. So sánh vị trí
    const hadLoc = initialLocation !== null;
    const hasLoc = selectedLocation !== null;
    if (hadLoc !== hasLoc) return true;
    if (hadLoc && hasLoc) {
      if (
        initialLocation?.address !== selectedLocation?.address ||
        initialLocation?.latitude !== selectedLocation?.latitude ||
        initialLocation?.longitude !== selectedLocation?.longitude
      ) {
        return true;
      }
    }

    // 4. So sánh danh sách bạn bè
    if (selectedFriendIds.length !== initialFriendIds.length) return true;
    const sortedCurrentFriends = [...selectedFriendIds].sort();
    const sortedInitialFriends = [...initialFriendIds].sort();
    for (let i = 0; i < sortedCurrentFriends.length; i++) {
      if (sortedCurrentFriends[i] !== sortedInitialFriends[i]) return true;
    }

    // 5. So sánh nhóm
    if (selectedGroupId !== initialGroupId) return true;

    // 6. So sánh quyền riêng tư
    if (visibility !== initialVisibility) return true;

    return false;
  };

  // Xử lý đóng Modal
  const handleRequestClose = () => {
    if (loading) return;
    if (hasChanges()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Xác nhận thoát và bỏ thay đổi
  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Xử lý gắn hashtag nhanh
  const handleAddHashtag = (tag: string) => {
    if (content.includes(tag)) return;
    const newContent = content ? `${content} ${tag}` : tag;
    setContent(newContent);
    setErrorMessage(null);
  };

  // Xoá một tệp media
  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Thêm ảnh hoặc video mới
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = "";

    // 1. Kiểm tra dung lượng tối đa 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage("Tệp không hợp lệ (chỉ nhận JPG, PNG, MP4 và tối đa 10MB)");
      return;
    }

    // 2. Kiểm tra định dạng hợp lệ
    const validTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Tệp không hợp lệ (chỉ nhận JPG, PNG, MP4 và tối đa 10MB)");
      return;
    }

    try {
      setUploadingMedia(true);
      setErrorMessage(null);
      const res = await profileService.uploadMedia(file);
      setMediaList((prev) => [
        ...prev,
        {
          url: res.url,
          media_type: res.media_type,
          file_name: res.file_name || file.name,
          size_bytes: res.size_bytes || file.size,
        },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail?.message ||
        "Không thể tải lên tệp đính kèm. Vui lòng thử lại";
      setErrorMessage(msg);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Gửi cập nhật bài viết
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    const trimmedContent = content.trim();

    // 1. Kiểm tra: Bắt buộc có nội dung hoặc có ít nhất 1 ảnh/video
    if (!trimmedContent && mediaList.length === 0) {
      setErrorMessage("Nội dung bài viết không được để trống");
      return;
    }

    // 2. Giới hạn tối đa 2000 ký tự khi sửa bài
    if (content.length > 2000) {
      setErrorMessage("Nội dung tối đa 2000 ký tự");
      return;
    }

    if (!hasChanges()) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const hadOriginalLocation = initialLocation !== null;
      const isClearingLocation = hadOriginalLocation && selectedLocation === null;

      const payload: UpdatePostPayload = {
        content: content,
        media_urls: mediaList,
        latitude: selectedLocation?.latitude || null,
        longitude: selectedLocation?.longitude || null,
        address: selectedLocation?.address || null,
        clear_location: isClearingLocation,
        tagged_friend_ids: selectedFriendIds,
        group_id: selectedGroupId || null,
        visibility: visibility,
        version: post.version ?? 1,
      };

      const updated = await profileService.updatePost(post.post_id, payload);
      onSuccess(updated);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 409) {
        setErrorMessage(
          "Dữ liệu bài viết đã được cập nhật bởi thao tác khác. Vui lòng tải lại trang."
        );
      } else if (status === 404) {
        setErrorMessage("Bài viết không còn tồn tại");
      } else if (detail?.message) {
        setErrorMessage(detail.message);
      } else {
        setErrorMessage("Không thể cập nhật bài viết. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !post) return null;

  const isOverLimit = content.length > 2000;
  const canSubmit =
    hasChanges() &&
    !isOverLimit &&
    (content.trim().length > 0 || mediaList.length > 0) &&
    !loading &&
    !uploadingMedia;

  const selectedGroupObj = groupsList.find((g) => g.group_id === selectedGroupId);

  return (
    <>
      <div
        className="modal-backdrop-overlay"
        onClick={handleRequestClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-modal-title"
      >
        <div
          className="modal-double-bezel modal-edit-post-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-inner-core">
            {/* Header Modal */}
            <div className="modal-header-between">
              <div>
                <span className="modal-eyebrow-pill">CHỈNH SỬA BÀI ĐĂNG</span>
                <h2 id="edit-post-modal-title" className="modal-title-main">
                  SỬA BÀI VIẾT
                </h2>
              </div>
              <button
                type="button"
                className="btn-modal-close-icon"
                onClick={handleRequestClose}
                aria-label="Đóng cửa sổ"
                disabled={loading}
              >
                ✕
              </button>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="modal-error-banner" role="alert">
                <span className="error-icon-dot">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="edit-post-form">
              <div className="edit-form-scrollable">
                {/* 1. KHỐI NỘI DUNG VĂN BẢN */}
                <div className="form-field-group">
                  <label htmlFor="edit-post-content" className="form-field-label">
                    <span>Nội dung chia sẻ</span>
                  </label>
                  <div className={`textarea-wrapper ${isOverLimit ? "has-error" : ""}`}>
                    <textarea
                      id="edit-post-content"
                      className="edit-post-textarea"
                      placeholder="Bạn muốn chia sẻ hành động xanh hoặc cập nhật điều gì?"
                      rows={5}
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      disabled={loading}
                      autoFocus
                    />
                    <div className={`char-counter ${isOverLimit ? "counter-over" : ""}`}>
                      {content.length} / 2000
                    </div>
                  </div>

                  {/* Gợi ý Hashtags nhanh */}
                  <div className="hashtag-suggestions-row">
                    <span className="hashtag-hint-label">Gợi ý hashtag:</span>
                    {["#SaiGonXanh", "#ZeroWaste", "#ChủNhậtXanh", "#PhânLoạiRác", "#SongXanh"].map(
                      (tag) => (
                        <button
                          type="button"
                          key={tag}
                          className="hashtag-pill-btn"
                          onClick={() => handleAddHashtag(tag)}
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* 2. KHỐI TỆP ĐÍNH KÈM (MEDIA) */}
                <div className="form-field-group">
                  <div className="media-section-header">
                    <label className="form-field-label">
                      <span>Tệp đính kèm ({mediaList.length})</span>
                    </label>
                    <button
                      type="button"
                      className="btn-add-media"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploadingMedia || mediaList.length >= 5}
                    >
                      <span>📷</span>
                      <span>{uploadingMedia ? "Đang tải..." : "Thêm ảnh / video"}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/jpeg,image/png,image/webp,video/mp4"
                      onChange={handleFileChange}
                    />
                  </div>

                  {mediaList.length > 0 && (
                    <div className="media-preview-grid">
                      {mediaList.map((m, idx) => (
                        <div key={idx} className="media-preview-item">
                          {m.media_type === "VIDEO" ? (
                            <div className="video-thumb-container">
                              <video src={resolveMediaUrl(m.url)} />
                              <span className="video-badge-pill">▶ VIDEO</span>
                            </div>
                          ) : (
                            <img
                              src={resolveMediaUrl(m.url)}
                              alt={`Đính kèm ${idx + 1}`}
                              className="preview-media-thumb"
                            />
                          )}
                          <button
                            type="button"
                            className="btn-remove-media-thumb"
                            onClick={() => handleRemoveMedia(idx)}
                            title="Gỡ tệp này"
                            disabled={loading}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="media-hint-text">
                    Hỗ trợ định dạng JPG, PNG, WebP hoặc MP4. Tối đa 5 ảnh hoặc 1 video (tối đa 10MB/tệp).
                  </p>
                </div>

                {/* 3. KHỐI TUỲ CHỌN MỞ RỘNG (VỊ TRÍ, BẠN BÈ, QUYỀN XEM) */}
                <div className="options-panel-grid">
                  {/* Tuỳ chọn A: Vị trí bản đồ */}
                  <div className="option-row-item">
                    <span className="form-field-label">Vị trí địa lý</span>
                    {selectedLocation ? (
                      <div className="option-active-badge">
                        <div className="badge-content-left" title={selectedLocation.address}>
                          <span>📍</span>
                          <span className="badge-text-overflow">{selectedLocation.address}</span>
                        </div>
                        <div className="badge-actions-right">
                          <button
                            type="button"
                            className="btn-badge-edit"
                            onClick={() => setShowLocationModal(true)}
                            disabled={loading}
                          >
                            Đổi vị trí
                          </button>
                          <button
                            type="button"
                            className="btn-badge-remove"
                            onClick={() => setSelectedLocation(null)}
                            title="Gỡ vị trí"
                            disabled={loading}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="option-action-btn"
                        onClick={() => setShowLocationModal(true)}
                        disabled={loading}
                      >
                        <span>📍</span>
                        <span>Gắn vị trí trên bản đồ</span>
                      </button>
                    )}
                  </div>

                  {/* Tuỳ chọn B: Gắn thẻ bạn bè & Nhóm */}
                  <div className="option-row-item">
                    <span className="form-field-label">Gắn thẻ bạn bè & Nhóm</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {/* Thẻ Bạn bè */}
                      {selectedFriendIds.length > 0 ? (
                        <div className="option-active-badge">
                          <div className="badge-content-left">
                            <span>👥</span>
                            <span>Đã gắn thẻ {selectedFriendIds.length} người bạn</span>
                          </div>
                          <div className="badge-actions-right">
                            <button
                              type="button"
                              className="btn-badge-edit"
                              onClick={() => {
                                setTagModalMode("FRIENDS");
                                setShowTagModal(true);
                              }}
                              disabled={loading}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              className="btn-badge-remove"
                              onClick={() => setSelectedFriendIds([])}
                              title="Gỡ gắn thẻ"
                              disabled={loading}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="option-action-btn"
                          onClick={() => {
                            setTagModalMode("FRIENDS");
                            setShowTagModal(true);
                          }}
                          disabled={loading}
                        >
                          <span>👥</span>
                          <span>Gắn thẻ bạn bè</span>
                        </button>
                      )}

                      {/* Thẻ Nhóm */}
                      {selectedGroupObj && (
                        <div className="option-active-badge">
                          <div className="badge-content-left">
                            <span>🏢</span>
                            <span>{selectedGroupObj.name}</span>
                          </div>
                          <div className="badge-actions-right">
                            <button
                              type="button"
                              className="btn-badge-remove"
                              onClick={() => setSelectedGroupId(null)}
                              title="Hủy chọn nhóm"
                              disabled={loading}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tuỳ chọn C: Chế độ hiển thị (Quyền riêng tư) */}
                  <div className="option-row-item">
                    <span className="form-field-label">Chế độ hiển thị</span>
                    <div className="visibility-segmented-control">
                      <button
                        type="button"
                        className={`visibility-option-btn ${visibility === "PUBLIC" ? "is-selected" : ""}`}
                        onClick={() => setVisibility("PUBLIC")}
                        disabled={loading}
                      >
                        <span>🌍</span>
                        <span>Công khai</span>
                      </button>
                      <button
                        type="button"
                        className={`visibility-option-btn ${visibility === "FRIENDS" ? "is-selected" : ""}`}
                        onClick={() => setVisibility("FRIENDS")}
                        disabled={loading}
                      >
                        <span>👥</span>
                        <span>Bạn bè</span>
                      </button>
                      <button
                        type="button"
                        className={`visibility-option-btn ${visibility === "ONLY_ME" ? "is-selected" : ""}`}
                        onClick={() => setVisibility("ONLY_ME")}
                        disabled={loading}
                      >
                        <span>🔒</span>
                        <span>Chỉ mình tôi</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hàng nút hành động cuối form */}
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-ghost"
                  onClick={handleRequestClose}
                  disabled={loading}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary-solid"
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <>
                      <span className="spinner-inline" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <span>Cập nhật</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Sub-modal: Bản đồ số Leaflet gắn vị trí */}
      <LocationPickerModal
        isOpen={showLocationModal}
        initialLocation={selectedLocation}
        onConfirm={(loc) => {
          setSelectedLocation(loc);
          setShowLocationModal(false);
        }}
        onClose={() => setShowLocationModal(false)}
      />

      {/* Sub-modal: Gắn thẻ bạn bè & Chọn nhóm */}
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
          setShowTagModal(false);
        }}
        onClose={() => setShowTagModal(false)}
      />

      {/* Sub-modal: Xác nhận thoát khi có thay đổi chưa lưu */}
      <DiscardEditConfirmModal
        isOpen={showDiscardConfirm}
        onConfirmDiscard={handleConfirmDiscard}
        onStay={() => setShowDiscardConfirm(false)}
      />
    </>
  );
};
