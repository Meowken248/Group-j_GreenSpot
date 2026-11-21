import { writeOffline } from "./offlineTransaction";
import { openOfflineDatabase, STORES, getCurrentUserId } from "./offlineDb";
import type { OfflineDraft } from "../types/offline.types";

/**
 * Lưu hoặc cập nhật bản nháp vào IndexedDB (hỗ trợ nhiều bản nháp & Blob tệp tin).
 */
export const saveDraftToDb = async (draft: OfflineDraft): Promise<void> => {
  const userId = getCurrentUserId();
  if (draft.user_id && draft.user_id !== userId) throw new Error("Tài khoản đã thay đổi. Vui lòng tải lại trang.");
  return writeOffline(STORES.DRAFTS, (store, done, fail) => {
    const request = store.get(draft.draft_id);
    request.onsuccess = () => {
      const current = request.result as OfflineDraft | undefined;
      if (current && current.user_id !== userId) { fail(new Error("Bạn không có quyền sửa bản nháp này.")); return; }
      store.put({...draft, user_id: userId, updated_at: Math.max(Date.now(), (current?.updated_at || 0) + 1)}).onsuccess = () => done(undefined);
    };
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
  const userId = getCurrentUserId();
  return writeOffline(STORES.DRAFTS, (store, done, fail) => {
    const request = store.get(draftId);
    request.onsuccess = () => {
      const current = request.result as OfflineDraft | undefined;
      if (!current || current.user_id !== userId) { fail(new Error("Bản nháp không còn tồn tại. Vui lòng tải lại danh sách.")); return; }
      store.delete(draftId).onsuccess = () => done(undefined);
    };
  });
};
