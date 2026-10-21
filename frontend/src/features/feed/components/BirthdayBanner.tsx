/**
 * BirthdayBanner (Widget Sinh nhật bạn bè hôm nay - Feature STT 17)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 145)
 *
 * Dữ liệu thật từ API GET /api/v1/birthday/today: chỉ hiển thị bạn bè đang hoạt động,
 * còn quan hệ bạn bè và đã bật cờ "Hiển thị ngày sinh với bạn bè".
 */

import React, { useCallback, useEffect, useState } from "react";
import { birthdayService } from "../services/birthdayService";
import { BirthdayWishModal } from "./BirthdayWishModal";
import type {
  BirthdayFriendItem,
  BirthdayTodayResponse,
  BirthdayWishSendResponse,
  BirthdayWishType,
} from "../types/birthday.types";

interface BirthdayBannerProps {
  isLoggedIn?: boolean;
  onSendWish?: (friendName: string) => void;
  onNotify?: (type: "success" | "error" | "info", message: string) => void;
}

const DEFAULT_LIMIT = 3;

const getInitialLetter = (fullName: string): string => {
  const parts = (fullName || "").trim().split(/\s+/);
  const lastWord = parts[parts.length - 1];
  return lastWord ? lastWord.charAt(0).toUpperCase() : "U";
};

