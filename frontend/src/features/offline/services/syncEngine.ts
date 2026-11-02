import {
  listUserQueue,
  updateQueueItemStatus,
  deleteQueueItem,
} from "./outboxQueueRepository";
import { getCurrentUserId } from "./offlineDb";
import type { OfflineQueueItem, SyncResultSummary } from "../types/offline.types";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";

const RETRY_DELAYS_MS = [2000, 4000]; // Khoảng cách giãn cách tăng dần theo R14
const SENDING_LEASE_TIMEOUT_MS = 30000; // Thời gian tối đa giữ trạng thái SENDING trước khi đối soát

let isSyncInProgress = false;
let retrySchedulerTimer: ReturnType<typeof setTimeout> | null = null;

const getValidAccessToken = (): string => {
  return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) || "";
};

export const resetAllFailedQueueItems = async (): Promise<void> => {
  const queue = await listUserQueue();
  const failedItems = queue.filter((item) => item.status === "FAILED");
  for (const item of failedItems) {
    await updateQueueItemStatus(item.queue_id, {
      status: "QUEUED",
      retry_count: 0,
      next_retry_at: null,
      last_error: null,
    });
  }
};

/**
 * Đối soát và phục hồi các mục bị kẹt ở trạng thái SENDING do đóng tab/ứng dụng đột ngột.
 * Trả về thời gian lease còn lại nhỏ nhất (nếu có mục SENDING chưa hết hạn lease).
 */
