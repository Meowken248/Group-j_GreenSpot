import {
  listUserQueue,
  updateQueueItemStatus,
  deleteQueueItem,
} from "./outboxQueueRepository";
import type { OfflineQueueItem, SyncResultSummary } from "../types/offline.types";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";

const RETRY_DELAYS_MS = [2000, 4000]; // Khoảng cách giãn cách tăng dần theo R14

let isSyncInProgress = false;

const getValidAccessToken = (): string => {
  return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) || "";
};

/**
 * Upload tệp nhị phân Blob lên server kèm mộc thời gian chụp thực tế ngoại tuyến.
 */
const uploadSingleBlob = async (
  item: OfflineQueueItem,
  blob: Blob,
  clientFileId: string,
  mediaType: "IMAGE" | "VIDEO" | "AUDIO",
  capturedAt: string
): Promise<{ file_url: string; thumbnail_url?: string }> => {
  const token = getValidAccessToken();
  if (!token) {
    const err: any = new Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập");
    err.status = 401;
    throw err;
  }
  const formData = new FormData();
  formData.append("file", blob, `${clientFileId}.${mediaType === "IMAGE" ? "jpg" : mediaType === "VIDEO" ? "mp4" : "webm"}`);
  formData.append("client_file_id", clientFileId);
  formData.append("latitude", String(item.latitude));
  formData.append("longitude", String(item.longitude));
  formData.append("captured_at", capturedAt);

  const res = await fetch("/api/v1/offline-sync/media/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 401) {
      const err: any = new Error("Phiên đăng nhập đã hết hạn");
      err.status = 401;
      throw err;
    }
    const errText = await res.text();
    throw new Error(`Upload tệp thất bại (${res.status}): ${errText}`);
  }

  const json = await res.json();
  return {
    file_url: json.file_url,
    thumbnail_url: json.thumbnail_url,
  };
};

/**
 * Gửi một phản ánh đơn lẻ từ hàng đợi lên máy chủ.
 */
const sendSingleQueueItem = async (
  item: OfflineQueueItem
): Promise<{ tracking_code: string; incident_id: string; points_awarded: number }> => {
  const token = getValidAccessToken();
  if (!token) {
    const err: any = new Error("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập");
    err.status = 401;
    throw err;
  }

  // 1. Upload các tệp media (nếu có)
  const uploadedMediaItems = [];
  for (const m of item.media_blobs) {
    const uploadRes = await uploadSingleBlob(
      item,
      m.blob,
      m.client_file_id,
      m.media_type,
      m.captured_at
    );
    uploadedMediaItems.push({
      client_file_id: m.client_file_id,
      file_url: uploadRes.file_url,
      thumbnail_url: uploadRes.thumbnail_url,
      media_type: m.media_type,
      file_size_bytes: m.size,
      mime_type: m.mime_type,
      captured_at: m.captured_at,
    });
  }

  // Nếu có voice_blob riêng biệt
  if (item.voice_blob) {
    const voiceUpload = await uploadSingleBlob(
      item,
      item.voice_blob,
      `voice_${item.queue_id}`,
      "AUDIO",
      new Date(item.created_at).toISOString()
    );
    uploadedMediaItems.push({
      client_file_id: `voice_${item.queue_id}`,
      file_url: voiceUpload.file_url,
      thumbnail_url: undefined,
      media_type: "AUDIO",
      file_size_bytes: item.voice_blob.size,
      mime_type: item.voice_blob.type || "audio/webm",
      captured_at: new Date(item.created_at).toISOString(),
    });
  }

  // 2. Gửi yêu cầu tạo sự cố ngoại tuyến qua endpoint Idempotent
  const payload = {
    client_submission_id: item.client_submission_id,
    idempotency_key: item.idempotency_key,
    category_id: item.category_id,
    title: item.title,
    description: item.description,
    severity: item.severity,
    latitude: item.latitude,
    longitude: item.longitude,
    address_text: item.address_text,
    media: uploadedMediaItems,
    is_anonymous: item.is_anonymous,
    reporter_phone: item.reporter_phone,
    client_timestamp: new Date(item.created_at).toISOString(),
  };

  const response = await fetch("/api/v1/offline-sync/incidents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const err: any = new Error("Phiên đăng nhập đã hết hạn");
      err.status = 401;
      throw err;
    }
    const errJson = await response.json().catch(() => ({}));
    const message = errJson.detail || "Không thể đồng bộ phản ánh lên hệ thống.";
    const err: any = new Error(message);
    err.status = response.status;
    throw err;
  }

  const result = await response.json();
  return {
    tracking_code: result.tracking_code,
    incident_id: result.incident_id,
    points_awarded: result.points_awarded || 0,
  };
};

