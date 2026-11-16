import { writeOffline } from "./offlineTransaction";
import { openOfflineDatabase, STORES, getCurrentUserId } from "./offlineDb";
import type { OfflineQueueItem, QueueStatistics } from "../types/offline.types";

export const MAX_QUEUE_CAPACITY = 20;

/**
 * Thêm một phản ánh đã xác nhận vào hàng đợi gửi (Offline Outbox Queue).
 * Tuân thủ R08 (kiểm tra đầy đủ), R09 (tối đa 20 phản ánh), R10 (bảo toàn dữ liệu khi đầy bộ nhớ).
 */
type QueueInput = Omit<OfflineQueueItem, "queue_id" | "status" | "retry_count" | "max_retries" | "next_retry_at" | "last_error" | "created_at" | "updated_at">;

const newQueueItem = (data: QueueInput): OfflineQueueItem => {
  const userId = getCurrentUserId();
  if (data.user_id && data.user_id !== userId) throw new Error("Tài khoản đã thay đổi. Vui lòng tải lại trang.");
  const now = Date.now();
  return {...data, user_id: userId, queue_id: crypto.randomUUID(), status: "QUEUED", retry_count: 0,
    max_retries: 3, next_retry_at: null, last_error: null, created_at: now, updated_at: now};
};

export const enqueueReport = async (data: QueueInput): Promise<OfflineQueueItem> => {
  const item = newQueueItem(data);
  return writeOffline(STORES.OUTBOX_QUEUE, (store, done, fail) => {
    const request = store.index("by_user_id").getAll(item.user_id);
    request.onsuccess = () => {
      const items = request.result as OfflineQueueItem[];
      const duplicate = items.find(i => i.client_submission_id === item.client_submission_id || i.idempotency_key === item.idempotency_key);
      if (duplicate) { fail(new Error("Phản ánh đã có trong hàng đợi. Vui lòng tải lại danh sách.")); return; }
      if (items.filter(i => i.status !== "SENT").length >= MAX_QUEUE_CAPACITY) {
        fail(new Error(`Hàng đợi đã đạt dung lượng tối đa (${MAX_QUEUE_CAPACITY} phản ánh). Vui lòng kết nối mạng để đồng bộ trước khi gửi thêm.`)); return;
      }
      store.add(item).onsuccess = () => done(item);
    };
  });
};

export const replaceQueueItem = async (oldQueueId: string, data: QueueInput, expectedUpdatedAt?: number): Promise<OfflineQueueItem> => {
  const item = newQueueItem(data);
  return writeOffline(STORES.OUTBOX_QUEUE, (store, done, fail) => {
    const request = store.get(oldQueueId);
    request.onsuccess = () => {
      const old = request.result as OfflineQueueItem | undefined;
      if (!old || old.user_id !== item.user_id) { fail(new Error("Phản ánh không còn tồn tại. Vui lòng tải lại danh sách.")); return; }
      if (old.status === "SENDING" || old.status === "SENT") { fail(new Error("Phản ánh đang gửi hoặc đã gửi, không thể chỉnh sửa.")); return; }
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== old.updated_at) {
        fail(new Error("Phản ánh đã được thay đổi ở tab khác. Vui lòng tải lại trang trước khi cập nhật.")); return;
      }
      store.delete(oldQueueId);
      store.add(item).onsuccess = () => done(item);
    };
  });
};

/**
 * Lấy danh sách hàng đợi của tài khoản hiện tại theo thứ tự gửi FIFO (từ cũ đến mới - R13).
 */
export const listUserQueue = async (userId?: string): Promise<OfflineQueueItem[]> => {
  const db = await openOfflineDatabase();
  const targetUserId = userId || getCurrentUserId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX_QUEUE, "readonly");
    const store = tx.objectStore(STORES.OUTBOX_QUEUE);
    const index = store.index("by_user_id");
    const req = index.getAll(targetUserId);

    req.onsuccess = () => {
      const items = (req.result || []) as OfflineQueueItem[];
      // Sắp xếp FIFO: cũ nhất lên trước (R13)
      items.sort((a, b) => a.created_at - b.created_at);
      resolve(items);
    };

    req.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error("Lỗi khi đọc hàng đợi gửi"));
    };
  });
};

/**
 * Lấy chi tiết một mục trong hàng đợi.
 */
