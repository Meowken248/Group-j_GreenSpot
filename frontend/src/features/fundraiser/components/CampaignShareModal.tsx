import React, { useState, useEffect } from "react";
import type { FundraiserCampaignItem } from "../types/fundraiser.types";
import { commentService } from "../../comments/services/commentService";
import type { ShareFriendOption, ShareGroupOption } from "../../comments/types/commentTypes";
import "../../comments/styles/ShareModal.scss";

interface CampaignShareModalProps {
  isOpen: boolean;
  campaign: FundraiserCampaignItem;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

type ShareOptionType = "FEED" | "FRIENDS" | "GROUP" | "LINK";

export const CampaignShareModal: React.FC<CampaignShareModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onShowToast,
}) => {
  const [selectedOption, setSelectedOption] = useState<ShareOptionType>("FEED");
  const [caption, setCaption] = useState(
    `Mọi người cùng chung tay ủng hộ chiến dịch "${campaign.title}" vì một môi trường xanh sạch đẹp nhé! 🌱`
  );

  // Danh sách bạn bè & nhóm
  const [friendsList, setFriendsList] = useState<ShareFriendOption[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [groupsList, setGroupsList] = useState<ShareGroupOption[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const campId = campaign.campaign_id || campaign.id || "";
  const shareUrl = `${window.location.origin}/#fundraiser?id=${campId}`;

  const formatVND = (amt: number) => {
    return new Intl.NumberFormat("vi-VN").format(amt) + " đ";
  };

  // Tải danh sách bạn bè khi chọn "FRIENDS"
  useEffect(() => {
    if (isOpen && selectedOption === "FRIENDS" && friendsList.length === 0) {
      setLoadingFriends(true);
      commentService
        .getFriendsForShare()
        .then((data) => setFriendsList(data || []))
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
        .then((data) => setGroupsList(data || []))
        .catch(() => setErrorMessage("Không thể tải danh sách nhóm"))
        .finally(() => setLoadingGroups(false));
    }
  }, [isOpen, selectedOption, groupsList.length]);

  if (!isOpen) return null;

  // Lọc bạn bè
  const filteredFriends = friendsList.filter((f) =>
    (f.full_name || "").toLowerCase().includes(friendSearchQuery.toLowerCase())
  );

  // Lọc nhóm
  const filteredGroups = groupsList.filter((g) =>
    (g.name || "").toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  const handleToggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (errorMessage) setErrorMessage(null);
  };

  const handleToggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (errorMessage) setErrorMessage(null);
  };

  // Xử lý sao chép liên kết trực tiếp
  const handleCopyLink = async () => {
    setSelectedOption("LINK");
    try {
      await navigator.clipboard.writeText(shareUrl);
      onShowToast("Đã sao chép liên kết chiến dịch vào bộ nhớ tạm!");
      onClose();
    } catch {
      onShowToast("Không thể sao chép liên kết");
    }
  };

  // Chia sẻ ra MXH bên ngoài (Facebook, Zalo, Twitter/X, Telegram, LinkedIn)
  const handleShareExternal = async (platform: "facebook" | "zalo" | "twitter" | "telegram" | "linkedin") => {
    const textSnippet = `Chung tay ủng hộ chiến dịch môi trường: ${campaign.title} tại ${campaign.district} (Mục tiêu: ${formatVND(campaign.target_amount)}) 🌱`;
    let targetUrl = "";

    if (platform === "facebook") {
      targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    } else if (platform === "zalo") {
      targetUrl = `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(textSnippet)}`;
    } else if (platform === "twitter") {
      targetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textSnippet)}&hashtags=GreenSpot,GayQuyXanh`;
    } else if (platform === "telegram") {
      targetUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textSnippet)}`;
    } else if (platform === "linkedin") {
      targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    }

    if (targetUrl) {
      window.open(targetUrl, "_blank", "width=600,height=520,scrollbars=yes,resizable=yes");
      onShowToast("Đang mở trang chia sẻ liên kết...");
      onClose();
    }
  };

  // Xác nhận chia sẻ
  const handleConfirmShare = async () => {
    if (selectedOption === "FRIENDS" && selectedFriendIds.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 người nhận");
      return;
    }
    if (selectedOption === "GROUP" && selectedGroupIds.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 nhóm cộng đồng");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Mô phỏng quá trình đăng bài chia sẻ / gửi tin nhắn
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (selectedOption === "FEED") {
        onShowToast("Đã chia sẻ chiến dịch lên Bảng tin Mạng xã hội của bạn!");
      } else if (selectedOption === "FRIENDS") {
        onShowToast(`Đã gửi chiến dịch đến ${selectedFriendIds.length} bạn bè!`);
      } else if (selectedOption === "GROUP") {
        onShowToast(`Đã chia sẻ chiến dịch vào ${selectedGroupIds.length} nhóm cộng đồng!`);
      }
      onClose();
    } catch {
      setErrorMessage("Không thể thực hiện chia sẻ. Vui lòng thử lại");
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
      style={{ zIndex: 10005 }}
    >
      <div
        className="share-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "540px" }}
      >
        {/* Header chuẩn đặc tả MXH */}
        <div className="share-modal-header">
          <span className="share-modal-tag">POPUP</span>
          <h2 className="share-modal-title">CHIA SẺ CHIẾN DỊCH GÂY QUỸ</h2>
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
          {/* Card xem trước chiến dịch gây quỹ */}
          <div
            style={{
              display: "flex",
              gap: "0.85rem",
              padding: "0.85rem",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "8px",
                background: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {campaign.cover_image_url ? (
                <img
                  src={campaign.cover_image_url}
                  alt={campaign.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                "🌱"
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: "#065f46",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {campaign.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                📍 {campaign.district} • 🎯 Mục tiêu: {formatVND(campaign.target_amount)}
              </div>
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.825rem",
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {/* 4 LỰA CHỌN CHIA SẺ CHUẨN MXH */}
          <div className="share-options-list" role="radiogroup">
            {/* 1. Chia sẻ lên Bảng tin */}
            <div
              className={`share-option-card ${selectedOption === "FEED" ? "is-selected" : ""}`}
              onClick={() => setSelectedOption("FEED")}
            >
              <span className="option-icon">🌐</span>
              <div className="option-text-group">
                <span className="option-title">Chia sẻ lên Bảng tin của tôi</span>
                <span className="option-desc">Kêu gọi bạn bè trên mạng xã hội cùng quyên góp ủng hộ</span>
              </div>
            </div>

            {selectedOption === "FEED" && (
              <div className="feed-caption-input-box">
                <textarea
                  rows={3}
                  placeholder="Viết lời kêu gọi ủng hộ chiến dịch này..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            )}

            {/* 2. Gửi qua tin nhắn bạn bè */}
            <div
              className={`share-option-card ${selectedOption === "FRIENDS" ? "is-selected" : ""}`}
              onClick={() => setSelectedOption("FRIENDS")}
            >
              <span className="option-icon">💬</span>
              <div className="option-text-group">
                <span className="option-title">Gửi tin nhắn cho bạn bè</span>
                <span className="option-desc">
                  {selectedFriendIds.length > 0
                    ? `Đã chọn ${selectedFriendIds.length} người nhận`
                    : "Chia sẻ vào hộp thư tin nhắn riêng"}
                </span>
              </div>
            </div>

            {selectedOption === "FRIENDS" && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.75rem",
                }}
              >
                <input
                  type="text"
                  placeholder="🔍 Tìm bạn bè theo tên..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.65rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    marginBottom: "0.5rem",
                  }}
                />
                {loadingFriends ? (
                  <div style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "center", padding: "0.5rem" }}>
                    Đang tải danh sách bạn bè...
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", textAlign: "center", padding: "0.5rem" }}>
                    Chưa có bạn bè nào để gửi
                  </div>
                ) : (
                  <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {filteredFriends.map((f) => (
                      <label
                        key={f.user_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          padding: "0.3rem",
                          borderRadius: "4px",
                          background: selectedFriendIds.includes(f.user_id) ? "#d1fae5" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriendIds.includes(f.user_id)}
                          onChange={() => handleToggleFriend(f.user_id)}
                        />
                        <span>{f.full_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Chia sẻ vào nhóm */}
            <div
              className={`share-option-card ${selectedOption === "GROUP" ? "is-selected" : ""}`}
              onClick={() => setSelectedOption("GROUP")}
            >
              <span className="option-icon">👥</span>
              <div className="option-text-group">
                <span className="option-title">Chia sẻ vào Nhóm cộng đồng</span>
                <span className="option-desc">
                  {selectedGroupIds.length > 0
                    ? `Đã chọn ${selectedGroupIds.length} nhóm`
                    : "Đăng vào nhóm sống xanh hoặc nhóm quận/huyện"}
                </span>
              </div>
            </div>

            {selectedOption === "GROUP" && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.75rem",
                }}
              >
                <input
                  type="text"
                  placeholder="🔍 Tìm nhóm cộng đồng..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.65rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    marginBottom: "0.5rem",
                  }}
                />
                {loadingGroups ? (
                  <div style={{ fontSize: "0.85rem", color: "#64748b", textAlign: "center", padding: "0.5rem" }}>
                    Đang tải danh sách nhóm...
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", textAlign: "center", padding: "0.5rem" }}>
                    Bạn chưa tham gia nhóm nào
                  </div>
                ) : (
                  <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {filteredGroups.map((g) => (
                      <label
                        key={g.group_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          padding: "0.3rem",
                          borderRadius: "4px",
                          background: selectedGroupIds.includes(g.group_id) ? "#d1fae5" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.group_id)}
                          onChange={() => handleToggleGroup(g.group_id)}
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Sao chép liên kết */}
            <div
              className="share-option-card copy-link-card"
              onClick={handleCopyLink}
              data-testid="option-copy-link"
            >
              <span className="option-icon">🔗</span>
              <div className="option-text-group">
                <span className="option-title">Sao chép liên kết</span>
                <span className="option-desc">Tự động sao chép đường dẫn trực tiếp tới chiến dịch</span>
              </div>
              <span className="quick-action-tag">Sao chép ngay</span>
            </div>
          </div>

          {/* CHIA SẺ RA MẠNG XÃ HỘI NGOÀI */}
          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: "0.5rem" }}>
              HOẶC CHIA SẺ QUA MẠNG XÃ HỘI:
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleShareExternal("facebook")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.75rem",
                  background: "#1877f2",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={() => handleShareExternal("zalo")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.75rem",
                  background: "#0068ff",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Zalo
              </button>
              <button
                type="button"
                onClick={() => handleShareExternal("twitter")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.75rem",
                  background: "#000000",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                X (Twitter)
              </button>
              <button
                type="button"
                onClick={() => handleShareExternal("telegram")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.75rem",
                  background: "#229ed9",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Telegram
              </button>
            </div>
          </div>
        </div>

        {/* Footer hành động */}
        <div className="modal-footer" style={{ padding: "1rem 1.5rem" }}>
          <div className="footer-actions-right">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Đóng
            </button>
            {selectedOption !== "LINK" && (
              <button
                type="button"
                className="btn-submit-primary"
                onClick={handleConfirmShare}
                disabled={isSubmitting}
                data-testid="btn-confirm-share"
              >
                {isSubmitting ? "Đang chia sẻ..." : "Chia sẻ ngay"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CampaignShareModal;
