/**
 * BirthdayInboxModal (Hộp thư lời chúc & thiệp xanh sinh nhật đã nhận - Feature STT 17)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 146 - 147)
 *
 * Dữ liệu thật từ API:
 *  - GET  /api/v1/birthday/wishes/received  (hộp thư lời chúc đã nhận)
 *  - POST /api/v1/birthday/wishes/read      (đánh dấu đã đọc)
 */

import React, { useCallback, useEffect, useState } from "react";
import { birthdayService } from "../services/birthdayService";
import type { BirthdayCardTemplate, BirthdayWishItem } from "../types/birthday.types";

interface BirthdayInboxModalProps {
  templates?: BirthdayCardTemplate[];
  onClose: () => void;
  onUnreadChange?: (unreadCount: number) => void;
  onNotify?: (type: "success" | "error" | "info", message: string) => void;
}

const INBOX_PAGE_SIZE = 20;

const getInitialLetter = (fullName: string): string => {
  const parts = (fullName || "").trim().split(/\s+/);
  const lastWord = parts[parts.length - 1];
  return lastWord ? lastWord.charAt(0).toUpperCase() : "U";
};

/** Hiển thị ngày nhận lời chúc theo định dạng dd/mm/yyyy */
const formatWishDate = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getFullYear()}`;
};

export const BirthdayInboxModal: React.FC<BirthdayInboxModalProps> = ({
  templates = [],
  onClose,
  onUnreadChange,
  onNotify,
}) => {
  const [items, setItems] = useState<BirthdayWishItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [unread, setUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [marking, setMarking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const applyUnread = useCallback(
    (count: number) => {
      setUnread(count);
      onUnreadChange?.(count);
    },
    [onUnreadChange]
  );

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await birthdayService.getReceivedWishes(INBOX_PAGE_SIZE, 0);
      const list = res?.items ?? [];
      setItems(list);
      setTotal(res?.total ?? list.length);
      applyUnread(res?.unread_count ?? 0);
    } catch {
      setError("Không thể tải hộp thư lời chúc. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [applyUnread]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  // Đóng hộp thư bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Đánh dấu toàn bộ hộp thư đã đọc
  const handleMarkAll = async () => {
    if (marking || unread === 0) return;
    setMarking(true);
    try {
      await birthdayService.markWishesRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      applyUnread(0);
      onNotify?.("success", "Đã đánh dấu toàn bộ lời chúc là đã đọc.");
    } catch {
      onNotify?.("error", "Không thể đánh dấu đã đọc. Vui lòng thử lại sau.");
    } finally {
      setMarking(false);
    }
  };

  // Đánh dấu một lời chúc cụ thể
  const handleMarkOne = async (wishId: string) => {
    if (marking) return;
    setMarking(true);
    try {
      await birthdayService.markWishesRead([wishId]);
      setItems((prev) =>
        prev.map((item) => (item.wish_id === wishId ? { ...item, is_read: true } : item))
      );
      applyUnread(Math.max(unread - 1, 0));
    } catch {
      onNotify?.("error", "Không thể đánh dấu lời chúc này là đã đọc.");
    } finally {
      setMarking(false);
    }
  };

  const cardNameOf = (templateId?: string | null): string | null => {
    if (!templateId) return null;
    return templates.find((template) => template.card_id === templateId)?.name ?? null;
  };

  return (
    <div className="feed-modal-backdrop" onClick={onClose}>
      <div
        className="feed-modal-content birthday-inbox-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-inbox-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="birthday-inbox-head">
          <div className="birthday-inbox-icon" aria-hidden="true">
            💌
          </div>
          <div className="birthday-inbox-heading">
            <span className="birthday-inbox-eyebrow">🎂 Sinh nhật &amp; thiệp xanh</span>
            <h4 id="birthday-inbox-title">Hộp thư lời chúc của bạn</h4>
            <p>
              {unread > 0
                ? `${unread} lời chúc chưa đọc • Tổng ${total} lời chúc đã nhận`
                : `Tổng ${total} lời chúc đã nhận`}
            </p>
          </div>
          <button
            type="button"
            className="btn-close-birthday-inbox"
            aria-label="Đóng hộp thư lời chúc"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="birthday-inbox-toolbar">
          <button
            type="button"
            className="btn-mark-all-read"
            onClick={handleMarkAll}
            disabled={loading || marking || unread === 0}
          >
            {marking ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}
          </button>
        </div>

        <div className="birthday-inbox-body">
          {loading && (
            <div className="birthday-inbox-loading" aria-busy="true">
              <div className="birthday-inbox-skeleton"></div>
              <div className="birthday-inbox-skeleton"></div>
              <div className="birthday-inbox-skeleton"></div>
            </div>
          )}

          {!loading && error && (
            <div className="birthday-inbox-error-box">
              <div className="birthday-inbox-error" role="alert">
                ⚠️ {error}
              </div>
              <button type="button" className="btn-retry-inbox" onClick={() => void loadInbox()}>
                Thử lại
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="birthday-inbox-empty">
              <span aria-hidden="true">🌱</span>
              <p>
                Chưa có lời chúc nào trong hộp thư. Hãy lan toả lối sống xanh để nhận thiệp từ bạn bè
                nhé!
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="birthday-inbox-list">
              {items.map((item) => {
                const cardName = cardNameOf(item.card_template_id);
                return (
                  <li
                    key={item.wish_id}
                    className={`birthday-inbox-item ${item.is_read ? "is-read" : "is-unread"}`}
                  >
                    <div className="birthday-inbox-avatar" aria-hidden="true">
                      {item.sender_avatar_url ? (
                        <img src={item.sender_avatar_url} alt="" />
                      ) : (
                        <span>{getInitialLetter(item.sender_name)}</span>
                      )}
                    </div>

                    <div className="birthday-inbox-item-body">
                      <div className="birthday-inbox-item-head">
                        <strong>{item.sender_name}</strong>
                        <span
                          className={`inbox-type-chip ${
                            item.wish_type === "CARD" ? "type-card" : "type-message"
                          }`}
                        >
                          {item.wish_type === "CARD"
                            ? `💌 ${cardName ?? "Thiệp xanh"}`
                            : "💬 Lời chúc xanh"}
                        </span>
                        {!item.is_read && <span className="inbox-unread-label">Chưa đọc</span>}
                      </div>

                      <p className="birthday-inbox-message">{item.message}</p>

                      <div className="birthday-inbox-meta">
                        <span className="inbox-date">{formatWishDate(item.created_at)}</span>
                        {item.points_awarded > 0 && (
                          <span className="inbox-points-chip">+{item.points_awarded} điểm xanh</span>
                        )}
                        {!item.is_read && (
                          <button
                            type="button"
                            className="btn-mark-one-read"
                            onClick={() => void handleMarkOne(item.wish_id)}
                            disabled={marking}
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BirthdayInboxModal;
