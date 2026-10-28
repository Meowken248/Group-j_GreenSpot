import React, { useState, useEffect } from "react";
import type {
  AlertCreateInput,
  AlertSeverity,
  AlertStatus,
  AlertTemplate,
  EnvironmentalAlert,
} from "./types";
import { alertApi } from "./services/alertApi";
import { ThresholdConfigTab } from "./components/ThresholdConfigTab";
import { SOSDispatchTab } from "./components/SOSDispatchTab";
import { AlertLiveMap } from "./components/AlertLiveMap";
import { AlertAreaSubscriptionModal } from "./components/AlertAreaSubscriptionModal";

export const AlertManagementContainer: React.FC = () => {
  const [alerts, setAlerts] = useState<EnvironmentalAlert[]>([]);
  const [activeTab, setActiveTab] = useState<AlertStatus | "ALL">("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    active: 0,
    draft: 0,
    resolved: 0,
    revoked: 0,
  });

  // Modal tạo / soạn thảo
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<AlertTemplate[]>([]);
  const [createForm, setCreateForm] = useState<AlertCreateInput>({
    title: "",
    category: "AIR",
    severity_level: "YELLOW",
    affected_districts: ["Quận 1"],
    description: "",
    safety_advice: "",
    template_code: "",
    publish_now: true,
  });

  // Modal đính chính / update
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<EnvironmentalAlert | null>(null);
  const [amendmentNote, setAmendmentNote] = useState("");

  // Modal công bố an toàn / resolve
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvedNote, setResolvedNote] = useState("");
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");

  // Điều hướng phân hệ Bùi Nguyễn Minh Quân: CN 28, CN 31, CN 34, CN 35, CN 32
  const [mainTab, setMainTab] = useState<"ALERTS" | "THRESHOLDS" | "SOS" | "MAP">(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === "#thresholds") return "THRESHOLDS";
    if (hash === "#sos") return "SOS";
    if (hash === "#alert-map") return "MAP";
    return "ALERTS";
  });
  const [subModalOpen, setSubModalOpen] = useState(() => {
    const hash = window.location.hash.toLowerCase();
    return hash === "#alert-subscription" || hash === "#subscription";
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#thresholds") setMainTab("THRESHOLDS");
      else if (hash === "#sos") setMainTab("SOS");
      else if (hash === "#alert-map") setMainTab("MAP");
      else if (hash === "#alerts" || hash === "#warning") setMainTab("ALERTS");
      
      if (hash === "#alert-subscription" || hash === "#subscription") {
        setSubModalOpen(true);
      }
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await alertApi.listAlerts({
        status_filter: activeTab,
        severity_filter: severityFilter,
        q: searchQuery,
        limit: 20,
      });
      setAlerts(res.items);
      setStats({
        active: res.active_count,
        draft: res.draft_count,
        resolved: res.resolved_count,
        revoked: res.revoked_count,
      });
    } catch (e) {
      console.error("Lỗi tải bản tin:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [activeTab, severityFilter]);

  useEffect(() => {
    // Tải templates chuẩn hóa
    alertApi.getTemplates().then(setTemplates).catch(console.error);
  }, []);

  const handleApplyTemplate = (tmpl: AlertTemplate) => {
    setCreateForm((prev) => ({
      ...prev,
      title: tmpl.title,
      category: tmpl.category,
      severity_level: tmpl.severity_level,
      description: tmpl.default_description,
      safety_advice: tmpl.default_safety_advice,
      template_code: tmpl.code,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || createForm.title.trim().length < 10) {
      alert("WARN_001: Tiêu đề bản tin cảnh báo phải có độ dài từ 10 ký tự trở lên.");
      return;
    }
    if (!["YELLOW", "ORANGE", "RED"].includes(createForm.severity_level)) {
      alert("WARN_002: Vui lòng chọn mức độ cảnh báo phù hợp (Vàng, Cam, Đỏ).");
      return;
    }
    if (createForm.publish_now && (!createForm.affected_districts || createForm.affected_districts.length === 0)) {
      alert("WARN_003: Vui lòng chọn ít nhất một Phường/Xã chịu ảnh hưởng khi phát hành bản tin.");
      return;
    }
    if (!createForm.safety_advice || createForm.safety_advice.trim().length < 10) {
      alert("WARN_004: Nội dung khuyến cáo an toàn cho người dân không được để trống (tối thiểu 10 ký tự).");
      return;
    }

    // Luồng ngoại lệ SRS: Bản tin mức Đỏ (Khẩn cấp nguy hại) yêu cầu xác nhận 2 bước
    if (createForm.severity_level === "RED" && createForm.publish_now) {
      const confirmRed = confirm(
        "⚠️ CẢNH BÁO BẬC 3 (ĐỎ - NGUY HIỂM TỐI ĐA):\nBạn đang chuẩn bị phát hành bản tin khẩn cấp diện rộng tới toàn bộ cư dân. Hành động này sẽ được ghi vết bất biến vào Audit Log.\n\nBấm OK để xác nhận phát hành ngay lập tức."
      );
      if (!confirmRed) return;
    }

    try {
      await alertApi.createAlert(createForm);
      setCreateModalOpen(false);
      loadAlerts();
      alert("Đã lưu và phát hành bản tin cảnh báo thành công!");
    } catch (err: any) {
      alert("Lỗi: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePublish = async (alertId: string) => {
    if (!confirm("Xác nhận phát hành bản tin cảnh báo này ra toàn bộ cổng thông tin?")) return;
    try {
      await alertApi.publishAlert(alertId);
      loadAlerts();
      alert("Đã phát hành cảnh báo thành công!");
    } catch (err: any) {
      alert("Lỗi: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleResolveSubmit = async () => {
    if (!selectedAlert || resolvedNote.length < 5) {
      alert("Vui lòng nhập thông điệp công bố an toàn tối thiểu 5 ký tự.");
      return;
    }
    try {
      await alertApi.resolveAlert(selectedAlert.alert_id, resolvedNote);
      setResolveModalOpen(false);
      setResolvedNote("");
      loadAlerts();
      alert("Đã công bố an toàn và hạ cảnh báo thành công!");
    } catch (err: any) {
      alert("Lỗi: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleRevokeSubmit = async () => {
    if (!selectedAlert || revokeReason.length < 5) {
      alert("Vui lòng nhập lý do thu hồi tối thiểu 5 ký tự.");
      return;
    }
    try {
      await alertApi.revokeAlert(selectedAlert.alert_id, revokeReason);
      setRevokeModalOpen(false);
      setRevokeReason("");
      loadAlerts();
      alert("Đã thu hồi bản tin cảnh báo thành công!");
    } catch (err: any) {
      alert("Lỗi: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedAlert) return;
    try {
      await alertApi.updateAlert(selectedAlert.alert_id, {
        amendment_note: amendmentNote,
      });
      setEditModalOpen(false);
      setAmendmentNote("");
      loadAlerts();
      alert("Đã đính chính bản tin thành công!");
    } catch (err: any) {
      alert("Lỗi: " + (err.response?.data?.detail || err.message));
    }
  };

  const getSeverityBadge = (level: AlertSeverity) => {
    const config = {
      YELLOW: { bg: "#FEF3C7", text: "#D97706", label: "Cấp 1 - Vàng (Chú ý)" },
      ORANGE: { bg: "#FFEDD5", text: "#EA580C", label: "Cấp 2 - Cam (Nguy cơ)" },
      RED: { bg: "#FEE2E2", text: "#DC2626", label: "Cấp 3 - Đỏ (Khẩn cấp)" },
    };
    const c = config[level] || config.YELLOW;
    return (
      <span
        style={{
          background: c.bg,
          color: c.text,
          padding: "3px 8px",
          borderRadius: "6px",
          fontWeight: 700,
          fontSize: "12px",
        }}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px", color: "#F8FAFC" }}>
      {/* CỤM ĐIỀU HƯỚNG 3 PHÂN HỆ CỦA BÙI NGUYỄN MINH QUÂN */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid #334155", paddingBottom: "14px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            setMainTab("ALERTS");
            window.location.hash = "#alerts";
          }}
          style={{
            background: mainTab === "ALERTS" ? "#0284C7" : "#1E293B",
            color: "#FFF",
            border: `1px solid ${mainTab === "ALERTS" ? "#38BDF8" : "#334155"}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: mainTab === "ALERTS" ? "0 4px 12px rgba(2, 132, 199, 0.4)" : "none",
          }}
        >
          <span>📢</span> Bản Tin Cảnh Báo Ô Nhiễm (CN 28)
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("THRESHOLDS");
            window.location.hash = "#thresholds";
          }}
          style={{
            background: mainTab === "THRESHOLDS" ? "#0284C7" : "#1E293B",
            color: "#FFF",
            border: `1px solid ${mainTab === "THRESHOLDS" ? "#38BDF8" : "#334155"}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: mainTab === "THRESHOLDS" ? "0 4px 12px rgba(2, 132, 199, 0.4)" : "none",
          }}
        >
          <span>⚙️</span> Quản Trị Ngưỡng & Bán Kính Cảnh Báo (CN 34)
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("SOS");
            window.location.hash = "#sos";
          }}
          style={{
            background: mainTab === "SOS" ? "#DC2626" : "#1E293B",
            color: "#FFF",
            border: `1px solid ${mainTab === "SOS" ? "#EF4444" : "#334155"}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: mainTab === "SOS" ? "0 4px 12px rgba(220, 38, 38, 0.4)" : "none",
          }}
        >
          <span>🚨</span> Phát Lệnh Khẩn Cấp SOS (CN 35)
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("MAP");
            window.location.hash = "#alert-map";
          }}
          style={{
            background: mainTab === "MAP" ? "#0D9488" : "#1E293B",
            color: "#FFF",
            border: `1px solid ${mainTab === "MAP" ? "#14B8A6" : "#334155"}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: mainTab === "MAP" ? "0 4px 12px rgba(13, 148, 136, 0.4)" : "none",
          }}
        >
          <span>🗺️</span> Bản Đồ Cảnh Báo Trực Quan (CN 31)
        </button>

        <button
          type="button"
          onClick={() => {
            setSubModalOpen(true);
            window.location.hash = "#alert-subscription";
          }}
          style={{
            background: "#1E293B",
            color: "#38BDF8",
            border: "1px solid #0284C7",
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginLeft: "auto",
          }}
          title="Đăng ký nhận tin cảnh báo cá nhân hóa theo địa bàn cư trú (CN 32)"
        >
          <span>🔔</span> Đăng Ký Khu Vực Nhận Tin (CN 32)
        </button>
      </div>

      {mainTab === "MAP" ? (
        <AlertLiveMap />
      ) : mainTab === "THRESHOLDS" ? (
        <ThresholdConfigTab />
      ) : mainTab === "SOS" ? (
        <SOSDispatchTab />
      ) : (
        <>
          {/* Header & Title */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, color: "#38BDF8" }}>
            📢 Trung Tâm Biên Tập & Quản Lý Bản Tin Cảnh Báo Ô Nhiễm (CN 28)
          </h1>
          <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
            Phân hệ Quản trị Môi trường: Quản lý toàn bộ vòng đời bản tin khẩn cấp (Soạn thảo, Phát hành, Đính chính, Hạ cảnh báo an toàn & Thu hồi)
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          style={{
            background: "#DC2626",
            color: "#FFF",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
          }}
        >
          <span>✍️</span> Soạn Bản Tin Cảnh Báo Mới
        </button>
      </div>

      {/* Thẻ Thống kê 4 trạng thái vòng đời */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          onClick={() => setActiveTab("ACTIVE")}
          style={{
            background: activeTab === "ACTIVE" ? "#1E293B" : "#0F172A",
            border: `2px solid ${activeTab === "ACTIVE" ? "#EF4444" : "#334155"}`,
            borderRadius: "12px",
            padding: "16px",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>🔴 Đang Hiệu Lực (Active)</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#EF4444", marginTop: "4px" }}>
            {stats.active}
          </div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Đang phát thanh ngoài Cổng công dân</div>
        </div>

        <div
          onClick={() => setActiveTab("DRAFT")}
          style={{
            background: activeTab === "DRAFT" ? "#1E293B" : "#0F172A",
            border: `2px solid ${activeTab === "DRAFT" ? "#F59E0B" : "#334155"}`,
            borderRadius: "12px",
            padding: "16px",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>📝 Bản Nháp (Drafts)</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#F59E0B", marginTop: "4px" }}>
            {stats.draft}
          </div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Đang chờ thẩm định số liệu quan trắc</div>
        </div>

        <div
          onClick={() => setActiveTab("RESOLVED")}
          style={{
            background: activeTab === "RESOLVED" ? "#1E293B" : "#0F172A",
            border: `2px solid ${activeTab === "RESOLVED" ? "#10B981" : "#334155"}`,
            borderRadius: "12px",
            padding: "16px",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>🟢 Đã Công Bố An Toàn (Resolved)</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>
            {stats.resolved}
          </div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Hiện trường đã sạch, hạ cảnh báo</div>
        </div>

        <div
          onClick={() => setActiveTab("REVOKED")}
          style={{
            background: activeTab === "REVOKED" ? "#1E293B" : "#0F172A",
            border: `2px solid ${activeTab === "REVOKED" ? "#64748B" : "#334155"}`,
            borderRadius: "12px",
            padding: "16px",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>⚪ Đã Thu Hồi (Revoked)</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#94A3B8", marginTop: "4px" }}>
            {stats.revoked}
          </div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Bản tin bị thu hồi do nhầm lẫn</div>
        </div>
      </div>

      {/* Thanh lọc & tìm kiếm */}
      <div
        style={{
          background: "#1E293B",
          padding: "16px 20px",
          borderRadius: "12px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "20px",
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#94A3B8" }}>Mức độ:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              background: "#0F172A",
              border: "1px solid #334155",
              color: "#F8FAFC",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "13px",
            }}
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="RED">Cấp 3 - Đỏ (Khẩn cấp)</option>
            <option value="ORANGE">Cấp 2 - Cam (Nguy cơ)</option>
            <option value="YELLOW">Cấp 1 - Vàng (Chú ý)</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: "220px", display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Tìm theo mã bản tin (ALT-...), tiêu đề hoặc địa bàn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadAlerts()}
            style={{
              flex: 1,
              background: "#0F172A",
              border: "1px solid #334155",
              color: "#F8FAFC",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "13px",
            }}
          />
          <button
            onClick={loadAlerts}
            style={{
              background: "#0284C7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Danh sách bản tin */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>
            Đang tải dữ liệu bản tin cảnh báo...
          </div>
        ) : alerts.length === 0 ? (
          <div
            style={{
              padding: "60px",
              textAlign: "center",
              background: "#1E293B",
              borderRadius: "12px",
              border: "1px dashed #334155",
              color: "#94A3B8",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📯</div>
            <div style={{ fontSize: "15px" }}>Không có bản tin nào thuộc trạng thái này.</div>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.alert_id}
              style={{
                background: "#1E293B",
                border: "1px solid #334155",
                borderRadius: "14px",
                padding: "20px 24px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span
                      style={{
                        background: "#0F172A",
                        border: "1px solid #475569",
                        color: "#38BDF8",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      {alert.alert_code}
                    </span>
                    {getSeverityBadge(alert.severity_level)}
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                      Khu vực: {alert.affected_districts.join(", ") || "Toàn thành phố"}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#F8FAFC" }}>
                    {alert.title}
                  </h3>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {alert.status === "DRAFT" && (
                    <button
                      onClick={() => handlePublish(alert.alert_id)}
                      style={{
                        background: "#DC2626",
                        color: "#FFF",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 14px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🚀 Phát Hành Ngay
                    </button>
                  )}

                  {alert.status === "ACTIVE" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setEditModalOpen(true);
                        }}
                        style={{
                          background: "#0284C7",
                          color: "#FFF",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Đính Chính
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setResolveModalOpen(true);
                        }}
                        style={{
                          background: "#059669",
                          color: "#FFF",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🟢 Công Bố An Toàn (Hạ Cảnh Báo)
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setRevokeModalOpen(true);
                        }}
                        style={{
                          background: "transparent",
                          color: "#EF4444",
                          border: "1px solid #EF4444",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ⚠️ Thu Hồi Tin
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Nội dung chi tiết */}
              <div style={{ fontSize: "14px", color: "#CBD5E1", lineHeight: 1.6, marginBottom: "14px", whiteSpace: "pre-line" }}>
                {alert.description}
              </div>

              {/* Khung khuyến cáo an toàn */}
              <div
                style={{
                  background: "rgba(220, 38, 38, 0.08)",
                  borderLeft: "4px solid #DC2626",
                  padding: "10px 14px",
                  borderRadius: "0 8px 8px 0",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#EF4444", marginBottom: "2px" }}>
                  🛡️ KHUYẾN CÁO PHÒNG HỘ AN TOÀN CHO NHÂN DÂN:
                </div>
                <div style={{ fontSize: "13px", color: "#FCA5A5" }}>{alert.safety_advice}</div>
              </div>

              {/* Thông tin hạ cảnh báo nếu có */}
              {alert.resolved_note && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    borderLeft: "4px solid #10B981",
                    padding: "10px 14px",
                    borderRadius: "0 8px 8px 0",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#10B981", marginBottom: "2px" }}>
                    ✅ THÔNG ĐIỆP AN TOÀN ĐÃ CÔNG BỐ ({alert.resolved_at ? new Date(alert.resolved_at).toLocaleString("vi-VN") : ""}):
                  </div>
                  <div style={{ fontSize: "13px", color: "#6EE7B7" }}>{alert.resolved_note}</div>
                </div>
              )}

              {/* Lý do thu hồi nếu có */}
              {alert.revoke_reason && (
                <div
                  style={{
                    background: "rgba(148, 163, 184, 0.1)",
                    borderLeft: "4px solid #64748B",
                    padding: "10px 14px",
                    borderRadius: "0 8px 8px 0",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#94A3B8" }}>
                    🚫 LÝ DO THU HỒI: {alert.revoke_reason}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
        </>
      )}

      {/* MODAL 1: SOẠN BẢN TIN CẢNH BÁO MỚI */}
      {createModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "16px",
              overflow: "hidden",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px 24px",
                background: "#0F172A",
                borderBottom: "1px solid #334155",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px", color: "#38BDF8" }}>
                ✍️ Soạn Thảo Bản Tin Cảnh Báo Khẩn Cấp Mới
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Mẫu có sẵn */}
              <div>
                <label style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>
                  CHỌN MẪU BẢN TIN CHUẨN HÓA (SOẠN NHANH TRONG 30 GIÂY):
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.code}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      style={{
                        background: createForm.template_code === tmpl.code ? "#0284C7" : "#0F172A",
                        border: "1px solid #334155",
                        color: "#E2E8F0",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {tmpl.category === "AIR" ? "💨 Bụi PM2.5" : tmpl.category === "HAZARDOUS" ? "🔥 Cháy bãi rác" : tmpl.category === "WATER" ? "💧 Nước bẩn" : "🗑️ Mùi hôi"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tiêu đề */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Tiêu đề bản tin *</label>
                <input
                  id="ALT_TXT_TITLE"
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ví dụ: Cảnh báo nồng độ bụi mịn PM2.5 tăng cao khu vực TP Thủ Đức"
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid #334155",
                    color: "#FFF",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginTop: "4px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Mức độ & Phân loại */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600 }}>Mức độ cảnh báo *</label>
                  <select
                    id="ALT_RDO_SEVERITY"
                    value={createForm.severity_level}
                    onChange={(e) => setCreateForm({ ...createForm, severity_level: e.target.value as AlertSeverity })}
                    style={{
                      width: "100%",
                      background: "#0F172A",
                      border: "1px solid #334155",
                      color: "#FFF",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      marginTop: "4px",
                    }}
                  >
                    <option value="YELLOW">Cấp 1 - Vàng (Chú ý)</option>
                    <option value="ORANGE">Cấp 2 - Cam (Nguy cơ cao)</option>
                    <option value="RED">Cấp 3 - Đỏ (Khẩn cấp nguy hại)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600 }}>Phân loại ô nhiễm *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    style={{
                      width: "100%",
                      background: "#0F172A",
                      border: "1px solid #334155",
                      color: "#FFF",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      marginTop: "4px",
                    }}
                  >
                    <option value="AIR">Không khí / Bụi khói</option>
                    <option value="WATER">Nguồn nước</option>
                    <option value="WASTE">Chất thải rắn sinh hoạt</option>
                    <option value="HAZARDOUS">Khí độc / Hóa chất nguy hại</option>
                  </select>
                </div>
              </div>

              {/* Địa bàn chịu ảnh hưởng */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Địa bàn chịu tác động (cách nhau bởi dấu phẩy)</label>
                <input
                  id="ALT_SEL_DISTRICT"
                  type="text"
                  value={createForm.affected_districts.join(", ")}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      affected_districts: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Quận 1, Quận Bình Thạnh, TP Thủ Đức"
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid #334155",
                    color: "#FFF",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginTop: "4px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Mô tả hiện trạng */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Mô tả hiện trạng & nguyên nhân *</label>
                <textarea
                  id="ALT_TXT_CONTENT"
                  required
                  rows={4}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Mô tả số liệu quan trắc, thời gian phát hiện và khu vực tỏa khói/mùi..."
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid #334155",
                    color: "#FFF",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginTop: "4px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Khuyến cáo an toàn */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600 }}>Khuyến cáo y tế / phòng hộ cho người dân *</label>
                <textarea
                  id="ALT_TXT_SAFETY_ADVICE"
                  required
                  rows={3}
                  value={createForm.safety_advice}
                  onChange={(e) => setCreateForm({ ...createForm, safety_advice: e.target.value })}
                  placeholder="Người dân nên đeo khẩu trang, đóng cửa nhà, không sử dụng nước..."
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid #334155",
                    color: "#FFF",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginTop: "4px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Tùy chọn lưu nháp hoặc phát hành */}
              <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    name="publish_opt"
                    checked={createForm.publish_now}
                    onChange={() => setCreateForm({ ...createForm, publish_now: true })}
                  />
                  <span style={{ fontWeight: 600, color: "#EF4444" }}>🚀 Phát hành ngay lập tức</span>
                </label>

                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    name="publish_opt"
                    checked={!createForm.publish_now}
                    onChange={() => setCreateForm({ ...createForm, publish_now: false })}
                  />
                  <span style={{ fontWeight: 600, color: "#F59E0B" }}>📝 Lưu bản nháp (Draft)</span>
                </label>
              </div>

              {/* Nút submit */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    background: "#334155",
                    border: "none",
                    color: "#FFF",
                    borderRadius: "6px",
                    padding: "10px 18px",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  id="ALT_BTN_PUBLISH"
                  type="submit"
                  style={{
                    background: createForm.publish_now ? "#DC2626" : "#F59E0B",
                    border: "none",
                    color: "#FFF",
                    borderRadius: "6px",
                    padding: "10px 24px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {createForm.publish_now ? "Phát Hành Bản Tin" : "Lưu Bản Nháp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ĐÍNH CHÍNH BẢN TIN */}
      {editModalOpen && selectedAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "20px" }}>
          <div style={{ width: "100%", maxWidth: "560px", background: "#1E293B", borderRadius: "12px", padding: "24px", border: "1px solid #334155" }}>
            <h3 style={{ margin: "0 0 12px", color: "#38BDF8" }}>✏️ Đính Chính Bản Tin [{selectedAlert.alert_code}]</h3>
            <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 16px" }}>
              Nội dung bổ sung sẽ được hiển thị ngay bên dưới bản tin với dấu thời gian đính chính minh bạch.
            </p>
            <textarea
              rows={4}
              placeholder="Nhập nội dung đính chính số liệu hoặc diễn biến mới..."
              value={amendmentNote}
              onChange={(e) => setAmendmentNote(e.target.value)}
              style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", color: "#FFF", borderRadius: "6px", padding: "10px", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setEditModalOpen(false)} style={{ background: "#334155", border: "none", color: "#FFF", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hủy</button>
              <button onClick={handleEditSubmit} style={{ background: "#0284C7", border: "none", color: "#FFF", padding: "8px 20px", fontWeight: 700, borderRadius: "6px", cursor: "pointer" }}>Lưu Đính Chính</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CÔNG BỐ AN TOÀN / HẠ CẢNH BÁO */}
      {resolveModalOpen && selectedAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "20px" }}>
          <div style={{ width: "100%", maxWidth: "560px", background: "#1E293B", borderRadius: "12px", padding: "24px", border: "1px solid #334155" }}>
            <h3 style={{ margin: "0 0 12px", color: "#10B981" }}>🟢 Công Bố An Toàn & Hạ Cảnh Báo [{selectedAlert.alert_code}]</h3>
            <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 16px" }}>
              Bản tin sẽ chuyển sang trạng thái <strong>ĐÃ KẾT THÚC / AN TOÀN</strong> và hệ thống tự động đẩy thông báo hạ cảnh báo (All-clear) cho người dân.
            </p>
            <textarea
              rows={3}
              placeholder="Ví dụ: Đã thu gom 100% rác thải, nồng độ khí thải trở về ngưỡng quy chuẩn an toàn..."
              value={resolvedNote}
              onChange={(e) => setResolvedNote(e.target.value)}
              style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", color: "#FFF", borderRadius: "6px", padding: "10px", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setResolveModalOpen(false)} style={{ background: "#334155", border: "none", color: "#FFF", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hủy</button>
              <button onClick={handleResolveSubmit} style={{ background: "#059669", border: "none", color: "#FFF", padding: "8px 20px", fontWeight: 700, borderRadius: "6px", cursor: "pointer" }}>Xác Nhận Công Bố An Toàn</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: THU HỒI CẢNH BÁO */}
      {revokeModalOpen && selectedAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "20px" }}>
          <div style={{ width: "100%", maxWidth: "560px", background: "#1E293B", borderRadius: "12px", padding: "24px", border: "1px solid #334155" }}>
            <h3 style={{ margin: "0 0 12px", color: "#EF4444" }}>⚠️ Thu Hồi Bản Tin Cảnh Báo [{selectedAlert.alert_code}]</h3>
            <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 16px" }}>
              Bản tin sẽ bị ẩn khỏi cổng thông tin công cộng. Hành động này sẽ được ghi vết bất biến vào Audit Log.
            </p>
            <textarea
              rows={3}
              placeholder="Nhập lý do thu hồi (VD: Bản tin diễn tập kỹ thuật gửi nhầm, số liệu hiệu chuẩn lại...)"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", color: "#FFF", borderRadius: "6px", padding: "10px", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setRevokeModalOpen(false)} style={{ background: "#334155", border: "none", color: "#FFF", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hủy</button>
              <button onClick={handleRevokeSubmit} style={{ background: "#DC2626", border: "none", color: "#FFF", padding: "8px 20px", fontWeight: 700, borderRadius: "6px", cursor: "pointer" }}>Xác Nhận Thu Hồi</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 5: ĐĂNG KÝ NHẬN TIN CẢNH BÁO CÁ NHÂN HÓA (CHỨC NĂNG 32) */}
      <AlertAreaSubscriptionModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
      />
    </div>
  );
};