export const BirthdayBanner: React.FC<BirthdayBannerProps> = ({
  isLoggedIn = true,
  onSendWish,
  onNotify,
}) => {
  const [data, setData] = useState<BirthdayTodayResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(isLoggedIn);
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const [modal, setModal] = useState<{ friend: BirthdayFriendItem; wishType: BirthdayWishType } | null>(
    null
  );

  // Tải khối "Sinh nhật hôm nay" khi người dùng đã đăng nhập
  useEffect(() => {
    let cancelled = false;

    if (!isLoggedIn) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    birthdayService
      .getTodayBirthdays(DEFAULT_LIMIT)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        // Banner là widget phụ trợ: lỗi mạng không được làm hỏng Bảng tin
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Mở rộng danh sách khi có nhiều hơn 3 bạn sinh nhật
  const handleViewAll = useCallback(async () => {
    if (!data || loadingAll) return;
    setLoadingAll(true);
    try {
      const res = await birthdayService.getTodayBirthdays(Math.max(data.total, DEFAULT_LIMIT + 1));
      setData(res);
    } catch {
      onNotify?.("error", "Không thể tải đầy đủ danh sách sinh nhật.");
    } finally {
      setLoadingAll(false);
    }
  }, [data, loadingAll, onNotify]);

  // Cập nhật trạng thái ngay trên banner sau khi gửi thành công
  const handleSent = (result: BirthdayWishSendResponse, wishType: BirthdayWishType) => {
    setModal(null);
    setData((prev) => {
      if (!prev) return prev;
      const earned = prev.daily_points_earned + result.points_awarded;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.user_id === result.recipient_id
            ? {
                ...item,
                wish_sent_today: item.wish_sent_today || wishType === "MESSAGE",
                card_sent_today: item.card_sent_today || wishType === "CARD",
              }
            : item
        ),
        daily_points_earned: Math.min(earned, prev.daily_points_cap),
        daily_reward_limit_reached: result.daily_limit_reached || earned >= prev.daily_points_cap,
      };
    });

    onNotify?.(
      "success",
      wishType === "CARD"
        ? `Đã tặng thiệp xanh đến ${result.recipient_name} (+${result.points_awarded} điểm)!`
        : `Đã gửi lời chúc xanh đến ${result.recipient_name}!`
    );
    onSendWish?.(result.recipient_name);
  };

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <div className="feed-birthday-banner birthday-banner-skeleton" aria-busy="true">
        <div className="birthday-skeleton-line line-title"></div>
        <div className="birthday-skeleton-line line-desc"></div>
        <div className="birthday-skeleton-row"></div>
      </div>
    );
  }
  if (!data || data.items.length === 0) return null;

  return (
    <div className="feed-birthday-banner" role="region" aria-label="Sinh nhật bạn bè hôm nay">
      <div className="birthday-banner-head">
        <div className="birthday-icon-badge" aria-hidden="true">
          🎂
        </div>
        <div className="birthday-info-col">
          <h4 className="birthday-title">Sinh nhật bạn bè hôm nay</h4>
          <p className="birthday-desc">
            Hôm nay có <strong>{data.total}</strong> người bạn sinh nhật. Gửi lời chúc xanh và thiệp sinh thái
            để lan toả lối sống xanh nhé!
          </p>
        </div>
        <span className="birthday-points-chip" title="Điểm thưởng thiệp xanh đã nhận trong ngày">
          🌿 {data.daily_points_earned}/{data.daily_points_cap} điểm
        </span>
      </div>

      <ul className="birthday-friend-list">
        {data.items.map((friend) => (
          <li
            key={friend.user_id}
            className={`birthday-friend-row ${friend.card_sent_today ? "card-sent" : ""}`}
          >
            <div className="birthday-friend-avatar" aria-hidden="true">
              {friend.avatar_url ? (
                <img src={friend.avatar_url} alt="" />
              ) : (
                <span>{getInitialLetter(friend.full_name)}</span>
              )}
            </div>

            <div className="birthday-friend-info">
              <div className="birthday-friend-name-row">
                <strong>{friend.full_name}</strong>
                <span className="birthday-age-chip">🎈 {friend.age} tuổi</span>
                {friend.citizen_level_name && (
                  <span className="birthday-level-chip">{friend.citizen_level_name}</span>
                )}
              </div>
              <div className="birthday-friend-status-row">
                <span className={friend.wish_sent_today ? "status-done" : "status-pending"}>
                  {friend.wish_sent_today ? "✅ Đã gửi lời chúc" : "💬 Chưa gửi lời chúc"}
                </span>
                <span className="status-dot">•</span>
                <span className={friend.card_sent_today ? "status-done" : "status-pending"}>
                  {friend.card_sent_today ? "💌 Đã tặng thiệp xanh" : "🌱 Chưa tặng thiệp xanh"}
                </span>
              </div>
            </div>

            <div className="birthday-action-col">
              <button
                type="button"
                className={`btn-send-birthday-wish ${friend.wish_sent_today ? "wished" : ""}`}
                onClick={() => setModal({ friend, wishType: "MESSAGE" })}
                disabled={friend.wish_sent_today}
              >
                {friend.wish_sent_today ? "Đã gửi lời chúc" : "Gửi lời chúc xanh"}
              </button>
              <button
                type="button"
                className={`btn-send-birthday-card ${friend.card_sent_today ? "sent" : ""}`}
                onClick={() => setModal({ friend, wishType: "CARD" })}
                disabled={friend.card_sent_today || data.daily_reward_limit_reached}
                title={
                  data.daily_reward_limit_reached
                    ? "Bạn đã đạt hạn mức điểm thưởng thiệp xanh hôm nay"
                    : `Tặng thiệp xanh nhận +${data.points_per_card} điểm`
                }
              >
                {friend.card_sent_today ? "Đã tặng thiệp" : "Tặng thiệp xanh"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="birthday-banner-foot">
        <span className="birthday-foot-note">
          {data.daily_reward_limit_reached
            ? "Bạn đã đạt hạn mức điểm thưởng thiệp xanh hôm nay, hẹn gặp lại vào ngày mai!"
            : `Tặng thiệp xanh nhận +${data.points_per_card} điểm cho cả hai, tối đa ${data.daily_points_cap} điểm/ngày.`}
        </span>
        {data.has_more && (
          <button
            type="button"
            className="btn-birthday-view-all"
            onClick={handleViewAll}
            disabled={loadingAll}
          >
            {loadingAll ? "Đang tải..." : `Xem tất cả ${data.total} người`}
          </button>
        )}
      </div>

      {modal && (
        <BirthdayWishModal
          friend={modal.friend}
          initialWishType={modal.wishType}
          templates={data.card_templates}
          defaultSuggestion={data.default_suggestion}
          pointsPerCard={data.points_per_card}
          dailyPointsEarned={data.daily_points_earned}
          dailyPointsCap={data.daily_points_cap}
          dailyRewardLimitReached={data.daily_reward_limit_reached}
          onClose={() => setModal(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
};

