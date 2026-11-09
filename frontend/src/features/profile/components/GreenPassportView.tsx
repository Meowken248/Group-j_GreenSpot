import React from "react";
import type {
  GreenPassportData,
  UserBadgesData,
  UserProfile,
} from "../types/profile.types";

interface GreenPassportViewProps {
  userProfile: UserProfile | null;
  passportData: GreenPassportData | null;
  badgesData: UserBadgesData | null;
  passportLoading: boolean;
  badgesLoading: boolean;
  passportError: string | null;
  badgesError: string | null;
  onRetryPassport: () => void;
  onRetryBadges: () => void;
  onBackToTimeline: () => void;
  onOpenHistory: () => void;
}

export const GreenPassportView: React.FC<GreenPassportViewProps> = ({
  userProfile,
  passportData,
  badgesData,
  passportLoading,
  badgesLoading,
  passportError,
  badgesError,
  onRetryPassport,
  onRetryBadges,
  onBackToTimeline,
  onOpenHistory,
}) => {
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  const getAvatarLetter = (fullName?: string) => {
    if (!fullName) return "U";
    const words = fullName.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return lastWord ? lastWord.charAt(0).toUpperCase() : "U";
  };

  return (
    <div>
      {/* Thanh liên kết quay về Màn 1 */}
      <div className="profile-subnav-bar" style={{ padding: "0 0 16px" }}>
        <span className="back-profile-link" onClick={onBackToTimeline}>
          ← Trang cá nhân của {userProfile?.full_name || "bạn"}
        </span>
      </div>

      <div className="passport-badges-layout">
        {/* ================================================================= */}
        {/* CỘT TRÁI: GREEN PASSPORT */}
        {/* ================================================================= */}
        <div className="passport-card-box">
          {passportLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div
                  className="skeleton-box"
                  style={{ width: "64px", height: "64px", borderRadius: "50%" }}
                />
                <div className="skeleton-box" style={{ width: "160px", height: "24px" }} />
              </div>
              <div className="skeleton-box" style={{ width: "120px", height: "28px" }} />
              <div className="skeleton-box" style={{ width: "200px", height: "40px" }} />
              <div className="skeleton-box" style={{ width: "100%", height: "14px" }} />
              <div className="skeleton-box" style={{ width: "60%", height: "16px" }} />
            </div>
          ) : passportError ? (
            <div className="column-error-box">
              <p className="error-msg-text">Không thể tải Green Passport. Vui lòng thử lại</p>
              <button type="button" className="btn-retry-col" onClick={onRetryPassport}>
                Tải lại
              </button>
            </div>
          ) : passportData ? (
            <>
              {/* 1. Avatar tròn 64px và Họ tên in đậm */}
              <div className="passport-user-header">
                {passportData.avatar_url ? (
                  <img
                    src={passportData.avatar_url}
                    alt={passportData.full_name}
                    className="passport-avatar"
                  />
                ) : (
                  <div className="passport-avatar-placeholder">
                    {getAvatarLetter(passportData.full_name)}
                  </div>
                )}
                <div className="passport-full-name">{passportData.full_name}</div>
              </div>

              {/* 2. Số hộ chiếu: GP-xxxxxx */}
              <div>
                <span className="passport-code-line">Số hộ chiếu: {passportData.passport_code}</span>
              </div>

              {/* 3. Cấp hiện tại (cỡ chữ lớn) */}
              <div className="passport-level-section">
                <div className="level-lbl">Cấp hiện tại:</div>
                <div className="level-val-big">{passportData.current_level}</div>
              </div>

              {/* 4. Tổng điểm xanh đã tích lũy */}
              <div className="passport-points-line">
                Tổng điểm xanh đã tích lũy: <strong>{passportData.total_green_points}</strong>
              </div>

              {/* 5. Thanh tiến độ lên cấp theo công thức */}
              <div className="passport-progress-block">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${passportData.progress_percentage}%` }}
                  />
                </div>
                <div className="progress-hint-text">
                  {passportData.is_max_level
                    ? "Đã đạt cấp cao nhất"
                    : `Còn ${passportData.points_to_next_level} điểm để lên cấp ${passportData.next_level_name}`}
                </div>
              </div>

              {/* 6. Ngày cấp lấy từ activated_at */}
              <div className="passport-date-line">
                Ngày cấp: {formatDate(passportData.activated_at)}
              </div>

              {/* 7. Liên kết Xem lịch sử đóng góp */}
              <div>
                <span className="passport-history-link" onClick={onOpenHistory}>
                  Xem lịch sử đóng góp
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* ================================================================= */}
        {/* CỘT PHẢI: HUY HIỆU */}
        {/* ================================================================= */}
        <div className="badges-collection-box">
          {badgesLoading ? (
            <div className="badge-group">
              <div className="skeleton-box" style={{ width: "160px", height: "24px", marginBottom: "20px" }} />
              <div className="badges-grid-3col">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="skeleton-box"
                    style={{ height: "130px", borderRadius: "12px" }}
                  />
                ))}
              </div>
            </div>
          ) : badgesError ? (
            <div className="column-error-box">
              <p className="error-msg-text">Không thể tải huy hiệu. Vui lòng thử lại</p>
              <button type="button" className="btn-retry-col" onClick={onRetryBadges}>
                Tải lại
              </button>
            </div>
          ) : badgesData ? (
            <>
              {/* PHẦN 1: ĐÃ NHẬN ({X}) */}
              <div className="badge-group">
                <h3 className="group-header-title">
                  Đã nhận ({badgesData.earned_badges.length})
                </h3>

                {badgesData.earned_badges.length === 0 ? (
                  <p className="empty-group-text">
                    {badgesData.is_own_profile
                      ? "Bạn chưa có huy hiệu nào. Hãy tham gia thử thách xanh để nhận huy hiệu đầu tiên"
                      : "Chưa có huy hiệu nào"}
                  </p>
                ) : (
                  <div className="badges-grid-3col">
                    {badgesData.earned_badges.map((b) => (
                      <div key={b.badge_id} className="badge-grid-cell">
                        <img src={b.icon_url} alt={b.name} className="badge-icon-64" />
                        <div className="cell-badge-name">{b.name}</div>
                        <div className="cell-badge-sub">{formatDate(b.earned_at)}</div>

                        {/* Tooltip khi hover / tap giữ */}
                        <div className="badge-tooltip">
                          <div className="tooltip-title">{b.name}</div>
                          <div>{b.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PHẦN 2: CHƯA MỞ KHÓA ({Y}) - CHỈ HIỆN Ở TRANG CỦA MÌNH */}
              {badgesData.is_own_profile && badgesData.locked_badges && (
                <div className="badge-group">
                  <h3 className="group-header-title">
                    Chưa mở khoá ({badgesData.locked_badges.length})
                  </h3>

                  {badgesData.locked_badges.length === 0 ? (
                    <p className="empty-group-text">Bạn đã mở khoá tất cả huy hiệu</p>
                  ) : (
                    <div className="badges-grid-3col">
                      {badgesData.locked_badges.map((b) => (
                        <div key={b.badge_id} className="badge-grid-cell locked-cell">
                          <span className="lock-overlay-icon">🔒</span>
                          <img src={b.icon_url} alt={b.name} className="badge-icon-64" />
                          <div className="cell-badge-name">{b.name}</div>
                          <div className="cell-condition-text">
                            Điều kiện: {b.unlock_condition}
                          </div>

                          {/* Tooltip khi hover / tap giữ */}
                          <div className="badge-tooltip">
                            <div className="tooltip-title">{b.name}</div>
                            <div>{b.description}</div>
                            <div style={{ marginTop: "4px", color: "#a7f3d0" }}>
                              Điều kiện: {b.unlock_condition}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
