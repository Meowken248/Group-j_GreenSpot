/**
 * BirthdayWishModal (Popup gửi lời chúc / tặng thiệp xanh sinh nhật - Feature STT 17)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 145 - 147)
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { birthdayService } from "../services/birthdayService";
import type {
  BirthdayCardTemplate,
  BirthdayFriendItem,
  BirthdayWishSendResponse,
  BirthdayWishType,
} from "../types/birthday.types";

export const MAX_WISH_LENGTH = 200;

interface BirthdayWishModalProps {
  friend: BirthdayFriendItem;
  initialWishType?: BirthdayWishType;
  templates: BirthdayCardTemplate[];
  defaultSuggestion: string;
  pointsPerCard: number;
  dailyPointsEarned: number;
  dailyPointsCap: number;
  dailyRewardLimitReached: boolean;
  onClose: () => void;
  onSent: (result: BirthdayWishSendResponse, wishType: BirthdayWishType) => void;
}

/** Lấy tên gọi ngắn (từ cuối cùng) giống backend */
const getDisplayName = (fullName: string): string => {
  const parts = (fullName || "").trim().split(/\s+/);
  return parts.length > 0 && parts[parts.length - 1] ? parts[parts.length - 1] : "bạn";
};

/** Điền tên người nhận vào câu gợi ý lời chúc */
const buildSuggestion = (template: string, fullName: string): string =>
  (template || "").replace(/\{name\}/g, getDisplayName(fullName));

const getInitialLetter = (fullName: string): string => {
  const name = getDisplayName(fullName);
  return name.charAt(0).toUpperCase() || "U";
};

