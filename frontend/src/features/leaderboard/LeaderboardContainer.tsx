import React, { useState, useEffect, useCallback } from "react";
import { leaderboardApi } from "./leaderboardApi";
import type {
  LeaderboardTab,
  CycleFilter,
  IndividualLeaderboardResponse,
  GroupLeaderboardResponse,
  DistrictLeaderboardResponse,
  GroupLeaderboardItem,
  DistrictLeaderboardItem,
} from "./types";
import "./leaderboard.css";

interface Props {
  onNavigateLogin?: () => void;
  onNavigateHeatmap?: (districtCode?: string) => void;
}

export const LeaderboardContainer: React.FC<Props> = ({
  onNavigateLogin,
  onNavigateHeatmap,
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("INDIVIDUAL");
  const [cycle, setCycle] = useState<CycleFilter>("WEEK");

  // State for Individual tab
  const [individualData, setIndividualData] = useState<IndividualLeaderboardResponse | null>(null);
  const [loadingIndividual, setLoadingIndividual] = useState<boolean>(false);
  const [errorIndividual, setErrorIndividual] = useState<string | null>(null);

  // State for Group tab
  const [groupData, setGroupData] = useState<GroupLeaderboardResponse | null>(null);
  const [loadingGroup, setLoadingGroup] = useState<boolean>(false);
  const [errorGroup, setErrorGroup] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupLeaderboardItem | null>(null);

  // State for District tab
  const [districtData, setDistrictData] = useState<DistrictLeaderboardResponse | null>(null);
  const [loadingDistrict, setLoadingDistrict] = useState<boolean>(false);
  const [errorDistrict, setErrorDistrict] = useState<string | null>(null);

  // 1. Fetch Individual Leaderboard
  const fetchIndividual = useCallback(async () => {
    setLoadingIndividual(true);
    setErrorIndividual(null);
    try {
      const data = await leaderboardApi.getIndividualLeaderboard();
      setIndividualData(data);
    } catch {
      setErrorIndividual("Không thể tải bảng xếp hạng. Vui lòng thử lại");
    } finally {
      setLoadingIndividual(false);
    }
  }, []);

  // 2. Fetch Group Leaderboard
  const fetchGroups = useCallback(async (c: CycleFilter) => {
    setLoadingGroup(true);
    setErrorGroup(null);
    try {
      const data = await leaderboardApi.getGroupLeaderboard(c);
      setGroupData(data);
    } catch {
      setErrorGroup("Lỗi kết nối. Không thể tải bảng xếp hạng nhóm");
    } finally {
      setLoadingGroup(false);
    }
  }, []);

  // 3. Fetch District Leaderboard
  const fetchDistricts = useCallback(async (c: CycleFilter) => {
    setLoadingDistrict(true);
    setErrorDistrict(null);
    try {
      const data = await leaderboardApi.getDistrictLeaderboard(c);
      setDistrictData(data);
    } catch {
      setErrorDistrict("Không thể tải số liệu xếp hạng quận. Vui lòng thử lại");
    } finally {
      setLoadingDistrict(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchIndividual();
  }, [fetchIndividual]);

  // Tab switch effect
  const handleTabChange = (tab: LeaderboardTab) => {
    setActiveTab(tab);
    if (tab === "GROUP" && (!groupData || groupData.cycle !== cycle)) {
      fetchGroups(cycle);
    } else if (tab === "DISTRICT" && (!districtData || districtData.cycle !== cycle)) {
      fetchDistricts(cycle);
    }
  };

  // Cycle switch effect
  const handleCycleChange = (newCycle: CycleFilter) => {
    setCycle(newCycle);
    if (activeTab === "GROUP") {
      fetchGroups(newCycle);
    } else if (activeTab === "DISTRICT") {
      fetchDistricts(newCycle);
    }
  };

  const cycleLabels: Record<CycleFilter, string> = {
    WEEK: "Tuần",
    MONTH: "Tháng",
    ALL: "Tất cả",
  };

  return (
    <div className="lb-page-container">
      {/* Header Banner */}
      <div className="lb-header">
        <div>
          <div className="lb-header-title">
            <span>🏆</span>
            <span>Bảng Vinh Danh Công Dân Xanh</span>
          </div>
          <p className="lb-header-subtitle">
            Tôn vinh các cá nhân, tập thể và địa phương tiên phong vì môi trường bền vững. Tích lũy Điểm Xanh qua từng hành động bảo vệ TP.HCM!
          </p>
        </div>
      </div>

      {/* Tabs and Cycle Filter bar */}
      <div className="lb-tabs-container">
        <div className="lb-nav-tabs">
          <button
            className={`lb-tab-btn ${activeTab === "INDIVIDUAL" ? "active" : ""}`}
            onClick={() => handleTabChange("INDIVIDUAL")}
          >
            <span>👤</span>
            <span>Cá nhân</span>
          </button>
          <button
            className={`lb-tab-btn ${activeTab === "GROUP" ? "active" : ""}`}
            onClick={() => handleTabChange("GROUP")}
          >
            <span>👥</span>
            <span>Nhóm tình nguyện</span>
          </button>
          <button
            className={`lb-tab-btn ${activeTab === "DISTRICT" ? "active" : ""}`}
            onClick={() => handleTabChange("DISTRICT")}
          >
            <span>📍</span>
            <span>Quận / Huyện</span>
          </button>
        </div>

        {activeTab !== "INDIVIDUAL" && (
          <div className="lb-cycle-filters">
            {(["WEEK", "MONTH", "ALL"] as CycleFilter[]).map((c) => (
              <button
                key={c}
                className={`lb-cycle-btn ${cycle === c ? "active" : ""}`}
                onClick={() => handleCycleChange(c)}
              >
                {cycleLabels[c]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: INDIVIDUAL (MÀN 1) */}
      {activeTab === "INDIVIDUAL" && (
        <>
          {errorIndividual ? (
            <div className="lb-error-box">
              <p className="lb-error-msg">{errorIndividual}</p>
              <button className="lb-retry-btn" onClick={fetchIndividual}>
                Thử lại
              </button>
            </div>
          ) : loadingIndividual ? (
            <div className="lb-spinner" />
          ) : (
            <div className="lb-grid-layout">
              {/* Left Column: Top 10 Citizens */}
              <div className="lb-card">
                <div className="lb-card-header">
                  <div className="lb-card-title">
                    <span>🌟</span>
                    <span>Top 10 Công Dân Xuất Sắc</span>
                  </div>
                  <span className="lb-card-badge">Toàn thành phố</span>
                </div>

                <div className="lb-list">
                  {individualData?.top_10.map((item) => (
                    <div
                      key={item.user_id}
                      className={`lb-item ${
                        item.rank === 1
                          ? "podium-1"
                          : item.rank === 2
                          ? "podium-2"
                          : item.rank === 3
                          ? "podium-3"
                          : ""
                      }`}
                    >
                      <div className="lb-item-left">
                        <div className="lb-rank-badge">{item.badge_icon}</div>
                        {item.avatar_url ? (
                          <img
                            src={item.avatar_url}
                            alt={item.full_name}
                            className="lb-avatar"
                          />
                        ) : (
                          <div className="lb-avatar-fallback">
                            {item.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="lb-user-info">
                          <span className="lb-user-name">{item.full_name}</span>
                          <span className="lb-user-tier">
                            <span className={`lb-tier-pill tier-${item.tier_code}`}>
                              {item.tier_name}
                            </span>
                            <span>• Hạng {item.rank}</span>
                          </span>
                        </div>
                      </div>

                      <div className="lb-points-badge">
                        <span className="lb-points-num">
                          {item.green_points.toLocaleString()}
                        </span>
                        <span className="lb-points-label">Điểm xanh</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: My Rank Card */}
              <div
                className={`lb-my-rank-card ${
                  individualData?.my_rank?.is_top_10 ? "golden-glow" : ""
                }`}
              >
                <div className="lb-my-rank-title">
                  <span>Hạng Của Bạn</span>
                  <span>🌱</span>
                </div>

                {individualData?.my_rank?.is_logged_in ? (
                  <div>
                    {individualData.my_rank.is_top_10 && (
                      <div className="lb-top10-congrats">
                        <span>🎉</span>
                        <span>{individualData.my_rank.message}</span>
                      </div>
                    )}

                    <div className="lb-rank-stat-grid">
                      <div className="lb-stat-box">
                        <div className="lb-stat-val">
                          #{individualData.my_rank.rank}
                        </div>
                        <div className="lb-stat-lbl">
                          trên {individualData.my_rank.total_citizens.toLocaleString()} công dân
                        </div>
                      </div>
                      <div className="lb-stat-box">
                        <div className="lb-stat-val">
                          {individualData.my_rank.green_points.toLocaleString()}
                        </div>
                        <div className="lb-stat-lbl">Điểm hiện tại</div>
                      </div>
                    </div>

                    <div className="lb-top100-progress">
                      <span>🎯</span>
                      <span>
                        {individualData.my_rank.rank <= 100
                          ? "Bạn đã lọt vào Top 100 công dân tiêu biểu!"
                          : `Cần thêm +${individualData.my_rank.points_to_top_100.toLocaleString()} điểm để lọt vào Top 100`}
                      </span>
                    </div>

                    <div style={{ textAlign: "center", marginTop: "1rem" }}>
                      <span className="lb-card-badge">
                        Cấp bậc hiện tại: {individualData.my_rank.tier_name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="lb-login-prompt">
                    <div className="lb-login-prompt-icon">🔒</div>
                    <p className="lb-login-prompt-text">
                      Đăng nhập để xem thứ hạng cá nhân của bạn
                    </p>
                    <button
                      className="lb-login-btn"
                      onClick={() => {
                        if (onNavigateLogin) {
                          onNavigateLogin();
                        } else {
                          window.location.hash = "login";
                        }
                      }}
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: GROUPS (MÀN 2) */}
      {activeTab === "GROUP" && (
        <>
          {errorGroup ? (
            <div className="lb-error-box">
              <p className="lb-error-msg">{errorGroup}</p>
              <button
                className="lb-retry-btn"
                onClick={() => fetchGroups(cycle)}
              >
                Thử lại
              </button>
            </div>
          ) : loadingGroup ? (
            <div className="lb-card">
              <div className="lb-card-header">
                <span className="lb-card-title">Đang tải bảng xếp hạng nhóm…</span>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="lb-skeleton-row">
                  <div className="lb-skeleton-avatar" />
                  <div className="lb-skeleton-lines">
                    <div className="lb-skeleton-line" style={{ width: "40%" }} />
                    <div className="lb-skeleton-line" style={{ width: "20%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="lb-card">
              <div className="lb-card-header">
                <div className="lb-card-title">
                  <span>👥</span>
                  <span>Bảng Xếp Hạng Nhóm Tình Nguyện ({cycleLabels[cycle]})</span>
                </div>
                <span className="lb-card-badge">
                  {groupData?.groups.length || 0} CLB hoạt động
                </span>
              </div>

              <div className="lb-list">
                {groupData?.groups.map((g) => (
                  <div
                    key={g.group_id}
                    className={`lb-group-item ${g.is_user_group ? "user-group" : ""}`}
                    onClick={() => setSelectedGroup(g)}
                  >
                    <div className="lb-item-left">
                      <div className="lb-rank-badge">
                        {g.rank === 1 ? "🥇" : g.rank === 2 ? "🥈" : g.rank === 3 ? "🥉" : `#${g.rank}`}
                      </div>
                      <div className="lb-avatar-fallback" style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}>
                        {g.name.charAt(0)}
                      </div>
                      <div className="lb-user-info">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span className="lb-user-name">{g.name}</span>
                          {g.is_user_group && (
                            <span className="lb-user-group-tag">Nhóm của bạn</span>
                          )}
                        </div>
                        <span className="lb-user-tier">
                          👥 {g.member_count} tình nguyện viên
                        </span>
                      </div>
                    </div>

                    <div className="lb-metric-pills">
                      <div className="lb-metric-pill">
                        <span className="val" style={{ color: "#0284c7" }}>
                          {g.points.toLocaleString()}
                        </span>
                        <span className="lbl">Tổng điểm</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 3: DISTRICTS (MÀN 3) */}
      {activeTab === "DISTRICT" && (
        <>
          {errorDistrict ? (
            <div className="lb-error-box">
              <p className="lb-error-msg">{errorDistrict}</p>
              <button
                className="lb-retry-btn"
                onClick={() => fetchDistricts(cycle)}
              >
                Thử lại
              </button>
            </div>
          ) : loadingDistrict ? (
            <div className="lb-spinner" />
          ) : (
            <div className="lb-card">
              <div className="lb-card-header">
                <div className="lb-card-title">
                  <span>📍</span>
                  <span>Bảng Xếp Hạng 22 Quận / Huyện TP.HCM ({cycleLabels[cycle]})</span>
                </div>
                <span className="lb-card-badge">Theo Chỉ số Xanh tổng hợp</span>
              </div>

              <div className="lb-list">
                {districtData?.districts.map((d: DistrictLeaderboardItem) => (
                  <div
                    key={d.district_code}
                    className={`lb-district-item ${
                      d.is_user_district ? "user-district" : ""
                    }`}
                    onClick={() => {
                      if (onNavigateHeatmap) {
                        onNavigateHeatmap(d.district_code);
                      } else {
                        window.location.hash = `heatmap`;
                      }
                    }}
                  >
                    <div className="lb-item-left">
                      <div className="lb-rank-badge">
                        {d.rank === 1 ? "🥇" : d.rank === 2 ? "🥈" : d.rank === 3 ? "🥉" : `#${d.rank}`}
                      </div>
                      <div className="lb-user-info">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span className="lb-user-name">{d.district_name}</span>
                          {d.is_user_district && (
                            <span className="lb-district-highlight-tag">
                              Quận của bạn
                            </span>
                          )}
                        </div>
                        <span className="lb-user-tier">
                          🧹 Tỷ lệ dọn sạch: {d.cleanup_rate}% • 🔧 Đã xử lý: {d.resolved_incidents} sự cố
                        </span>
                      </div>
                    </div>

                    <div className="lb-metric-pills">
                      <div className="lb-metric-pill">
                        <span className="val" style={{ color: "#059669", fontSize: "1.1rem" }}>
                          {d.green_index}
                        </span>
                        <span className="lbl">Chỉ số Xanh</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div className="lb-modal-overlay" onClick={() => setSelectedGroup(null)}>
          <div className="lb-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="lb-modal-close" onClick={() => setSelectedGroup(null)}>
              ✕
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div className="lb-avatar-fallback" style={{ width: "3.5rem", height: "3.5rem", fontSize: "1.5rem" }}>
                {selectedGroup.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                  {selectedGroup.name}
                </h3>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Hạng #{selectedGroup.rank} trên bảng vinh danh
                </span>
              </div>
            </div>

            <p style={{ color: "#475569", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              {selectedGroup.description || "Nhóm tình nguyện viên bảo vệ môi trường, phân loại rác và tổ chức ngày Chủ nhật xanh tại TP.HCM."}
            </p>

            <div className="lb-rank-stat-grid" style={{ marginBottom: "1.5rem" }}>
              <div className="lb-stat-box">
                <div className="lb-stat-val">{selectedGroup.member_count}</div>
                <div className="lb-stat-lbl">Thành viên tích cực</div>
              </div>
              <div className="lb-stat-box">
                <div className="lb-stat-val">{selectedGroup.points.toLocaleString()}</div>
                <div className="lb-stat-lbl">Tổng điểm cống hiến</div>
              </div>
            </div>

            <button
              className="lb-login-btn"
              onClick={() => setSelectedGroup(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default LeaderboardContainer;
