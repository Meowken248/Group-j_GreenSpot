/**
 * IndexedDB Database Layer cho GreenSpot Offline-First (STT 19).
 * Hỗ trợ lưu trữ đa bản nháp kèm Blob tệp (ảnh, video, ghi âm) và hàng đợi gửi ngầm.
 */

const DB_NAME = "greenspot_offline_db";
const DB_VERSION = 1;

export const STORES = {
  DRAFTS: "drafts",
  OUTBOX_QUEUE: "outbox_queue",
  CACHED_CATEGORIES: "cached_categories",
} as const;

let dbInstance: IDBDatabase | null = null;

export const openOfflineDatabase = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("Trình duyệt không hỗ trợ IndexedDB"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store Bản nháp (drafts)
      if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
        const draftStore = db.createObjectStore(STORES.DRAFTS, { keyPath: "draft_id" });
        draftStore.createIndex("by_user_id", "user_id", { unique: false });
        draftStore.createIndex("by_updated_at", "updated_at", { unique: false });
      }

      // 2. Store Hàng đợi gửi (outbox_queue)
      if (!db.objectStoreNames.contains(STORES.OUTBOX_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OUTBOX_QUEUE, { keyPath: "queue_id" });
        queueStore.createIndex("by_user_id", "user_id", { unique: false });
        queueStore.createIndex("by_status", "status", { unique: false });
        queueStore.createIndex("by_created_at", "created_at", { unique: false });
      }

      // 3. Store Cache danh mục sự cố (cached_categories)
      if (!db.objectStoreNames.contains(STORES.CACHED_CATEGORIES)) {
        db.createObjectStore(STORES.CACHED_CATEGORIES, { keyPath: "category_id" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      reject(error || new Error("Không thể mở IndexedDB"));
    };

    request.onblocked = () => {
      console.warn("[IndexedDB] Cơ sở dữ liệu đang bị khóa bởi tab khác.");
    };
  });
};

/**
 * Trả về user_id hiện tại từ localStorage để phân tách dữ liệu an toàn.
 */
export const getCurrentUserId = (): string => {
  try {
    const raw = localStorage.getItem("greenspot_user");
    if (!raw) return "anonymous";
    const user = JSON.parse(raw);
    return user.user_id || user.id || "anonymous";
  } catch {
    return "anonymous";
  }
};

/**
 * Kiểm tra lỗi tràn bộ nhớ (QuotaExceededError) theo tiêu chí R10.
 */
export const isQuotaError = (err: unknown): boolean => {
  if (!err) return false;
  if (err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.code === 22 ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED"
    );
  }
  return false;
};