const reconcileStuckSendingItems = async (queue: OfflineQueueItem[]): Promise<number | null> => {
  const now = Date.now();
  const token = getValidAccessToken();
  let minRemainingLease: number | null = null;

  for (const item of queue) {
    if (item.status !== "SENDING") continue;
    const elapsed = now - (item.updated_at || item.created_at);

    if (elapsed > SENDING_LEASE_TIMEOUT_MS) {
      if (token) {
        try {
          const res = await fetch(`/api/v1/offline-sync/submissions/${item.client_submission_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const receipt = await res.json();
            if (receipt && receipt.status === "PROCESSED") {
              // Máy chủ đã xử lý thành công: giải phóng khỏi hàng đợi
              await deleteQueueItem(item.queue_id, true);
              continue;
            }
          }
        } catch (err) {
          console.warn("[SyncEngine] Lỗi đối soát biên nhận máy chủ cho mục gián đoạn:", err);
        }
      }

      // Nếu máy chủ chưa nhận: phục hồi về QUEUED để gửi lại
      await updateQueueItemStatus(item.queue_id, {
        status: "QUEUED",
        last_error: "Tiến trình gửi trước bị gián đoạn, đã khôi phục vào hàng đợi",
      });
    } else {
      // Chưa hết hạn lease: tính thời gian còn lại cần lập lịch
      const remaining = SENDING_LEASE_TIMEOUT_MS - elapsed;
      if (minRemainingLease === null || remaining < minRemainingLease) {
        minRemainingLease = remaining;
      }
    }
  }

  return minRemainingLease;
};

/**
 * Đặt lịch tự động thử lại sau 2 và 4 giây khi tới hạn (R14) hoặc khi lease SENDING hết hạn.
 */
const scheduleNextRetryIfNeeded = async (pendingLeaseDelay?: number | null): Promise<void> => {
  if (retrySchedulerTimer) {
    clearTimeout(retrySchedulerTimer);
    retrySchedulerTimer = null;
  }
  try {
    const queue = await listUserQueue();
    const now = Date.now();
    const delays: number[] = [];

    // 1. Độ trễ thử lại của các mục QUEUED
    const pendingWithRetry = queue.filter(
      (item) => item.status === "QUEUED" && item.next_retry_at && item.next_retry_at > now
    );
    for (const item of pendingWithRetry) {
      delays.push(item.next_retry_at! - now);
    }

    // 2. Độ trễ hết hạn lease của các mục SENDING (mở lại app trước 30 giây)
    for (const item of queue) {
      if (item.status === "SENDING") {
        const elapsed = now - (item.updated_at || item.created_at);
        if (elapsed < SENDING_LEASE_TIMEOUT_MS) {
          delays.push(SENDING_LEASE_TIMEOUT_MS - elapsed + 200);
        }
      }
    }

    if (pendingLeaseDelay !== undefined && pendingLeaseDelay !== null && pendingLeaseDelay > 0) {
      delays.push(pendingLeaseDelay + 200);
    }

    if (delays.length > 0) {
      const minDelay = Math.max(Math.min(...delays), 200);
      retrySchedulerTimer = setTimeout(() => {
        syncOutboxQueue();
      }, minDelay);
    }
  } catch (err) {
    console.warn("[SyncEngine] Lỗi lập lịch thử lại:", err);
  }
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
export interface SyncOptions {
  manualQueueId?: string;
  retryFailed?: boolean;
}

/**
 * Bộ điều phối đồng bộ tự động hàng đợi gửi (Auto Background Sync Engine).
 * Có thể gọi tự động khi online hoặc gọi thủ công cho một mục cụ thể.
 */
export const syncOutboxQueue = async (
  options?: string | SyncOptions
): Promise<SyncResultSummary> => {
  const manualQueueId = typeof options === "string" ? options : options?.manualQueueId;
  const retryFailed = typeof options === "object" ? options?.retryFailed : false;

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

  // Nếu người dùng yêu cầu thử lại toàn bộ các mục lỗi (R15, R22)
  if (retryFailed) {
    await resetAllFailedQueueItems();
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

  let minRemainingLease: number | null = null;

  try {
    let queue = await listUserQueue();

    // 1. Phục hồi và đối soát các mục bị kẹt ở trạng thái SENDING do đóng tab (Issue 5)
    minRemainingLease = await reconcileStuckSendingItems(queue);

    // Nạp lại danh sách hàng đợi sau khi đối soát
    queue = await listUserQueue();

    const now = Date.now();
    const syncUserId = getCurrentUserId();
    if (!syncUserId) {
      return summary;
    }

    // 2. Lọc danh sách mục cần gửi (FIFO):
    // Tuân thủ thời điểm retry (R14): next_retry_at <= now hoặc chưa có next_retry_at
    // Nếu có manualQueueId: ưu tiên gửi ngay không phụ thuộc next_retry_at
    let candidateItems = queue.filter((item) => {
      if (manualQueueId) {
        return item.queue_id === manualQueueId;
      }
      if (item.status !== "QUEUED") return false;
      if (item.next_retry_at && item.next_retry_at > now) {
        return false; // Chưa tới hạn thử lại
      }
      return true;
    });

    if (manualQueueId) {
      candidateItems = queue.filter((item) => item.queue_id === manualQueueId);
    }

    summary.total = candidateItems.length;

    for (const item of candidateItems) {
      // Kiểm tra tài khoản hiện tại: nếu người dùng chuyển tài khoản hoặc đăng xuất, dừng ngay (Issue 3)
      const currentActiveUser = getCurrentUserId();
      if (!currentActiveUser || currentActiveUser !== syncUserId || item.user_id !== currentActiveUser) {
        console.warn("[SyncEngine] Tài khoản người dùng đã thay đổi hoặc đăng xuất trong lượt đồng bộ. Hủy bỏ tiến trình gửi.");
        break;
      }

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
          // Lỗi mạng hoặc 5xx tạm thời: thử lại có giãn cách 2s, 4s (R14)
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
    // Tự động kiểm tra và lên lịch cho mục retry tiếp theo (2s, 4s) hoặc lease hết hạn (Issue 5)
    await scheduleNextRetryIfNeeded(minRemainingLease);
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
 * Khởi tạo bộ lắng nghe sự kiện mạng (Online/Offline) và đăng nhập lại toàn cục.
 */
export const initSyncEngineListeners = (): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => {
    console.log("[SyncEngine] Phát hiện kết nối mạng phục hồi. Bắt đầu tự động đồng bộ ngầm...");
    syncOutboxQueue();
  };

  const handleAuthChange = () => {
    console.log("[SyncEngine] Phát hiện thay đổi tài khoản hoặc đăng nhập lại. Kích hoạt đồng bộ hàng đợi...");
    syncOutboxQueue();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("greenspot_auth_changed", handleAuthChange);
  window.addEventListener("auth_change", handleAuthChange);

  // Thử đồng bộ ngay khi khởi động nếu đang có mạng
  if (navigator.onLine) {
    syncOutboxQueue();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("greenspot_auth_changed", handleAuthChange);
    window.removeEventListener("auth_change", handleAuthChange);
  };
};
