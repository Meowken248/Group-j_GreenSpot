import { openOfflineDatabase, STORES, getCurrentUserId, isQuotaError } from "./offlineDb";
import type { OfflineDraft } from "../types/offline.types";

/**
 * Lưu hoặc cập nhật bản nháp vào IndexedDB (hỗ trợ nhiều bản nháp & Blob tệp tin).
 */
export const saveDraftToDb = async (draft: OfflineDraft): Promise<void> => {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.DRAFTS, "readwrite");
      const store = tx.objectStore(STORES.DRAFTS);
      const record = {
        ...draft,
        user_id: draft.user_id || getCurrentUserId(),
        updated_at: Date.now(),
      };
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = (e) => {
        const err = (e.target as IDBRequest).error;
        if (isQuotaError(err)) {
          reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể lưu thêm bản nháp."));
        } else {
          reject(err || new Error("Lỗi khi ghi bản nháp vào IndexedDB"));
        }
      };
    } catch (err) {
      if (isQuotaError(err)) {
        reject(new Error("Dung lượng bộ nhớ thiết bị đã đầy. Không thể lưu thêm bản nháp."));
      } else {
        reject(err);
      }
    }
  });
};

/**
 * Lấy danh sách tất cả các bản nháp của tài khoản hiện tại, sắp xếp mới nhất lên đầu.
 */
export const listUserDrafts = async (userId?: string): Promise<OfflineDraft[]> => {
  const db = await openOfflineDatabase();
  const targetUserId = userId || getCurrentUserId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFTS, "readonly");
    const store = tx.objectStore(STORES.DRAFTS);
    const index = store.index("by_user_id");
    const req = index.getAll(targetUserId);

    req.onsuccess = () => {
      const results = (req.result || []) as OfflineDraft[];
      // Sắp xếp mới nhất lên đầu
      results.sort((a, b) => b.updated_at - a.updated_at);
      resolve(results);
    };

    req.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error("Lỗi khi đọc danh sách bản nháp"));
    };
  });
};

/**
 * Lấy chi tiết một bản nháp theo ID (kiểm tra an toàn quyền sở hữu tài khoản).
 */
export const getDraftById = async (draftId: string): Promise<OfflineDraft | null> => {
  const db = await openOfflineDatabase();
  const currentUserId = getCurrentUserId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFTS, "readonly");
    const store = tx.objectStore(STORES.DRAFTS);
    const req = store.get(draftId);

    req.onsuccess = () => {
      const draft = req.result as OfflineDraft | undefined;
      if (!draft) {
        resolve(null);
        return;
      }
      // Bảo vệ phân tách dữ liệu tài khoản (R18)
      if (draft.user_id !== currentUserId) {
        resolve(null);
        return;
      }
      resolve(draft);
    };

    req.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error("Lỗi khi tải bản nháp"));
    };
  });
};

/**
 * Xóa một bản nháp khỏi IndexedDB.
 */
export const deleteDraftFromDb = async (draftId: string): Promise<void> => {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFTS, "readwrite");
    const store = tx.objectStore(STORES.DRAFTS);
    const req = store.delete(draftId);

    req.onsuccess = () => resolve();
    req.onerror = (e) => {
      reject((e.target as IDBRequest).error || new Error("Lỗi khi xóa bản nháp"));
    };
  });
};
