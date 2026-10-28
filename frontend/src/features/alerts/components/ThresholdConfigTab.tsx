import React, { useState, useEffect } from "react";
import { alertApi } from "../services/alertApi";
import type { ThresholdRuleItem } from "../types";

export const ThresholdConfigTab: React.FC = () => {
  const [rules, setRules] = useState<ThresholdRuleItem[]>([]);
  const [hotline, setHotline] = useState("1800-1090");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("RED");
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await alertApi.getThresholdConfigs();
      setRules(res.rules || []);
      setHotline(res.hotline_number || "1800-1090");
    } catch (e: any) {
      setAlertMsg({ text: "Lỗi tải quy chuẩn: " + (e.response?.data?.detail || e.message), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleRadiusChange = (severity: string, val: number) => {
    setRules((prev) =>
      prev.map((r) => (r.severity_level === severity ? { ...r, radius_km: val } : r))
    );
  };

  const handleAdviceChange = (severity: string, val: string) => {
    setRules((prev) =>
      prev.map((r) => (r.severity_level === severity ? { ...r, default_safety_advice: val } : r))
    );
  };

  const handleSave = async () => {
    setAlertMsg(null);
    for (const r of rules) {
      if (r.radius_km < 0.5) {
        setAlertMsg({ text: `RULE_001: Bán kính cảnh báo mức ${r.severity_name} không thể nhỏ hơn 0.5 km.`, type: "error" });
        return;
      }
      if (r.radius_km > 10.0) {
        setAlertMsg({ text: `RULE_002: Bán kính cảnh báo mức ${r.severity_name} tối đa cho một sự cố đô thị là 10.0 km.`, type: "error" });
        return;
      }
      if (!r.default_safety_advice || r.default_safety_advice.trim().length < 5) {
        setAlertMsg({ text: `RULE_003: Mẫu thông điệp khuyến cáo y tế mức ${r.severity_name} không được để trống.`, type: "error" });
        return;
      }
    }

    try {
      setSaving(true);
      await alertApi.updateThresholdConfigs({
        rules,
        hotline_number: hotline,
      });
      setAlertMsg({ text: "Đã cập nhật quy chuẩn ngưỡng cảnh báo và bán kính phát tin vào CSDL thành công!", type: "success" });
    } catch (e: any) {
      setAlertMsg({ text: "Lỗi: " + (e.response?.data?.detail || e.message), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Bạn có chắc chắn muốn khôi phục toàn bộ ngưỡng cảnh báo về chuẩn định mức của Bộ TN&MT?")) return;
    try {
      setLoading(true);
      const res = await alertApi.resetThresholdConfigs();
      setRules(res.rules || []);
      setHotline(res.hotline_number || "1800-1090");
      setAlertMsg({ text: "Đã khôi phục các tham số chuẩn theo quy định Bộ Tài nguyên & Môi trường!", type: "success" });
    } catch (e: any) {
      setAlertMsg({ text: "Lỗi: " + (e.response?.data?.detail || e.message), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const activeRule = rules.find((r) => r.severity_level === selectedSeverity) || rules[0];

  return (
    <div style={{ background: "#0f172a", borderRadius: "16px", padding: "24px", border: "1px solid #334155" }}>
      {/* Tiêu đề & Giới thiệu */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#38bdf8" }}>
            ⚙️ Quản Trị Ngưỡng Kích Hoạt Cảnh Báo & Phân Loại Mức Độ Nghiêm Trọng (CN 34)
          </h2>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "13px" }}>
            Thiết lập định mức bán kính gửi thông báo đẩy tự động (km) và nội dung hướng dẫn an toàn y tế mặc định tương ứng với 3 cấp độ cảnh báo đô thị.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            id="CFG_BTN_RESET"
            type="button"
            onClick={handleReset}
            disabled={loading || saving}
            style={{
              background: "#1e293b",
              color: "#f87171",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↺ Khôi Phục Chuẩn Quy Định
          </button>
          <button
            id="CFG_BTN_SAVE"
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            style={{
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "9px 20px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.4)",
            }}
          >
            {saving ? "Đang lưu..." : "💾 Lưu Quy Chuẩn"}
          </button>
        </div>
      </div>

      {alertMsg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: 600,
            background: alertMsg.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${alertMsg.type === "success" ? "#22c55e" : "#ef4444"}`,
            color: alertMsg.type === "success" ? "#4ade80" : "#fca5a5",
          }}
        >
          {alertMsg.type === "success" ? "✓ " : "⚠️ "} {alertMsg.text}
        </div>
      )}

      {/* Bảng Danh mục Cấp độ Cảnh báo (CFG_TBL_THRESHOLDS) */}
      <div style={{ marginBottom: "24px", overflowX: "auto" }}>
        <table
          id="CFG_TBL_THRESHOLDS"
          style={{ width: "100%", borderCollapse: "collapse", background: "#1e293b", borderRadius: "8px", overflow: "hidden" }}
        >
          <thead>
            <tr style={{ background: "#0b1329", color: "#94a3b8", fontSize: "12px", textAlign: "left" }}>
              <th style={{ padding: "12px 16px" }}>CẤP ĐỘ CẢNH BÁO</th>
              <th style={{ padding: "12px 16px" }}>BÁN KÍNH PHÁT THÔNG BÁO (KM)</th>
              <th style={{ padding: "12px 16px" }}>NGƯỠNG AQI KÍCH HOẠT</th>
              <th style={{ padding: "12px 16px" }}>MÔ TẢ QUY CHUẨN</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const isSelected = rule.severity_level === selectedSeverity;
              return (
                <tr
                  key={rule.severity_level}
                  style={{
                    borderTop: "1px solid #334155",
                    background: isSelected ? "rgba(2, 132, 199, 0.1)" : "transparent",
                  }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: rule.color_hex || (rule.severity_level === "RED" ? "#ef4444" : rule.severity_level === "ORANGE" ? "#f97316" : "#eab308"),
                        }}
                      />
                      <strong style={{ color: "#f8fafc", fontSize: "13px" }}>{rule.severity_name}</strong>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>
                      {rule.radius_km} km
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                      (Bán kính gửi Push)
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#cbd5e1", fontSize: "13px" }}>
                    {rule.min_aqi_threshold ? `≥ ${rule.min_aqi_threshold} AQI` : "Theo sự cố hiện trường"}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "12px", maxWidth: "320px" }}>
                    {rule.description || "Quy chuẩn môi trường đô thị"}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity(rule.severity_level)}
                      style={{
                        background: isSelected ? "#0284c7" : "#334155",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isSelected ? "Đang chọn" : "Chỉnh sửa"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form chỉnh sửa chi tiết cho Cấp độ đang chọn */}
      {activeRule && (
        <div
          style={{
            background: "#1e293b",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #475569",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span
              style={{
                background: activeRule.severity_level === "RED" ? "#ef4444" : activeRule.severity_level === "ORANGE" ? "#f97316" : "#eab308",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              ĐANG HIỆU CHỈNH: {activeRule.severity_name.toUpperCase()}
            </span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              (Các thay đổi sẽ có hiệu lực ngay trong lần phát cảnh báo tiếp theo)
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
            {/* Cột 1: Bán kính & Hotline */}
            <div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  BÁN KÍNH PHÁT TIN CẢNH BÁO (KM) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    id="CFG_NUM_RADIUS"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10.0"
                    value={activeRule.radius_km}
                    onChange={(e) => handleRadiusChange(activeRule.severity_level, parseFloat(e.target.value) || 0.5)}
                    style={{
                      width: "120px",
                      padding: "10px",
                      background: "#0f172a",
                      border: "1px solid #475569",
                      borderRadius: "6px",
                      color: "#38bdf8",
                      fontSize: "16px",
                      fontWeight: 800,
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>kilômét (km)</span>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  Giới hạn: 0.5 km đến 10.0 km tính từ tâm điểm sự cố để tránh làm phiền dân cư ngoài vùng.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  HOTLINE KHẨN CẤP TIẾP NHẬN
                </label>
                <input
                  type="text"
                  value={hotline}
                  onChange={(e) => setHotline(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#0f172a",
                    border: "1px solid #475569",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Cột 2: Mẫu khuyến cáo y tế mặc định (CFG_TXT_DEFAULT_ADVICE) */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                MẪU THÔNG ĐIỆP KHUYẾN CÁO Y TẾ PHÒNG HỘ MẶC ĐỊNH <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                id="CFG_TXT_DEFAULT_ADVICE"
                rows={5}
                value={activeRule.default_safety_advice}
                onChange={(e) => handleAdviceChange(activeRule.severity_level, e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
                placeholder="Nhập nội dung mẫu khuyến cáo y tế, khẩu trang, đóng cửa nhà..."
              />
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                Nội dung này sẽ tự động điền sẵn khi cán bộ biên tập bản tin cảnh báo cấp {activeRule.severity_name}.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