export const BirthdayWishModal: React.FC<BirthdayWishModalProps> = ({
  friend,
  initialWishType = "MESSAGE",
  templates,
  defaultSuggestion,
  pointsPerCard,
  dailyPointsEarned,
  dailyPointsCap,
  dailyRewardLimitReached,
  onClose,
  onSent,
}) => {
  const [wishType, setWishType] = useState<BirthdayWishType>(initialWishType);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    initialWishType === "CARD" ? templates[0]?.card_id ?? null : null
  );
  const [message, setMessage] = useState<string>(() =>
    buildSuggestion(
      initialWishType === "CARD" ? templates[0]?.suggestion ?? defaultSuggestion : defaultSuggestion,
      friend.full_name
    )
  );
  const [messageEdited, setMessageEdited] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedCard = useMemo(
    () => templates.find((item) => item.card_id === selectedCardId) ?? null,
    [templates, selectedCardId]
  );

  // Đóng popup bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, sending]);

  // Chuyển đổi giữa lời chúc và thiệp xanh (giữ nguyên lời chúc người dùng đã sửa)
  const handleTypeChange = (nextType: BirthdayWishType) => {
    if (nextType === wishType) return;
    setWishType(nextType);
    setError(null);

    if (nextType === "CARD") {
      const card = selectedCardId
        ? templates.find((item) => item.card_id === selectedCardId) ?? templates[0] ?? null
        : templates[0] ?? null;
      if (card) {
        setSelectedCardId(card.card_id);
        if (!messageEdited) {
          setMessage(buildSuggestion(card.suggestion, friend.full_name));
        }
      }
    } else if (!messageEdited) {
      setMessage(buildSuggestion(defaultSuggestion, friend.full_name));
    }
  };

  // Chọn mẫu thiệp xanh khác
  const handleTemplateSelect = (card: BirthdayCardTemplate) => {
    setSelectedCardId(card.card_id);
    setError(null);
    if (!messageEdited) {
      setMessage(buildSuggestion(card.suggestion, friend.full_name));
    }
  };

  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (value.length > MAX_WISH_LENGTH) {
      setMessage(value.slice(0, MAX_WISH_LENGTH));
    } else {
      setMessage(value);
    }
    setMessageEdited(true);
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    const cleanMessage = message.trim().replace(/\s+/g, " ");

    if (!cleanMessage) {
      setError("Vui lòng nhập lời chúc sinh nhật.");
      textareaRef.current?.focus();
      return;
    }
    if (cleanMessage.length > MAX_WISH_LENGTH) {
      setError(`Lời chúc tối đa ${MAX_WISH_LENGTH} ký tự.`);
      return;
    }
    if (wishType === "CARD" && !selectedCard) {
      setError("Vui lòng chọn một mẫu thiệp xanh.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const result = await birthdayService.sendWish({
        recipient_id: friend.user_id,
        wish_type: wishType,
        card_template_id: wishType === "CARD" ? selectedCard?.card_id ?? null : null,
        message: cleanMessage,
      });
      onSent(result, wishType);
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.detail?.message ||
        err?.response?.data?.detail;
      setError(
        typeof apiMessage === "string" && apiMessage.trim()
          ? apiMessage
          : "Không thể gửi lời chúc lúc này. Vui lòng thử lại sau."
      );
    } finally {
      setSending(false);
    }
  };

  const remainingPoints = Math.max(0, dailyPointsCap - dailyPointsEarned);

  return (
    <div className="feed-modal-backdrop" onClick={sending ? undefined : onClose}>
      <div
        className="feed-modal-content birthday-wish-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-wish-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="birthday-wish-head">
          <div className="birthday-wish-avatar" aria-hidden="true">
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt="" />
            ) : (
              <span>{getInitialLetter(friend.full_name)}</span>
            )}
          </div>
          <div className="birthday-wish-heading">
            <span className="birthday-wish-eyebrow">🎂 Sinh nhật hôm nay</span>
            <h4 id="birthday-wish-title">Gửi lời chúc đến {friend.full_name}</h4>
            <p>{friend.age} tuổi • Hãy lan toả lối sống xanh bằng một lời chúc thật ấm áp!</p>
          </div>
          <button
            type="button"
            className="btn-close-birthday-wish"
            aria-label="Đóng popup gửi lời chúc"
            onClick={onClose}
            disabled={sending}
          >
            ✕
          </button>
        </div>

        <div className="birthday-wish-type-tabs" role="tablist" aria-label="Chọn hình thức gửi">
          <button
            type="button"
            role="tab"
            aria-selected={wishType === "MESSAGE"}
            className={`wish-type-tab ${wishType === "MESSAGE" ? "active" : ""}`}
            onClick={() => handleTypeChange("MESSAGE")}
            disabled={sending || friend.wish_sent_today}
          >
            💬 Lời chúc xanh
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={wishType === "CARD"}
            className={`wish-type-tab ${wishType === "CARD" ? "active" : ""}`}
            onClick={() => handleTypeChange("CARD")}
            disabled={sending || friend.card_sent_today || dailyRewardLimitReached}
          >
            🌱 Thiệp xanh (+{pointsPerCard} điểm)
          </button>
        </div>

        {wishType === "CARD" && (
          <div className="birthday-template-section">
            <div className="birthday-template-grid" role="radiogroup" aria-label="Chọn mẫu thiệp xanh">
              {templates.map((card) => (
                <button
                  key={card.card_id}
                  type="button"
                  role="radio"
                  aria-checked={selectedCardId === card.card_id}
                  className={`birthday-template-card ${selectedCardId === card.card_id ? "selected" : ""}`}
                  style={{
                    background: `linear-gradient(135deg, ${card.gradient_from} 0%, ${card.gradient_to} 100%)`,
                    borderColor:
                      selectedCardId === card.card_id ? card.accent_color : "transparent",
                  }}
                  onClick={() => handleTemplateSelect(card)}
                  disabled={sending}
                >
                  <span className="template-icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <span className="template-name">{card.name}</span>
                  <span className="template-tagline">{card.tagline}</span>
                </button>
              ))}
            </div>
            {selectedCard && (
              <div
                className="birthday-template-preview"
                style={{
                  background: `linear-gradient(135deg, ${selectedCard.gradient_from} 0%, ${selectedCard.gradient_to} 100%)`,
                  borderColor: selectedCard.accent_color,
                  color: selectedCard.accent_color,
                }}
              >
                <span className="preview-icon" aria-hidden="true">
                  {selectedCard.icon}
                </span>
                <span className="preview-text">
                  Thiệp <strong>{selectedCard.name}</strong> sẽ được gửi kèm lời chúc của bạn
                </span>
              </div>
            )}
          </div>
        )}

        <div className="birthday-message-field">
          <label htmlFor="birthday-wish-message">Lời chúc của bạn</label>
          <textarea
            id="birthday-wish-message"
            ref={textareaRef}
            rows={4}
            maxLength={MAX_WISH_LENGTH}
            value={message}
            onChange={handleMessageChange}
            placeholder="Viết lời chúc thật ấm áp và xanh đến người bạn này..."
            disabled={sending}
            className={error && !message.trim() ? "input-error" : ""}
          />
          <div className={`birthday-message-counter ${message.length >= MAX_WISH_LENGTH ? "limit" : ""}`}>
            {message.length}/{MAX_WISH_LENGTH}
          </div>
        </div>

        {error && (
          <div className="birthday-wish-error" role="alert">
            ⚠️ {error}
          </div>
        )}

        <div className="birthday-wish-note">
          {wishType === "CARD" ? (
            <span>
              🌿 Tặng thiệp xanh: bạn và người nhận cùng nhận <strong>+{pointsPerCard} điểm</strong>. Hôm nay
              bạn còn <strong>{remainingPoints}</strong>/{dailyPointsCap} điểm thưởng thiệp xanh.
            </span>
          ) : (
            <span>💌 Lời chúc xanh miễn phí, không giới hạn số bạn bè nhưng mỗi bạn chỉ nhận 1 lời chúc/ngày.</span>
          )}
        </div>

        <div className="birthday-wish-actions">
          <button type="button" className="btn-cancel-birthday-wish" onClick={onClose} disabled={sending}>
            Huỷ
          </button>
          <button type="button" className="btn-submit-birthday-wish" onClick={handleSubmit} disabled={sending}>
            {sending ? "Đang gửi..." : wishType === "CARD" ? "🎁 Tặng thiệp xanh" : "🌱 Gửi lời chúc"}
          </button>
        </div>
      </div>
    </div>
  );
};