/**
 * Bộ điều phối đồng bộ tự động hàng đợi gửi (Auto Background Sync Engine).
 * Có thể gọi tự động khi online hoặc gọi thủ công cho một mục cụ thể.
 */
export const syncOutboxQueue = async (manualQueueId?: string): Promise<SyncResultSummary> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      total: 0,
      success_count: 0,
      failed_count: 0,
      successful_incidents: [],
      errors: [],
      synced_at: new Date().toISOString(),
    };
  }

  if (isSyncInProgress) {
    console.log("[SyncEngine] Tiến trình đồng bộ đang chạy, bỏ qua lần gọi trùng.");
    return {
      total: 0,
      success_count: 0,
      failed_count: 0,
      successful_incidents: [],
      errors: [],
      synced_at: new Date().toISOString(),
    };
  }

  isSyncInProgress = true;

  const summary: SyncResultSummary = {
    total: 0,
    success_count: 0,
    failed_count: 0,
    successful_incidents: [],
    errors: [],
    synced_at: new Date().toISOString(),
  };

  try {
    const queue = await listUserQueue();

    // Lọc danh sách mục cần gửi (FIFO)
    let candidateItems = queue.filter(
      (item) => item.status === "QUEUED" || (manualQueueId && item.queue_id === manualQueueId)
    );

    if (manualQueueId) {
      candidateItems = queue.filter((item) => item.queue_id === manualQueueId);
    }

    summary.total = candidateItems.length;

    for (const item of candidateItems) {
      // Đánh dấu SENDING
      await updateQueueItemStatus(item.queue_id, { status: "SENDING" });

      try {
        const sendResult = await sendSingleQueueItem(item);

        // Thành công: Giải phóng khỏi hàng đợi (R24)
        await deleteQueueItem(item.queue_id, true);

        summary.success_count += 1;
        summary.successful_incidents.push({
          code: sendResult.tracking_code,
          incident_id: sendResult.incident_id,
          title: item.title,
        });

        try {
          localStorage.setItem("greenspot_last_sync_time", new Date().toISOString());
        } catch {
          // Bỏ qua lỗi lưu local
        }
      } catch (err: any) {
        // Xử lý hết phiên (R19)
        if (err.status === 401) {
          console.warn("[SyncEngine] Phiên hết hạn (401). Tạm dừng đồng bộ và giữ nguyên hàng đợi.");
          await updateQueueItemStatus(item.queue_id, { status: "QUEUED" });
          window.dispatchEvent(new CustomEvent("greenspot_session_expired"));
          break; // Dừng ngay vòng lặp đồng bộ
        }

        const nextRetryCount = item.retry_count + 1;
        const isClientError = err.status && err.status >= 400 && err.status < 500;

        if (!isClientError && nextRetryCount < item.max_retries) {
          // Lỗi mạng hoặc 5xx tạm thời: thử lại có giãn cách (R14)
          const delayMs = RETRY_DELAYS_MS[nextRetryCount - 1] || 4000;
          await updateQueueItemStatus(item.queue_id, {
            status: "QUEUED",
            retry_count: nextRetryCount,
            next_retry_at: Date.now() + delayMs,
            last_error: err.message || "Lỗi kết nối",
          });
        } else {
          // Quá 3 lần hoặc lỗi nghiệp vụ 4xx: chuyển sang FAILED (R14, R22)
          await updateQueueItemStatus(item.queue_id, {
            status: "FAILED",
            retry_count: nextRetryCount,
            last_error: err.message || "Đồng bộ thất bại",
          });
          summary.failed_count += 1;
          summary.errors.push({
            queue_id: item.queue_id,
            title: item.title,
            error: err.message || "Đồng bộ thất bại",
          });
        }
      }
    }
  } finally {
    isSyncInProgress = false;
  }

  // Phát sự kiện hoàn tất đồng bộ để hiển thị popup kết quả (R20, R21, R22)
  if (summary.success_count > 0 || summary.failed_count > 0) {
    window.dispatchEvent(
      new CustomEvent("greenspot_sync_completed", { detail: summary })
    );
  }

  return summary;
};

/**
 * Khởi tạo bộ lắng nghe sự kiện mạng (Online/Offline) toàn cục.
 */
export const initSyncEngineListeners = (): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => {
    console.log("[SyncEngine] Phát hiện kết nối mạng phục hồi. Bắt đầu tự động đồng bộ ngầm...");
    syncOutboxQueue();
  };

  window.addEventListener("online", handleOnline);

  // Thử đồng bộ ngay khi khởi động nếu đang có mạng
  if (navigator.onLine) {
    syncOutboxQueue();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
};
