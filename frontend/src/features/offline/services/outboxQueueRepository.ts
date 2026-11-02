import { openOfflineDatabase, STORES, getCurrentUserId, isQuotaError } from "./offlineDb";
import type { OfflineQueueItem, QueueStatistics } from "../types/offline.types";

export const MAX_QUEUE_CAPACITY = 20;

/**
 * Thêm một phản ánh đã xác nhận vào hàng đợi gửi (Offline Outbox Queue).
 * Tuân thủ R08 (kiểm tra đầy đủ), R09 (tối đa 20 phản ánh), R10 (bảo toàn dữ liệu khi đầy bộ nhớ).
 */
export const enqueueReport = async (
  itemData: Omit<
    OfflineQueueItem,
    "queue_id" | "status" | "retry_count" | "max_retries" | "next_retry_at" | "last_error" | "created_at" | "updated_at"
  >
): Promise<OfflineQueueItem> => {
  const db = await openOfflineDatabase();
  const currentUserId = itemData.user_id || getCurrentUserId();
  const now = Date.now();
  const queueItem: OfflineQueueItem = {
    ...itemData,
    queue_id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `queue_${now}_${Math.random().toString(36).substring(2, 9)}`,
    user_id: currentUserId,
    status: "QUEUED",
    retry_count: 0,
    max_retries: 3,
    next_retry_at: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  };

  return new Promise((resolve, reject) => {
    try {
      // Đảm bảo kiểm tra dung lượng và ghi mục diễn ra nguyên tử trong cùng 1 transaction readwrite (Issue 10)
      const tx = db.transaction(STORES.OUTBOX_QUEUE, "readwrite");
      const store = tx.objectStore(STORES.OUTBOX_QUEUE);
      const userIndex = store.index("by_user_id");
      const countReq = userIndex.getAll(currentUserId);

      countReq.onsuccess = () => {
        const userItems: OfflineQueueItem[] = countReq.result || [];
        const activeCount = userItems.filter(
          (item) => item.status === "QUEUED" || item.status === "SENDING" || item.status === "FAILED"
        ).length;

        if (activeCount >= MAX_QUEUE_CAPACITY) {
          reject(new Error(`Hàng đợi đã đạt dung lượng tối đa (${MAX_QUEUE_CAPACITY} phản ánh). Vui lòng kết nối mạng để đồng bộ trước khi gửi thêm.`));
          return;
        }

        const putReq = store.put(queueItem);
        putReq.onsuccess = () => resolve(queueItem);
        putReq.onerror = (e) => {
          const err = (e.target as IDBRequest).error;
          if (isQuotaError(err)) {
            reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể đưa thêm phản ánh vào hàng đợi."));
          } else {
            reject(err || new Error("Lỗi khi ghi phản ánh vào hàng đợi"));
          }
        };
      };

      countReq.onerror = (e) => {
        reject((e.target as IDBRequest).error || new Error("Lỗi khi kiểm tra dung lượng hàng đợi"));
      };

      tx.onerror = (e) => {
        const err = (e.target as IDBTransaction).error;
        if (isQuotaError(err)) {
          reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể đưa thêm phản ánh vào hàng đợi."));
        } else {
          reject(err || new Error("Giao dịch hàng đợi thất bại"));
        }
      };
    } catch (err) {
      if (isQuotaError(err)) {
        reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể đưa thêm phản ánh vào hàng đợi."));
      } else {
        reject(err);
      }
    }
  });
};

/**
 * Thay thế nguyên tử một mục trong hàng đợi (sửa phản ánh lỗi khi hàng đợi có thể đã đạt 20 mục - Issue 6).
 * Xóa mục cũ và ghi mục mới trong cùng 1 transaction readwrite duy nhất.
 */