export const getQueueItemById = async (queueId: string): Promise<OfflineQueueItem | null> => {
  const db = await openOfflineDatabase();
  const currentUserId = getCurrentUserId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX_QUEUE, "readonly");
    const store = tx.objectStore(STORES.OUTBOX_QUEUE);
    const req = store.get(queueId);

    req.onsuccess = () => {
      const item = req.result as OfflineQueueItem | undefined;
      if (!item) {
        resolve(null);
        return;
      }
      if (item.user_id !== currentUserId) {
        resolve(null);
        return;
      }
      resolve(item);
    };

    req.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error("Lỗi khi đọc mục hàng đợi"));
    };
  });
};

/**
 * Cập nhật trạng thái của mục trong hàng đợi (optimistic locking / state transition).
 */
export const updateQueueItemStatus = async (
  queueId: string, updates: Partial<OfflineQueueItem>, expectedUpdatedAt?: number,
): Promise<number> => {
  const userId = getCurrentUserId();
  return writeOffline(STORES.OUTBOX_QUEUE, (store, done, fail) => {
    const request = store.get(queueId);
    request.onsuccess = () => {
      const current = request.result as OfflineQueueItem | undefined;
      if (!current || current.user_id !== userId) { fail(new Error("Không tìm thấy mục hàng đợi của tài khoản hiện tại.")); return; }
      if ((expectedUpdatedAt !== undefined && current.updated_at !== expectedUpdatedAt)
          || (updates.status === "SENDING" && !["QUEUED", "FAILED"].includes(current.status))) {
        fail(new Error("Phản ánh đã được xử lý ở tab khác. Vui lòng tải lại danh sách.")); return;
      }
      // Internal state changes cannot overwrite ownership, content or idempotency keys.
      const allowed = ["status", "retry_count", "max_retries", "next_retry_at", "last_error", "incident_id", "incident_code", "points_awarded"] as const;
      const state = Object.fromEntries(allowed.filter(k => k in updates).map(k => [k, updates[k]]));
      const updatedAt = Math.max(Date.now(), current.updated_at + 1);
      store.put({...current, ...state, updated_at: updatedAt}).onsuccess = () => done(updatedAt);
    };
  });
};

// Release only the claim this sync run acquired, even if login changed mid-request.
export const releaseQueueClaim = async (queueId: string, ownerId: string, claimedAt: number): Promise<void> =>
  writeOffline(STORES.OUTBOX_QUEUE, (store, done) => {
    const request = store.get(queueId);
    request.onsuccess = () => {
      const item = request.result as OfflineQueueItem | undefined;
      if (!item || item.user_id !== ownerId || item.status !== "SENDING" || item.updated_at !== claimedAt) { done(undefined); return; }
      store.put({...item, status: "QUEUED", updated_at: Math.max(Date.now(), claimedAt + 1)}).onsuccess = () => done(undefined);
    };
  });

export const deleteQueueItem = async (queueId: string, force = false): Promise<void> => {
  const userId = getCurrentUserId();
  return writeOffline(STORES.OUTBOX_QUEUE, (store, done, fail) => {
    const request = store.get(queueId);
    request.onsuccess = () => {
      const item = request.result as OfflineQueueItem | undefined;
      if (!item && force) { done(undefined); return; }
      if (!item || item.user_id !== userId) { fail(new Error("Phản ánh không còn tồn tại. Vui lòng tải lại danh sách.")); return; }
      if (item.status === "SENDING" && !force) { fail(new Error("Không thể xóa phản ánh khi đang trong tiến trình gửi lên máy chủ.")); return; }
      store.delete(queueId).onsuccess = () => done(undefined);
    };
  });
};

/**
 * Thống kê tổng quan hàng đợi phục vụ hiển thị trên giao diện (R17).
 */
export const getQueueStatistics = async (userId?: string): Promise<QueueStatistics> => {
  const items = await listUserQueue(userId);
  const pending_count = items.filter((item) => item.status === "QUEUED").length;
  const failed_count = items.filter((item) => item.status === "FAILED").length;
  const sending_count = items.filter((item) => item.status === "SENDING").length;

  let last_synced_at: string | null = null;
  try {
    last_synced_at = localStorage.getItem("greenspot_last_sync_time");
  } catch {
    last_synced_at = null;
  }

  return {
    pending_count,
    failed_count,
    sending_count,
    last_synced_at,
  };
};
