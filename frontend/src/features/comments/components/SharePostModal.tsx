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
  onClose: () => void;
  onShareSuccess: (message: string) => void;
  onShowToast: (type: "success" | "error" | "info", msg: string) => void;
}

export const SharePostModal: React.FC<SharePostModalProps> = ({
  isOpen,
  postId,
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