export const replaceQueueItem = async (
  oldQueueId: string,
  itemData: Omit<
    OfflineQueueItem,
    "queue_id" | "status" | "retry_count" | "max_retries" | "next_retry_at" | "last_error" | "created_at" | "updated_at"
  >
): Promise<OfflineQueueItem> => {
  const db = await openOfflineDatabase();
  const currentUserId = itemData.user_id || getCurrentUserId();
  const now = Date.now();
  const queueItem: OfflineQueueItem = {
    ...itemData,
    queue_id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `queue_${now}_${Math.random().toString(36).substring(2, 9)}`,
    user_id: currentUserId,
    status: "QUEUED",
    retry_count: 0,
    max_retries: 3,
    next_retry_at: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.OUTBOX_QUEUE, "readwrite");
      const store = tx.objectStore(STORES.OUTBOX_QUEUE);
      const userIndex = store.index("by_user_id");
      const countReq = userIndex.getAll(currentUserId);

      countReq.onsuccess = () => {
        const userItems: OfflineQueueItem[] = countReq.result || [];
        // Tính dung lượng sau khi loại trừ mục cũ đang được thay thế
        const remainingActive = userItems.filter(
          (item) => item.queue_id !== oldQueueId && (item.status === "QUEUED" || item.status === "SENDING" || item.status === "FAILED")
        ).length;

        if (remainingActive >= MAX_QUEUE_CAPACITY) {
          reject(new Error(`Hàng đợi đã đạt dung lượng tối đa (${MAX_QUEUE_CAPACITY} phản ánh). Vui lòng kết nối mạng để đồng bộ trước khi gửi thêm.`));
          return;
        }

        // Xóa mục cũ và ghi mục mới nguyên tử trong cùng 1 transaction
        store.delete(oldQueueId);
        const putReq = store.put(queueItem);
        putReq.onsuccess = () => resolve(queueItem);
        putReq.onerror = (e) => {
          const err = (e.target as IDBRequest).error;
          if (isQuotaError(err)) {
            reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể đưa thêm phản ánh vào hàng đợi."));
          } else {
            reject(err || new Error("Lỗi khi ghi phản ánh vào hàng đợi"));
          }
        };
      };

      countReq.onerror = (e) => {
        reject((e.target as IDBRequest).error || new Error("Lỗi khi kiểm tra dung lượng hàng đợi"));
      };

      tx.onerror = (e) => {
        const err = (e.target as IDBTransaction).error;
        if (isQuotaError(err)) {
          reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể đưa thêm phản ánh vào hàng đợi."));
        } else {
          reject(err || new Error("Giao dịch thay thế hàng đợi thất bại"));
        }
      };
    } catch (err) {
      if (isQuotaError(err)) {
        reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể đưa thêm phản ánh vào hàng đợi."));
      } else {
        reject(err);
      }
    }
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
  queueId: string,
  updates: Partial<OfflineQueueItem>
): Promise<void> => {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.OUTBOX_QUEUE);
    const req = store.get(queueId);

    req.onsuccess = () => {
      const current = req.result as OfflineQueueItem | undefined;
      if (!current) {
        reject(new Error("Không tìm thấy mục hàng đợi để cập nhật"));
        return;
      }
      const updated = {
        ...current,
        ...updates,
        updated_at: Date.now(),
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = (e) => reject((e.target as IDBRequest).error);
    };

    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
};

/**
 * Xóa một mục khỏi hàng đợi.
 * R15: Người dùng không được phép xóa mục đang ở trạng thái SENDING.
 * Tiến trình SyncEngine truyền force = true khi hoàn tất đồng bộ thành công (R24).
 */
export const deleteQueueItem = async (queueId: string, force: boolean = false): Promise<void> => {
  const item = await getQueueItemById(queueId);
  if (!item) return;

  if (item.status === "SENDING" && !force) {
    throw new Error("Không thể xóa phản ánh khi đang trong tiến trình gửi lên máy chủ.");
  }

  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OUTBOX_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.OUTBOX_QUEUE);
    const req = store.delete(queueId);

    req.onsuccess = () => resolve();
    req.onerror = (e) => reject((e.target as IDBRequest).error || new Error("Lỗi khi xóa khỏi hàng đợi"));
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
