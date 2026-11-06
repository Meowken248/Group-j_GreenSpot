import React, { useState, useEffect } from "react";
import type {
  PointPolicyResponse,
  DailyLimitsPolicyResponse,
  ClaimPointResponse,
} from "../types";
import { rewardsApi } from "../rewardsApi";
import { PointRewardModal } from "./PointRewardModal";

interface GreenPointsPolicyProps {
  isLoggedIn: boolean;
  onNavigateToAuth: () => void;
  onNavigateToWallet: () => void;
  onPointsUpdated?: () => void;
}

export const GreenPointsPolicy: React.FC<GreenPointsPolicyProps> = ({
  isLoggedIn,
  onNavigateToAuth,
  onNavigateToWallet,
  onPointsUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"rates" | "limits">("rates");
  const [policyData, setPolicyData] = useState<PointPolicyResponse | null>(null);
  const [limitsData, setLimitsData] = useState<DailyLimitsPolicyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Popup nhận điểm thưởng tức thì (Màn 3)
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [claimedReward, setClaimedReward] = useState<ClaimPointResponse | null>(null);

  const fetchPolicyData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [policy, limits] = await Promise.all([
        rewardsApi.getPointsPolicy(),
        rewardsApi.getDailyLimitsPolicy(),
      ]);
      setPolicyData(policy);
      setLimitsData(limits);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message || "Không thể tải chính sách tích điểm");
      } else {
        setErrorMsg("Lỗi kết nối máy chủ");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicyData();
  }, [isLoggedIn]);

  // Kích hoạt nhận điểm thử nghiệm hoặc thực tế
  const handleClaimPointAction = async (actionType: string) => {
    if (!isLoggedIn) {
      onNavigateToAuth();
      return;
    }

    setActionLoading(actionType);
    try {
      const payload = {
        action_type: actionType,
        description: `Thực hiện thành công hành động xanh từ ứng dụng`,
        latitude: 10.8500, // Tọa độ hợp lệ TP. Thủ Đức, TP.HCM
        longitude: 106.7700,
      };
      const result = await rewardsApi.claimPoints(payload);
      setClaimedReward(result);
      setRewardModalOpen(true);
      fetchPolicyData();
      if (onPointsUpdated) onPointsUpdated();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = anyErr?.response?.data?.detail || anyErr?.message || "Không thể nhận điểm lúc này";
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !policyData) {
    return (
      <div className="policy-loading-container">
        <div className="spinner-eco" />
        <p>Đang nạp bảng quy chuẩn tích lũy Điểm Xanh...</p>
      </div>
    );
  }

  return (
    <div className="green-policy-wrapper">
      {/* POPUP NHẬN ĐIỂM TỨC THÌ (CHỨC NĂNG 28 - MÀN 3) */}
      <PointRewardModal
        isOpen={rewardModalOpen}
        data={claimedReward}
        onClose={() => setRewardModalOpen(false)}
        onViewWallet={() => {
          setRewardModalOpen(false);
          onNavigateToWallet();
        }}
      />

      {/* HEADER BANNER */}
      <div className="policy-hero-banner">
        <div className="banner-content">
          <span className="badge-feature-tag">CHỨC NĂNG 28</span>
          <h1 className="banner-heading">Cơ Chế Tích Lũy Điểm Thưởng Công Dân Xanh</h1>
          <p className="banner-subtext">
            Chính sách khen thưởng sinh thái minh bạch ghi nhận từng đóng góp thiết thực của bạn
            trong việc dọn rác, làm sạch môi trường đô thị và xây dựng nếp sống văn minh số.
          </p>
        </div>

        {/* TAB CHUYỂN ĐỔI MÀN 1 VÀ MÀN 2 */}
        <div className="policy-subtabs-nav">
          <button
            type="button"
            className={`subtab-btn ${activeSubTab === "rates" ? "active" : ""}`}
            onClick={() => setActiveSubTab("rates")}
          >
            <span>📋</span>
            <span>Màn 1: Bảng quy chuẩn tích điểm</span>
          </button>
          <button
            type="button"
            className={`subtab-btn ${activeSubTab === "limits" ? "active" : ""}`}
            onClick={() => setActiveSubTab("limits")}
          >
            <span>🛡️</span>
            <span>Màn 2: Giới hạn & Chống gian lận</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-banner-error">
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={fetchPolicyData} className="btn-retry">
            Thử lại
          </button>
        </div>
      )}

      {/* NỘI DUNG MÀN 1: BẢNG QUY CHUẨN TÍCH ĐIỂM (2 CỘT) */}
      {activeSubTab === "rates" && policyData && (
        <div className="policy-two-columns-layout">
          {/* CỘT TRÁI: KHỐI "HÀNH ĐỘNG TÍCH ĐIỂM" */}
          <div className="policy-left-col">
            <div className="section-title-wrap">
              <span className="section-icon">🌱</span>
              <h2 className="section-title">HÀNH ĐỘNG TÍCH ĐIỂM</h2>
              <span className="section-badge">Bảng tỷ lệ cộng điểm chi tiết</span>
            </div>
            <p className="section-desc">
              Thực hiện các hành vi bảo vệ môi trường bên dưới để được hệ thống tự động cộng điểm
              vào ví cá nhân theo thời gian thực:
            </p>

            <div className="action-cards-grid">
              {policyData.actions.map((act) => (
                <div key={act.action_type} className="action-policy-card">
                  <div className="action-card-header">
                    <span className="action-icon">{act.icon}</span>
                    <span className="action-points-badge">{act.badge_label}</span>
                  </div>

                  <h3 className="action-name">{act.name}</h3>
                  <p className="action-desc">{act.description}</p>

                  <div className="action-card-footer">
                    {act.daily_cap && (
                      <span className="daily-cap-hint">
                        ⏳ Trần: {act.daily_cap}đ/ngày
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn-claim-action"
                      onClick={() => handleClaimPointAction(act.action_type)}
                      disabled={actionLoading === act.action_type}
                    >
                      {actionLoading === act.action_type ? (
                        "Đang xử lý..."
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Thực hiện ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI "TỔNG ĐIỂM" */}
          <div className="policy-right-col">
            <div className="section-title-wrap">
              <span className="section-icon">🏆</span>
              <h2 className="section-title">TỔNG ĐIỂM</h2>
              <span className="section-badge">Hồ sơ danh hiệu cá nhân</span>
            </div>

            {isLoggedIn && policyData.user_summary ? (
              <div className="user-score-panel">
                <div className="score-hero-box">
                  <span className="score-label">Điểm của tôi:</span>
                  <div className="score-number-display">
                    <strong className="points-number">
                      {policyData.user_summary.green_points.toLocaleString("vi-VN")}
                    </strong>
                    <span className="points-unit">Điểm Xanh</span>
                  </div>
                  <div className="lifetime-tag">
                    Tổng điểm tích lũy trọn đời:{" "}
                    <strong>
                      {policyData.user_summary.lifetime_points.toLocaleString("vi-VN")}
                    </strong>{" "}
                    điểm
                  </div>
                </div>

                <div className="tier-progress-box">
                  <div className="tier-header-row">
                    <div className="current-tier-badge">
                      <span className="badge-icon">
                        {policyData.user_summary.badge_icon}
                      </span>
                      <strong>{policyData.user_summary.tier_name}</strong>
                    </div>
                    {policyData.user_summary.next_tier_name && (
                      <span className="next-tier-hint">
                        Tiếp theo: {policyData.user_summary.next_tier_name}
                      </span>
                    )}
                  </div>

                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${policyData.user_summary.progress_percent}%`,
                      }}
                    />
                  </div>

                  <div className="progress-footer-row">
                    <span>
                      {policyData.user_summary.points_to_next_tier > 0 ? (
                        <>
                          Còn{" "}
                          <strong>
                            {policyData.user_summary.points_to_next_tier} điểm
                          </strong>{" "}
                          để thăng hạng tiếp theo
                        </>
                      ) : (
                        "Đã đạt cấp bậc cao nhất!"
                      )}
                    </span>
                    <span>{policyData.user_summary.progress_percent}%</span>
                  </div>
                </div>

                <div className="panel-actions-row">
                  <button
                    type="button"
                    className="btn-open-wallet"
                    onClick={onNavigateToWallet}
                  >
                    <span>💳</span>
                    <span>Mở Ví Điểm & Lịch Sử</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="guest-login-prompt-box">
                <div className="guest-prompt-icon">🔒</div>
                <h3>Đăng nhập để xem điểm của bạn</h3>
                <p>
                  Đăng nhập tài khoản GreenSpot để xem số dư điểm thưởng, theo dõi cấp bậc danh
                  hiệu và nhận các đặc quyền sống xanh!
                </p>
                <button
                  type="button"
                  className="btn-login-prompt"
                  onClick={onNavigateToAuth}
                >
                  Đăng nhập ngay
                </button>
              </div>
            )}

            {/* DANH SÁCH 4 CẤP BẬC CÔNG DÂN XANH */}
            <div className="tiers-ladder-box">
              <h3 className="tiers-ladder-title">Hệ Thống Cấp Bậc Danh Hiệu</h3>
              <div className="tiers-list">
                {policyData.tiers.map((t) => (
                  <div
                    key={t.tier_code}
                    className="tier-ladder-item"
                    style={{ borderLeftColor: t.color_hex }}
                  >
                    <div className="tier-item-head">
                      <span className="tier-badge-icon">{t.badge_icon}</span>
                      <strong>{t.tier_name}</strong>
                      <span className="tier-min-points">
                        {t.min_points === 0 ? "Khởi đầu" : `≥ ${t.min_points} điểm`}
                      </span>
                    </div>
                    <p className="tier-item-desc">{t.description}</p>
                    <ul className="tier-benefits-list">
                      {t.benefits.map((b, i) => (
                        <li key={i}>✓ {b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NỘI DUNG MÀN 2: ĐIỀU KHOẢN CHỐNG GIAN LẬN & GIỚI HẠN (2 CỘT) */}
      {activeSubTab === "limits" && limitsData && (
        <div className="policy-two-columns-layout">
          {/* CỘT TRÁI: KHỐI "GIỚI HẠN" */}
          <div className="policy-left-col">
            <div className="section-title-wrap">
              <span className="section-icon">⏱️</span>
              <h2 className="section-title">GIỚI HẠN ĐỊNH NGẠCH</h2>
              <span className="section-badge">Mức trần tích lũy 24 giờ</span>
            </div>
            <p className="section-desc">
              Nhằm ngăn chặn hành vi chia nhỏ spam và đảm bảo tính công bằng, hệ thống áp dụng
              các mức giới hạn tối đa mỗi ngày như sau:
            </p>

            <div className="limits-table-card">
              <table className="limits-table">
                <thead>
                  <tr>
                    <th>Hạng Mục</th>
                    <th>Trần Tối Đa</th>
                    <th>Quy Cách Áp Dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {limitsData.limits.map((lim, idx) => (
                    <tr key={idx}>
                      <td className="lim-cat">{lim.category}</td>
                      <td className="lim-points">
                        <strong>{lim.max_points}</strong> {lim.unit}
                      </td>
                      <td className="lim-note">{lim.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="conditions-checklist-box">
              <h3>Điều Kiện Ràng Buộc Hợp Lệ</h3>
              <ul className="conditions-list">
                {limitsData.conditions.map((c, i) => (
                  <li key={i}>
                    <span className="check-icon">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI "CẢNH BÁO" */}
          <div className="policy-right-col">
            <div className="section-title-wrap">
              <span className="section-icon">🚨</span>
              <h2 className="section-title">CẢNH BÁO GIAN LẬN</h2>
              <span className="section-badge badge-danger">Chế tài xử phạt nghiêm</span>
            </div>
            <p className="section-desc">
              Mọi hành vi can thiệp trái phép hoặc cố tình khai báo sai lệch sẽ bị hệ thống AI và
              Ban kiểm toán tự động thu hồi điểm thưởng và chế tài:
            </p>

            <div className="fraud-rules-grid">
              {limitsData.fraud_rules.map((rule) => (
                <div
                  key={rule.rule_type}
                  className={`fraud-rule-card severity-${rule.severity.toLowerCase()}`}
                >
                  <div className="rule-header">
                    <span className="rule-warning-icon">⛔</span>
                    <strong className="rule-title">{rule.title}</strong>
                    <span className={`rule-sev-tag ${rule.severity.toLowerCase()}`}>
                      {rule.severity}
                    </span>
                  </div>
                  <p className="rule-desc">{rule.description}</p>
                  <div className="rule-penalty-box">
                    <span className="penalty-label">Chế tài áp dụng:</span>
                    <span className="penalty-text">{rule.penalty_text}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="appeal-guide-card">
              <h4>Kênh Khiếu Nại & Hỗ Trợ</h4>
              <p>{limitsData.appeal_guide}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
