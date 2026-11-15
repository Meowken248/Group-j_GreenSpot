import React, { useState, useEffect, useCallback } from "react";
import {
  listUserQueue,
  deleteQueueItem,
  getQueueStatistics,
} from "../services/outboxQueueRepository";
import {
  listUserDrafts,
  deleteDraftFromDb,
} from "../services/draftRepository";
import { syncOutboxQueue } from "../services/syncEngine";
import type {
  OfflineQueueItem,
  OfflineDraft,
  QueueStatistics,
} from "../types/offline.types";
import "./OfflineOutboxPage.scss";

interface OfflineOutboxPageProps {
  onBackToReport: () => void;
  onResumeDraft: (draftId: string) => void;
  onEditQueueItem?: (queueItem: OfflineQueueItem) => void;
}

export const OfflineOutboxPage: React.FC<OfflineOutboxPageProps> = ({
  onBackToReport,
  onResumeDraft,
  onEditQueueItem,
}) => {
  const [activeTab, setActiveTab] = useState<"queue" | "drafts">("queue");
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [stats, setStats] = useState<QueueStatistics>({
    pending_count: 0,
    failed_count: 0,
    sending_count: 0,
    last_synced_at: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<"queue" | "draft">("queue");
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [queueData, draftData, statData] = await Promise.all([
        listUserQueue(),
        listUserDrafts(),
        getQueueStatistics(),
      ]);
      setQueueItems(queueData);
      setDrafts(draftData);
      setStats(statData);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu ngoại tuyến:", err);
      setActionError(err.message || "Không thể tải dữ liệu ngoại tuyến.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Lắng nghe sự kiện đồng bộ hoàn tất để tự refresh
    const handleSyncCompleted = () => {
      loadData();
    };

    window.addEventListener("greenspot_sync_completed", handleSyncCompleted);
    return () => {
      window.removeEventListener("greenspot_sync_completed", handleSyncCompleted);
    };
  }, [loadData]);

  // Đồng bộ thủ công toàn bộ hàng đợi
  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      setActionError("Thiết bị đang mất mạng. Vui lòng kết nối Internet để đồng bộ.");
      return;
    }
    setIsSyncing(true);
    setActionError(null);
    try {
      await syncOutboxQueue();
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Đồng bộ thất bại.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Đồng bộ thủ công một mục cụ thể
  const handleRetryItem = async (queueId: string) => {
    if (!navigator.onLine) {
      setActionError("Thiết bị đang mất mạng. Vui lòng kết nối Internet để gửi lại.");
      return;
    }
    setIsSyncing(true);
    try {
      await syncOutboxQueue(queueId);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Gửi lại thất bại.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;

    try {
      if (deleteTargetType === "queue") {
        await deleteQueueItem(confirmDeleteId);
      } else {
        await deleteDraftFromDb(confirmDeleteId);
      }
      setConfirmDeleteId(null);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Không thể xóa mục này.");
    }
  };

  return (
    <div className="offline-outbox-page-root">
      {/* HEADER */}
      <header className="outbox-top-header">
        <div className="header-left">
          <button
            type="button"
            className="btn-back"
            onClick={onBackToReport}
            aria-label="Quay lại tạo phản ánh"
          >
            ← Quay lại soạn phản ánh
          </button>
          <h1 className="page-heading">Quản Lý Phản Ánh Ngoại Tuyến (Offline-First)</h1>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="btn-sync-now"
            onClick={handleSyncAll}
            disabled={isSyncing || queueItems.length === 0}
          >
            {isSyncing ? "⏳ Đang đồng bộ..." : "🔄 Đồng bộ ngay"}
          </button>
        </div>
      </header>

      {/* R17: THANH THỐNG KÊ TỔNG QUAN */}
      <section className="stats-dashboard-bar">
        <div className="stat-card">
          <span className="stat-label">Chờ gửi (Queue):</span>
          <span className="stat-value text-blue">{stats.pending_count}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lỗi cần xử lý:</span>
          <span className="stat-value text-red">{stats.failed_count}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đang gửi:</span>
          <span className="stat-value text-amber">{stats.sending_count}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đồng bộ gần nhất:</span>
          <span className="stat-value text-muted">
            {stats.last_synced_at
              ? new Date(stats.last_synced_at).toLocaleTimeString("vi-VN")
              : "Chưa có"}
          </span>
        </div>
      </section>

      {actionError && (
        <div className="action-error-alert" role="alert">
          <span>⚠️ {actionError}</span>
          <button
            type="button"
            className="close-alert-btn"
            onClick={() => setActionError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* R12: HAI KHỐI TÁCH BIỆT: HÀNG ĐỢI & BẢN NHÁP */}
      <nav className="tab-navigation">
        <button
          type="button"
          className={`tab-btn ${activeTab === "queue" ? "active" : ""}`}
          onClick={() => setActiveTab("queue")}
        >
          📬 Hàng đợi gửi ({queueItems.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "drafts" ? "active" : ""}`}
          onClick={() => setActiveTab("drafts")}
        >
          📝 Bản nháp ({drafts.length})
        </button>
      </nav>

      <main className="tab-content-area">
        {isLoading ? (
          <div className="loading-state">
            <span className="spinner"></span>
            <p>Đang tải dữ liệu lưu trữ...</p>
          </div>
        ) : activeTab === "queue" ? (
          /* KHỐI 1: HÀNG ĐỢI GỬI */
          <div className="queue-list-container">
            {queueItems.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <h3>Hàng đợi đang trống</h3>
                <p>Các phản ánh được xác nhận gửi khi ngoại tuyến sẽ xuất hiện tại đây.</p>
                <button type="button" className="btn-action" onClick={onBackToReport}>
                  Tạo phản ánh mới
                </button>
              </div>
            ) : (
              <ul className="items-list">
                {queueItems.map((item) => (
                  <li key={item.queue_id} className={`queue-card status-${item.status.toLowerCase()}`}>
                    <div className="item-main">
                      <div className="badge-row">
                        <span className={`status-pill pill-${item.status.toLowerCase()}`}>
                          {item.status === "QUEUED" && "Chờ gửi"}
                          {item.status === "SENDING" && "Đang gửi..."}
                          {item.status === "FAILED" && "Lỗi gửi"}
                          {item.status === "SENT" && "Đã gửi"}
                        </span>
                        <span className="category-pill">{item.category_name}</span>
                        <span className="time-text">
                          {new Date(item.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      <h3 className="item-title">{item.title}</h3>
                      <p className="item-address">📍 {item.address_text}</p>
                      <p className="item-desc">{item.description}</p>

                      {item.media_blobs.length > 0 && (
                        <div className="media-summary-row">
                          <span>📎 Đính kèm: {item.media_blobs.length} tệp (ảnh/video)</span>
                        </div>
                      )}

                      {/* Thông báo lỗi & retry */}
                      {item.status === "FAILED" && (
                        <div className="item-error-box">
                          <span className="error-text">❌ Lỗi: {item.last_error}</span>
                          <span className="retry-count">
                            (Đã thử lại {item.retry_count}/{item.max_retries} lần)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="item-actions">
                      {/* R15: Nút Gửi lại */}
                      <button
                        type="button"
                        className="btn-retry"
                        onClick={() => handleRetryItem(item.queue_id)}
                        disabled={item.status === "SENDING" || isSyncing}
                      >
                        Gửi lại
                      </button>

                      {/* R22: Sửa phản ánh nếu có lỗi */}
                      {onEditQueueItem && item.status === "FAILED" && (
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => onEditQueueItem(item)}
                        >
                          Sửa nội dung
                        </button>
                      )}

                      {/* R15: Nút Xóa có xác nhận, bị khóa khi SENDING */}
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => {
                          setDeleteTargetType("queue");
                          setConfirmDeleteId(item.queue_id);
                        }}
                        disabled={item.status === "SENDING"}
                      >
                        Xóa
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* KHỐI 2: DANH SÁCH BẢN NHÁP (R16) */
          <div className="drafts-list-container">
            {drafts.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <h3>Chưa có bản nháp nào</h3>
                <p>Nội dung đang soạn sẽ được tự động lưu nháp an toàn trên thiết bị.</p>
                <button type="button" className="btn-action" onClick={onBackToReport}>
                  Soạn phản ánh mới
                </button>
              </div>
            ) : (
              <ul className="items-list">
                {drafts.map((draft) => (
                  <li key={draft.draft_id} className="draft-card">
                    <div className="item-main">
                      <div className="badge-row">
                        <span className="category-pill">
                          {draft.formData.category_name || "Chưa phân loại"}
                        </span>
                        <span className="step-pill">
                          Đang ở Bước {draft.current_step}/5
                        </span>
                        <span className="time-text">
                          Lưu lúc: {new Date(draft.updated_at).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      <h3 className="item-title">
                        {draft.title || draft.formData.title || "Bản nháp chưa đặt tiêu đề"}
                      </h3>
                      {draft.formData.description && (
                        <p className="item-desc">{draft.formData.description}</p>
                      )}
                      {draft.formData.location && (
                        <p className="item-address">
                          📍 {draft.formData.location.address_text}
                        </p>
                      )}
                    </div>

                    <div className="item-actions">
                      {/* R16: Mở bản nháp để soạn tiếp */}
                      <button
                        type="button"
                        className="btn-resume"
                        onClick={() => onResumeDraft(draft.draft_id)}
                      >
                        Soạn tiếp →
                      </button>

                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => {
                          setDeleteTargetType("draft");
                          setConfirmDeleteId(draft.draft_id);
                        }}
                      >
                        Xóa nháp
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* MODAL XÁC NHẬN XÓA (R15) */}
      {confirmDeleteId && (
        <div className="delete-confirm-backdrop">
          <div className="delete-confirm-modal">
            <h3>Xác nhận xóa</h3>
            <p>
              Bạn có chắc chắn muốn xóa{" "}
              {deleteTargetType === "queue"
                ? "phản ánh này khỏi hàng đợi gửi"
                : "bản nháp này"}
              ? Thao tác này không thể hoàn tác.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setConfirmDeleteId(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDelete}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
