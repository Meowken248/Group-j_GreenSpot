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
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");

  // [CN 32 10/10] Chốt sổ thi đua & trao thưởng Top 3
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<import("./types").LeaderboardSnapshotResponse | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

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
  const fetchIndividual = useCallback(async (dist = selectedDistrict, c = cycle) => {
    setLoadingIndividual(true);
    setErrorIndividual(null);
    try {
      const data = await leaderboardApi.getIndividualLeaderboard({
        district: dist !== "ALL" ? dist : undefined,
        cycle: c,
      });
      setIndividualData(data);
    } catch {
      setErrorIndividual("Không thể tải bảng xếp hạng. Vui lòng thử lại");
    } finally {
      setLoadingIndividual(false);
    }
  }, [selectedDistrict, cycle]);

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
    fetchIndividual(selectedDistrict, cycle);
  }, [fetchIndividual, selectedDistrict, cycle]);

  // Tab switch effect
  const handleTabChange = (tab: LeaderboardTab) => {
    setActiveTab(tab);
    if (tab === "INDIVIDUAL") {
      fetchIndividual(selectedDistrict, cycle);
    } else if (tab === "GROUP") {
      fetchGroups(cycle);
    } else if (tab === "DISTRICT") {
      fetchDistricts(cycle);
    }
  };

  // Cycle switch effect
  const handleCycleChange = (newCycle: CycleFilter) => {
    setCycle(newCycle);
    if (activeTab === "INDIVIDUAL") {
      fetchIndividual(selectedDistrict, newCycle);
    } else if (activeTab === "GROUP") {
      fetchGroups(newCycle);
    } else if (activeTab === "DISTRICT") {
      fetchDistricts(newCycle);
    }
  };

  // [CN 32] Admin Snapshot & Thưởng Top 3
  const handleTakeSnapshot = async () => {
    setIsTakingSnapshot(true);
    setSnapshotError(null);
    setSnapshotResult(null);
    try {
      const res = await leaderboardApi.takeAdminSnapshot(cycle);
      setSnapshotResult(res);
      setSnapshotModalOpen(true);
      if (activeTab === "INDIVIDUAL") fetchIndividual(selectedDistrict, cycle);
      else if (activeTab === "GROUP") fetchGroups(cycle);
      else if (activeTab === "DISTRICT") fetchDistricts(cycle);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Không thể chốt sổ. Yêu cầu quyền Quản trị viên (Admin).";
      setSnapshotError(detail);
      setSnapshotModalOpen(true);
    } finally {
      setIsTakingSnapshot(false);
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
      <div className="lb-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div className="lb-header-title">
            <span>🏆</span>
            <span>Bảng Vinh Danh Công Dân Xanh</span>
          </div>
          <p className="lb-header-subtitle">
            Tôn vinh các cá nhân, tập thể và địa phương tiên phong vì môi trường bền vững. Tích lũy Điểm Xanh qua từng hành động bảo vệ TP.HCM!
          </p>
        </div>

        <button
          type="button"
          onClick={handleTakeSnapshot}
          disabled={isTakingSnapshot}
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#ffffff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.9rem",
          }}
        >
          {isTakingSnapshot ? "⏳ Đang Chốt Sổ…" : "👑 Chốt Mùa Giải & Trao Thưởng Top 3"}
        </button>
      </div>

      {/* Tabs, District Filter and Cycle Filter bar */}
      <div className="lb-tabs-container" style={{ flexWrap: "wrap", gap: "10px" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginLeft: "auto" }}>
          {/* Bộ lọc Quận huyện cho tab Cá nhân */}
          {activeTab === "INDIVIDUAL" && (
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                fetchIndividual(e.target.value, cycle);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#1e293b",
                cursor: "pointer",
              }}
            >
              <option value="ALL">🌐 Toàn TP. Hồ Chí Minh</option>
              <option value="QUAN_1">Quận 1</option>
              <option value="QUAN_3">Quận 3</option>
              <option value="QUAN_4">Quận 4</option>
              <option value="QUAN_5">Quận 5</option>
              <option value="QUAN_6">Quận 6</option>
              <option value="QUAN_7">Quận 7</option>
              <option value="QUAN_8">Quận 8</option>
              <option value="QUAN_10">Quận 10</option>
              <option value="QUAN_11">Quận 11</option>
              <option value="QUAN_12">Quận 12</option>
              <option value="BINH_THANH">Bình Thạnh</option>
              <option value="THU_DUC">TP. Thủ Đức</option>
              <option value="GO_VAP">Gò Vấp</option>
              <option value="PHU_NHUAN">Phú Nhuận</option>
              <option value="TAN_BINH">Tân Bình</option>
              <option value="TAN_PHU">Tân Phú</option>
              <option value="BINH_TAN">Bình Tân</option>
              <option value="NHA_BE">Nhà Bè</option>
              <option value="HOC_MON">Hóc Môn</option>
              <option value="BINH_CHANH">Bình Chánh</option>
              <option value="CU_CHI">Củ Chi</option>
              <option value="CAN_GIO">Cần Giờ</option>
            </select>
          )}

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
        </div>
      </div>

      {/* TAB 1: INDIVIDUAL (MÀN 1) */}
      {activeTab === "INDIVIDUAL" && (
        <>
          {errorIndividual ? (
            <div className="lb-error-box">
              <p className="lb-error-msg">{errorIndividual}</p>
              <button className="lb-retry-btn" onClick={() => fetchIndividual()}>
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

      {/* [CN 32 10/10] Popup Vinh danh & Trao thưởng Top 3 Mùa Giải */}
      {snapshotModalOpen && (
        <div className="lb-modal-overlay" onClick={() => setSnapshotModalOpen(false)}>
          <div className="lb-modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <button className="lb-modal-close" onClick={() => setSnapshotModalOpen(false)}>
              ✕
            </button>

            {snapshotError ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>⚠️</div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ef4444", margin: "0 0 8px" }}>
                  Chưa Thể Chốt Sổ Thi Đua
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{snapshotError}</p>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Mẹo demo: Bạn có thể chọn menu Avatar góc trên để đăng nhập tài khoản Quản trị viên (Admin) hoặc thực hiện chốt sổ trên hệ thống.
                </p>
                <button
                  className="lb-login-btn"
                  style={{ marginTop: "16px" }}
                  onClick={() => setSnapshotModalOpen(false)}
                >
                  Đã hiểu
                </button>
              </div>
            ) : snapshotResult ? (
              <div>
                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "4px" }}>🎉👑</div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#d97706", margin: "0 0 6px" }}>
                    VINH DANH TOP 3 CÔNG DÂN XANH
                  </h3>
                  <span style={{ fontSize: "0.8rem", background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: "12px", fontWeight: 600 }}>
                    Kỳ: {cycleLabels[snapshotResult.cycle as CycleFilter] || snapshotResult.cycle} • {snapshotResult.snapshot_date}
                  </span>
                </div>

                <p style={{ fontSize: "0.85rem", color: "#475569", textAlign: "center", marginBottom: "16px" }}>
                  Hệ thống đã tự động cộng Điểm Xanh vinh danh và ghi nhận chứng từ vào Sổ cái Biến động điểm!
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                  {snapshotResult.winners.map((w) => (
                    <div
                      key={w.rank}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        background: w.rank === 1 ? "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)" : w.rank === 2 ? "#f1f5f9" : "#ffedd5",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "1.6rem" }}>
                          {w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : "🥉"}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                            {w.full_name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{w.title}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 800, color: "#16a34a", fontSize: "1.05rem" }}>
                          +{w.points_rewarded} đ
                        </span>
                        <div style={{ fontSize: "0.7rem", color: "#15803d" }}>Thưởng vinh danh</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem", color: "#64748b", marginBottom: "16px" }}>
                  🛡️ <strong>Chứng từ kiểm toán:</strong> Đã băm chuỗi SHA-256 Merkle và lưu tại <code>AuditLog</code> (#audit-logs).
                </div>

                <button
                  className="lb-login-btn"
                  onClick={() => setSnapshotModalOpen(false)}
                >
                  Xác nhận đóng
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
export default LeaderboardContainer;
