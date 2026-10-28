import React, { useState, useEffect } from "react";
import "../styles/triage.scss";
import { TriageHeader, TriageFooter } from "../components/TriageHeaderFooter";
import { IncidentTriageView } from "../components/IncidentTriageView";
import { SpatialFacilityView } from "../components/SpatialFacilityView";
import type { TriageIncidentSummaryItem, TriageEvaluationData } from "../types";
import { triageService } from "../services/triageService";

export const TriageAppDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<"triage" | "spatial">("triage");
  const [incidentsList, setIncidentsList] = useState<TriageIncidentSummaryItem[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [incidentDetail, setIncidentDetail] = useState<TriageEvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Tải danh sách sự cố môi trường cần thẩm định
  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const list = await triageService.getIncidentsList(20);
      setIncidentsList(list);
      if (list.length > 0) {
        const firstId = list[0].incident_id;
        setSelectedIncidentId(firstId);
        await loadDetail(firstId);
      }
    } catch (err: any) {
      setErrorMsg("Không thể kết nối máy chủ dữ liệu sự cố. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Tải chi tiết sự cố đang chọn
  const loadDetail = async (id: string) => {
    try {
      setErrorMsg(null);
      const detail = await triageService.getIncidentDetail(id);
      setIncidentDetail(detail);
    } catch (err: any) {
      setErrorMsg("Lỗi phân tích rủi ro sự cố. Vui lòng kiểm tra lại dịch vụ AI!");
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleSelectIncident = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedIncidentId(id);
    if (id) {
      setIsLoading(true);
      await loadDetail(id);
      setIsLoading(false);
    }
  };

  const handleRefreshCurrent = async () => {
    if (selectedIncidentId) {
      await loadDetail(selectedIncidentId);
    }
  };

  return (
    <div className="triage-app-container">
      {/* Khung Header dùng chung */}
      <TriageHeader
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        activeIncidentsCount={incidentsList.length}
      />

      {/* Nội dung làm việc ở giữa */}
      <main className="triage-workspace-main">
        {/* Thanh chọn hồ sơ sự cố cần thẩm định */}
        <div className="triage-selector-bar">
          <div className="selector-left">
            <label htmlFor="incident-select">Hồ sơ sự cố tiếp nhận:</label>
            <select
              id="incident-select"
              value={selectedIncidentId}
              onChange={handleSelectIncident}
              disabled={isLoading || incidentsList.length === 0}
            >
              {incidentsList.map((inc) => (
                <option key={inc.incident_id} value={inc.incident_id}>
                  [{inc.tracking_code}] {inc.title.substring(0, 50)}... ({inc.severity})
                </option>
              ))}
            </select>
          </div>

          <div className="selector-right">
            <button
              type="button"
              className="selector-refresh-btn"
              onClick={loadIncidents}
            >
              🔄 Tải lại danh sách
            </button>
          </div>
        </div>

        {/* Trạng thái tải / lỗi */}
        {isLoading && (
          <div className="triage-state-loading">
            <div className="loading-spinner" />
            <div className="loading-text">
              Đang phân tích dữ liệu AI Triage & Không gian địa lý…
            </div>
          </div>
        )}

        {errorMsg && !isLoading && (
          <div className="triage-state-error">
            <div>⚠️ {errorMsg}</div>
            <button
              type="button"
              className="btn-retry-action"
              onClick={loadIncidents}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Hiển thị tính năng khi có dữ liệu */}
        {!isLoading && !errorMsg && incidentDetail && (
          <>
            {currentTab === "triage" ? (
              <IncidentTriageView
                data={incidentDetail}
                onRefreshData={handleRefreshCurrent}
                onNavigateToSpatial={() => setCurrentTab("spatial")}
              />
            ) : (
              <SpatialFacilityView
                incidentData={incidentDetail}
                onBackToTriage={() => setCurrentTab("triage")}
              />
            )}
          </>
        )}
      </main>

      {/* Khung Footer dùng chung */}
      <TriageFooter />
    </div>
  );
};
