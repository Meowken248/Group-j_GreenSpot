import React, { useState, useEffect } from "react";
import type {
  ShareType,
  ShareFriendOption,
  ShareGroupOption,
} from "../types/commentTypes";
import { commentService } from "../services/commentService";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

interface SharePostModalProps {
  isOpen: boolean;
  postId: string;
  postContent?: string;
  authorName?: string;
  onClose: () => void;
  onShareSuccess: (message: string) => void;
  onShowToast: (type: "success" | "error" | "info", msg: string) => void;
}

export const SharePostModal: React.FC<SharePostModalProps> = ({
  isOpen,
  postId,
  postContent,
  authorName,
  onClose,
  onShareSuccess,
  onShowToast,
}) => {
  const [selectedOption, setSelectedOption] = useState<ShareType>("FEED");
  const [caption, setCaption] = useState("");

  // Dữ liệu bạn bè
  const [friendsList, setFriendsList] = useState<ShareFriendOption[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Dữ liệu nhóm
  const [groupsList, setGroupsList] = useState<ShareGroupOption[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Trạng thái gửi và lỗi
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tải danh sách bạn bè khi chọn "FRIENDS"
  useEffect(() => {
    if (isOpen && selectedOption === "FRIENDS" && friendsList.length === 0) {
      setLoadingFriends(true);
      commentService
        .getFriendsForShare()
        .then((data) => setFriendsList(data))
        .catch(() => setErrorMessage("Không thể tải danh sách bạn bè"))
        .finally(() => setLoadingFriends(false));
    }
  }, [isOpen, selectedOption, friendsList.length]);

  // Tải danh sách nhóm khi chọn "GROUP"
  useEffect(() => {
    if (isOpen && selectedOption === "GROUP" && groupsList.length === 0) {
      setLoadingGroups(true);
      commentService
        .getGroupsForShare()
        .then((data) => setGroupsList(data))
        .catch(() => setErrorMessage("Không thể tải danh sách nhóm"))
        .finally(() => setLoadingGroups(false));
    }
  }, [isOpen, selectedOption, groupsList.length]);

  if (!isOpen) return null;

  // Lọc tìm kiếm bạn bè
  const filteredFriends = friendsList.filter((f) =>
    f.full_name.toLowerCase().includes(friendSearchQuery.toLowerCase())
  );

  // Lọc tìm kiếm nhóm
  const filteredGroups = groupsList.filter((g) =>
    g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  // Xử lý chọn/bỏ chọn bạn bè
  const handleToggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (errorMessage) setErrorMessage(null);
  };

  // Xử lý chọn/bỏ chọn nhóm
  const handleToggleGroup = (id: string, canPost: boolean = true) => {
    if (!canPost) return;
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (errorMessage) setErrorMessage(null);
  };

  // Xử lý tùy chọn 4: Sao chép liên kết (SRS: Thực hiện ngay khi bấm, không cần bấm Chia sẻ)
  const handleSelectCopyLink = async () => {
    setSelectedOption("LINK");
    try {
      const shareUrl = `${window.location.origin}/#post-comments?id=${postId}`;
      await navigator.clipboard.writeText(shareUrl);

      // Gọi API ghi nhận lượt chia sẻ
      commentService.sharePost(postId, { share_type: "LINK" }).catch(() => {});

      onShowToast("success", "Đã sao chép liên kết");
      onClose();
    } catch {
      onShowToast("error", "Không thể sao chép liên kết");
    }
  };

  // Xử lý chia sẻ trực tiếp lên các mạng xã hội bên ngoài (Facebook, Zalo, X, Telegram, LinkedIn, Web Share API)
  const handleShareSocial = async (
    platform: "facebook" | "zalo" | "twitter" | "telegram" | "linkedin" | "native"
  ) => {
    const shareUrl = `${window.location.origin}/#post-comments?id=${postId}`;
    const cleanContent = (postContent || "").trim();
    const snippet =
      cleanContent.length > 180 ? `${cleanContent.slice(0, 177)}...` : cleanContent;
    const authorPrefix = authorName ? `[${authorName}]` : "[GreenSpot]";

    // Tiêu đề & nội dung đính kèm thực tế của bài viết
    const shareTitle = authorName
      ? `Bài viết của ${authorName} trên GreenSpot 🌱`
      : "Cùng chung tay vì môi trường xanh trên GreenSpot 🌱";

    const shareText = snippet
      ? `${authorPrefix}: "${snippet}"\n\nXem chi tiết tại GreenSpot:`
      : `Xem bài viết môi trường này trên GreenSpot 🌱:`;

    const combinedSocialText = snippet
      ? `${authorPrefix}: "${snippet}"`
      : shareTitle;

    // Tự động sao chép nội dung & link bài viết vào Clipboard để người dùng dán ngay nếu app đích không cho prefill
    const clipboardText = snippet
      ? `${authorPrefix}: "${snippet}"\n\nXem chi tiết tại: ${shareUrl}`
      : `${shareTitle}\n\nXem chi tiết tại: ${shareUrl}`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboardText);
      }
    } catch {
      // Bỏ qua nếu trình duyệt không cấp quyền clipboard ngầm
    }

    // Ghi nhận lượt chia sẻ về backend
    commentService.sharePost(postId, { share_type: "LINK" }).catch(() => {});

    if (platform === "native") {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
          onShareSuccess("Đã chia sẻ bài viết");
          onClose();
          return;
        } catch {
          // Người dùng hủy trong dialog share gốc
          return;
        }
      } else {
        await handleSelectCopyLink();
        return;
      }
    }

    let targetUrl = "";
    let platformName = "";
    let successMessage = "";

    if (platform === "facebook") {
      platformName = "Facebook";
      targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
      successMessage = "Đã sao chép nội dung & link! Nhấn Ctrl+V để dán vào bài đăng Facebook";
    } else if (platform === "zalo") {
      platformName = "Zalo";
      targetUrl = `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(combinedSocialText)}`;
      successMessage = "Đã sao chép nội dung & link! Nhấn Ctrl+V để dán vào Zalo";
    } else if (platform === "twitter") {
      platformName = "X (Twitter)";
      targetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(combinedSocialText)}&hashtags=GreenSpot,SongXanh`;
      successMessage = "Đang mở chia sẻ qua X (Twitter)";
    } else if (platform === "telegram") {
      platformName = "Telegram";
      targetUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(combinedSocialText)}`;
      successMessage = "Đang mở chia sẻ qua Telegram";
    } else if (platform === "linkedin") {
      platformName = "LinkedIn";
      targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(combinedSocialText)}`;
      successMessage = "Đã sao chép nội dung & link! Nhấn Ctrl+V để dán vào LinkedIn";
    }

    if (targetUrl) {
      window.open(targetUrl, "_blank", "width=600,height=520,scrollbars=yes,resizable=yes");
      onShareSuccess(successMessage || `Đang mở chia sẻ qua ${platformName}`);
      onClose();
    }
  };

  // Kiểm tra điều kiện nút Chia sẻ sáng hay mờ
  const isShareReady = () => {
    if (selectedOption === "FEED") return true;
    if (selectedOption === "FRIENDS") return selectedFriendIds.length > 0;
    if (selectedOption === "GROUP") return selectedGroupIds.length > 0;
    return false;
  };

  // Gửi chia sẻ
  const handleConfirmShare = async () => {
    if (!isShareReady() || isSubmitting) {
      if (selectedOption === "FRIENDS" && selectedFriendIds.length === 0) {
        setErrorMessage("Vui lòng chọn ít nhất 1 người nhận");
      }
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await commentService.sharePost(postId, {
        share_type: selectedOption,
        caption: selectedOption === "FEED" ? caption.trim() : undefined,
        target_friend_ids:
          selectedOption === "FRIENDS" ? selectedFriendIds : undefined,
        target_group_ids:
          selectedOption === "GROUP" ? selectedGroupIds : undefined,
      });

      onShareSuccess(res.message);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Không thể chia sẻ bài viết. Vui lòng thử lại";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="share-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="share-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header theo đúng đặc tả SRS Màn 3 */}
        <div className="share-modal-header">
          <span className="share-modal-tag">POPUP</span>
          <h2 className="share-modal-title">CHIA SẺ BÀI VIẾT</h2>
          <button
            type="button"
            className="btn-close-share-modal"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="share-modal-body">
          {/* Danh sách 4 lựa chọn theo đặc tả */}
          <div className="share-options-list" role="radiogroup">
            {/* 1. Chia sẻ lên bảng tin */}
            <label
              className={`share-option-card ${
                selectedOption === "FEED" ? "is-selected" : ""
              }`}
            >
              <input
                type="radio"
                name="share_option"
                checked={selectedOption === "FEED"}
                onChange={() => {
                  setSelectedOption("FEED");
                  setErrorMessage(null);
                }}
              />
              <span className="option-icon">📰</span>
              <div className="option-text-group">
                <strong className="option-title">Chia sẻ lên bảng tin</strong>
                <span className="option-desc">
                  Đăng lại bài viết này trên trang cá nhân của bạn
                </span>
              </div>
            </label>

            {/* Khung nhập cảm nghĩ khi chọn chia sẻ lên bảng tin */}
            {selectedOption === "FEED" && (
              <div className="feed-caption-input-box">
                <textarea
                  rows={2}
                  placeholder="Viết cảm nghĩ của bạn về bài viết này..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                />
              </div>
            )}

            {/* 2. Gửi cho bạn bè */}
            <label
              className={`share-option-card ${
                selectedOption === "FRIENDS" ? "is-selected" : ""
              }`}
            >
              <input
                type="radio"
                name="share_option"
                checked={selectedOption === "FRIENDS"}
                onChange={() => {
                  setSelectedOption("FRIENDS");
                  setErrorMessage(null);
                }}
              />
              <span className="option-icon">👥</span>
              <div className="option-text-group">
                <strong className="option-title">Gửi cho bạn bè</strong>
                <span className="option-desc">
                  Gửi bài viết này đến các bạn bè trong danh sách
                </span>
              </div>
            </label>

            {/* Khung tìm kiếm & danh sách bạn bè */}
            {selectedOption === "FRIENDS" && (
              <div className="friend-selection-subpanel">
                <input
                  type="text"
                  placeholder="Tìm kiếm bạn bè..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="search-friend-input"
                />

                <div className="selection-list-scrollable">
                  {loadingFriends ? (
                    <div className="subpanel-loading">Đang tải bạn bè...</div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="subpanel-empty">
                      {friendSearchQuery
                        ? "Không tìm thấy bạn bè phù hợp"
                        : "Chưa có bạn bè nào trong danh sách"}
                    </div>
                  ) : (
                    filteredFriends.map((f) => {
                      const isChecked = selectedFriendIds.includes(f.user_id);
                      return (
                        <div
                          key={f.user_id}
                          className={`selection-item-row ${
                            isChecked ? "is-checked" : ""
                          }`}
                          onClick={() => handleToggleFriend(f.user_id)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleFriend(f.user_id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="item-avatar">
                            {f.avatar_url ? (
                              <img src={resolveMediaUrl(f.avatar_url)} alt={f.full_name} />
                            ) : (
                              <span>{f.full_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="item-name">{f.full_name}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedFriendIds.length === 0 && (
                  <p className="selection-hint-note">
                    Vui lòng chọn ít nhất 1 người nhận
                  </p>
                )}
              </div>
            )}

            {/* 3. Đăng vào nhóm */}
            <label
              className={`share-option-card ${
                selectedOption === "GROUP" ? "is-selected" : ""
              }`}
            >
              <input
                type="radio"
                name="share_option"
                checked={selectedOption === "GROUP"}
                onChange={() => {
                  setSelectedOption("GROUP");
                  setErrorMessage(null);
                }}
              />
              <span className="option-icon">🏢</span>
              <div className="option-text-group">
                <strong className="option-title">Đăng vào nhóm</strong>
                <span className="option-desc">
                  Chia sẻ bài viết vào nhóm tình nguyện môi trường
                </span>
              </div>
            </label>

            {/* Khung tìm kiếm & danh sách nhóm */}
            {selectedOption === "GROUP" && (
              <div className="group-selection-subpanel">
                <input
                  type="text"
                  placeholder="Tìm kiếm nhóm..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className="search-group-input"
                />

                <div className="selection-list-scrollable">
                  {loadingGroups ? (
                    <div className="subpanel-loading">Đang tải nhóm...</div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="subpanel-empty">
                      {groupSearchQuery
                        ? "Không tìm thấy nhóm phù hợp"
                        : "Bạn chưa tham gia nhóm nào"}
                    </div>
                  ) : (
                    filteredGroups.map((g) => {
                      const isChecked = selectedGroupIds.includes(g.group_id);
                      const cannotPost = !g.can_post;
                      return (
                        <div
                          key={g.group_id}
                          className={`selection-item-row ${
                            isChecked ? "is-checked" : ""
                          } ${cannotPost ? "is-disabled" : ""}`}
                          onClick={() => handleToggleGroup(g.group_id, !cannotPost)}
                          title={
                            cannotPost
                              ? "Bạn không có quyền đăng vào nhóm này"
                              : g.name
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={cannotPost}
                            onChange={() => handleToggleGroup(g.group_id, !cannotPost)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="group-info-cell">
                            <span className="group-name-text">{g.name}</span>
                            {cannotPost && (
                              <span className="group-warning-badge">
                                Bạn không có quyền đăng vào nhóm này
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 4. Sao chép liên kết */}
            <div
              className={`share-option-card copy-link-card ${
                selectedOption === "LINK" ? "is-selected" : ""
              }`}
              onClick={handleSelectCopyLink}
              role="button"
              tabIndex={0}
            >
              <span className="option-icon">🔗</span>
              <div className="option-text-group">
                <strong className="option-title">Sao chép liên kết</strong>
                <span className="option-desc">
                  Lấy đường dẫn URL bài viết để gửi qua ứng dụng khác
                </span>
              </div>
              <span className="quick-action-tag">Sao chép ngay</span>
            </div>
          </div>

          {/* Khu vực Mạng xã hội bên ngoài (Social Media Sharing) */}
          <div className="external-social-section" aria-label="Chia sẻ qua mạng xã hội bên ngoài">
            <div className="social-divider">
              <span className="divider-line" />
              <span className="divider-label">HOẶC CHIA SẺ TRỰC TIẾP LÊN MẠNG XÃ HỘI</span>
              <span className="divider-line" />
            </div>

            <div className="social-buttons-grid" role="group" aria-label="Mạng xã hội">
              <button
                type="button"
                className="btn-social-item btn-social-facebook"
                onClick={() => handleShareSocial("facebook")}
                title="Chia sẻ lên Facebook"
                aria-label="Chia sẻ lên Facebook"
              >
                <span className="social-icon-wrapper fb-bg">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </span>
                <span className="social-name">Facebook</span>
              </button>

              <button
                type="button"
                className="btn-social-item btn-social-zalo"
                onClick={() => handleShareSocial("zalo")}
                title="Chia sẻ qua Zalo"
                aria-label="Chia sẻ qua Zalo"
              >
                <span className="social-icon-wrapper zalo-bg">
                  <span className="zalo-text-badge">Zalo</span>
                </span>
                <span className="social-name">Zalo</span>
              </button>

              <button
                type="button"
                className="btn-social-item btn-social-twitter"
                onClick={() => handleShareSocial("twitter")}
                title="Chia sẻ lên X (Twitter)"
                aria-label="Chia sẻ lên X (Twitter)"
              >
                <span className="social-icon-wrapper x-bg">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </span>
                <span className="social-name">X</span>
              </button>

              <button
                type="button"
                className="btn-social-item btn-social-telegram"
                onClick={() => handleShareSocial("telegram")}
                title="Chia sẻ qua Telegram"
                aria-label="Chia sẻ qua Telegram"
              >
                <span className="social-icon-wrapper tg-bg">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </span>
                <span className="social-name">Telegram</span>
              </button>

              <button
                type="button"
                className="btn-social-item btn-social-linkedin"
                onClick={() => handleShareSocial("linkedin")}
                title="Chia sẻ lên LinkedIn"
                aria-label="Chia sẻ lên LinkedIn"
              >
                <span className="social-icon-wrapper in-bg">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                </span>
                <span className="social-name">LinkedIn</span>
              </button>

              <button
                type="button"
                className="btn-social-item btn-social-native"
                onClick={() => handleShareSocial("native")}
                title="Mở menu chia sẻ hệ thống hoặc sao chép"
                aria-label="Mở menu chia sẻ hệ thống"
              >
                <span className="social-icon-wrapper native-bg">
                  <span className="native-emoji">📱</span>
                </span>
                <span className="social-name">Khác...</span>
              </button>
            </div>
          </div>

          {/* Dòng hiển thị lỗi nếu có */}
          {errorMessage && (
            <div className="share-error-banner" role="alert">
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        {/* Footer với 2 nút: Chia sẻ và Hủy */}
        <div className="share-modal-footer">
          <button
            type="button"
            className="btn-share-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>

          <button
            type="button"
            className="btn-share-confirm"
            onClick={handleConfirmShare}
            disabled={!isShareReady() || isSubmitting}
          >
            {isSubmitting ? "Đang xử lý..." : "Chia sẻ"}
          </button>
        </div>
      </div>
    </div>
  );
};

