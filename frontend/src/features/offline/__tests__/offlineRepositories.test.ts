import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueueReport,
  listUserQueue,
  getQueueItemById,
  updateQueueItemStatus,
  deleteQueueItem,
  getQueueStatistics,
  MAX_QUEUE_CAPACITY,
} from "../services/outboxQueueRepository";
import {
  saveDraftToDb,
  listUserDrafts,
  getDraftById,
  deleteDraftFromDb,
} from "../services/draftRepository";
import { syncOutboxQueue } from "../services/syncEngine";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";

// Mock IndexedDB in-memory store for Vitest environment
class MockIDBStore {
  data = new Map<string, any>();
  put(val: any) {
    const key = val.draft_id || val.queue_id;
    this.data.set(key, val);
    const req: any = { onsuccess: null, onerror: null };
    setTimeout(() => {
      req.result = key;
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }
  get(key: string) {
    const req: any = { onsuccess: null, onerror: null };
    setTimeout(() => {
      req.result = this.data.get(key) || null;
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }
  delete(key: string) {
    this.data.delete(key);
    const req: any = { onsuccess: null, onerror: null };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }
  index(indexName: string) {
    const validIndices = ["by_user_id", "by_status", "by_created_at", "by_updated_at"];
    if (!validIndices.includes(indexName)) {
      throw new DOMException(
        `Failed to execute 'index' on 'IDBObjectStore': The specified index '${indexName}' was not found.`,
        "NotFoundError"
      );
    }
    return {
      getAll: (userId: string) => {
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => {
          const matched = Array.from(this.data.values()).filter(
            (item: any) => item.user_id === userId
          );
          req.result = matched;
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req;
      },
    };
  }
}

const mockDraftsStore = new MockIDBStore();
const mockQueueStore = new MockIDBStore();

const mockDB = {
  transaction: (storeName: string) => {
    return {
      objectStore: () => {
        if (storeName === "drafts") return mockDraftsStore;
        return mockQueueStore;
      },
    };
  },
};

vi.mock("../services/offlineDb", () => ({
  openOfflineDatabase: () => Promise.resolve(mockDB),
  getCurrentUserId: () => "user_test_uuid_123",
  isQuotaError: () => false,
  STORES: {
    DRAFTS: "drafts",
    OUTBOX_QUEUE: "outbox_queue",
    CACHED_CATEGORIES: "cached_categories",
  },
}));

describe("Offline Repositories & Sync Engine Suite (STT 19)", () => {
  beforeEach(() => {
    mockDraftsStore.data.clear();
    mockQueueStore.data.clear();
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, "mock_valid_token_xyz");
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  describe("1. Draft Repository (Bản nháp đa phương tiện)", () => {
    it("lưu và đọc bản nháp thành công kèm tệp Blob", async () => {
      const mockBlob = new Blob(["sample audio bytes"], { type: "audio/webm" });
      const draft = {
        draft_id: "draft_001",
        user_id: "user_test_uuid_123",
        title: "Bãi rác tự phát đường số 7",
        formData: {
          category_id: 1,
          category_code: "RAC_SINH_HOAT",
          category_name: "Rác sinh hoạt",
          title: "Bãi rác tự phát đường số 7",
          description: "Mô tả bãi rác tự phát",
          severity: "MEDIUM" as const,
          media: [],
          location: null,
          is_anonymous: false,
        },
        media_blobs: [],
        voice_blob: mockBlob,
        saved_at: new Date().toISOString(),
        current_step: 3 as const,
        updated_at: Date.now(),
      };

      await saveDraftToDb(draft);
      const loaded = await getDraftById("draft_001");

      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe("Bãi rác tự phát đường số 7");
      expect(loaded?.voice_blob).toBeDefined();
    });

    it("tách biệt bản nháp giữa các tài khoản khác nhau (R18)", async () => {
      const draftA = {
        draft_id: "draft_user_a",
        user_id: "user_test_uuid_123",
        title: "Nháp của User A",
        formData: {} as any,
        media_blobs: [],
        saved_at: new Date().toISOString(),
        current_step: 1 as const,
        updated_at: 100,
      };
      const draftB = {
        draft_id: "draft_user_b",
        user_id: "other_user_456",
        title: "Nháp của User B",
        formData: {} as any,
        media_blobs: [],
        saved_at: new Date().toISOString(),
        current_step: 1 as const,
        updated_at: 200,
      };

      await saveDraftToDb(draftA);
      await saveDraftToDb(draftB);

      // User A chỉ lấy danh sách của mình
      const listA = await listUserDrafts("user_test_uuid_123");
      expect(listA.length).toBe(1);
      expect(listA[0].draft_id).toBe("draft_user_a");

      // User A không thể đọc trộm chi tiết nháp của User B
      const forbidden = await getDraftById("draft_user_b");
      expect(forbidden).toBeNull();
    });

    it("xóa bản nháp thành công", async () => {
      const draft = {
        draft_id: "draft_to_delete",
        user_id: "user_test_uuid_123",
        title: "Nháp cần xóa",
        formData: {} as any,
        media_blobs: [],
        saved_at: new Date().toISOString(),
        current_step: 1 as const,
        updated_at: Date.now(),
      };
      await saveDraftToDb(draft);
      await deleteDraftFromDb("draft_to_delete");
      const loaded = await getDraftById("draft_to_delete");
      expect(loaded).toBeNull();
    });
  });

  describe("2. Outbox Queue Repository (Hàng đợi gửi)", () => {
    it("đưa phản ánh vào hàng đợi với trạng thái QUEUED và max_retries = 3", async () => {
      const item = await enqueueReport({
        client_submission_id: "sub_1234567890",
        idempotency_key: "key_1234567890",
        user_id: "user_test_uuid_123",
        title: "Ô nhiễm kênh Nhiêu Lộc",
        category_id: 2,
        category_name: "Ô nhiễm nước",
        description: "Nước đen ngòm bốc mùi",
        severity: "HIGH",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Kênh Nhiêu Lộc, Q.3",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      expect(item.queue_id).toBeDefined();
      expect(item.status).toBe("QUEUED");
      expect(item.retry_count).toBe(0);
      expect(item.max_retries).toBe(3);
    });

    it("chặn không cho thêm vượt quá 20 phản ánh vào hàng đợi (R09)", async () => {
      // Giả lập nạp đầy 20 mục
      for (let i = 0; i < MAX_QUEUE_CAPACITY; i++) {
        await enqueueReport({
          client_submission_id: `sub_${i}_123456789`,
          idempotency_key: `key_${i}_123456789`,
          user_id: "user_test_uuid_123",
          title: `Phản ánh số ${i + 1}`,
          category_id: 1,
          category_name: "Rác",
          description: "Mô tả",
          severity: "MEDIUM",
          latitude: 10.78,
          longitude: 106.68,
          address_text: "TP.HCM",
          is_anonymous: false,
          media_blobs: [],
          voice_blob: null,
        });
      }

      const queue = await listUserQueue("user_test_uuid_123");
      expect(queue.length).toBe(20);

      // Thêm mục thứ 21 phải ném lỗi
      await expect(
        enqueueReport({
          client_submission_id: "sub_21_overflow_item",
          idempotency_key: "key_21_overflow_item",
          user_id: "user_test_uuid_123",
          title: "Mục thứ 21",
          category_id: 1,
          category_name: "Rác",
          description: "Mô tả",
          severity: "MEDIUM",
          latitude: 10.78,
          longitude: 106.68,
          address_text: "TP.HCM",
          is_anonymous: false,
          media_blobs: [],
          voice_blob: null,
        })
      ).rejects.toThrow(/đạt dung lượng tối đa/);
    });

    it("sắp xếp hàng đợi theo thứ tự FIFO cũ nhất lên trước (R13)", async () => {
      const now = Date.now();
      const item1 = await enqueueReport({
        client_submission_id: "sub_first_item_11",
        idempotency_key: "key_first_item_11",
        user_id: "user_test_uuid_123",
        title: "Mục gửi đầu tiên",
        category_id: 1,
        category_name: "Rác",
        description: "Mô tả 1",
        severity: "LOW",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Địa chỉ 1",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      const item2 = await enqueueReport({
        client_submission_id: "sub_second_item_22",
        idempotency_key: "key_second_item_22",
        user_id: "user_test_uuid_123",
        title: "Mục gửi thứ hai",
        category_id: 1,
        category_name: "Rác",
        description: "Mô tả 2",
        severity: "LOW",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Địa chỉ 2",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      const queue = await listUserQueue("user_test_uuid_123");
      expect(queue[0].title).toBe("Mục gửi đầu tiên");
      expect(queue[1].title).toBe("Mục gửi thứ hai");
    });

    it("chặn không cho xóa mục đang ở trạng thái SENDING (R15)", async () => {
      const item = await enqueueReport({
        client_submission_id: "sub_sending_check",
        idempotency_key: "key_sending_check",
        user_id: "user_test_uuid_123",
        title: "Mục đang gửi",
        category_id: 1,
        category_name: "Rác",
        description: "Mô tả",
        severity: "LOW",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Địa chỉ",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      await updateQueueItemStatus(item.queue_id, { status: "SENDING" });

      await expect(deleteQueueItem(item.queue_id)).rejects.toThrow(
        /Không thể xóa phản ánh khi đang trong tiến trình gửi/
      );
    });

    it("tính toán thống kê hàng đợi chính xác (R17)", async () => {
      const item1 = await enqueueReport({
        client_submission_id: "sub_stat_1",
        idempotency_key: "key_stat_1",
        user_id: "user_test_uuid_123",
        title: "Mục 1",
        category_id: 1,
        category_name: "Rác",
        description: "Mô tả",
        severity: "LOW",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Địa chỉ",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      const item2 = await enqueueReport({
        client_submission_id: "sub_stat_2",
        idempotency_key: "key_stat_2",
        user_id: "user_test_uuid_123",
        title: "Mục 2",
        category_id: 1,
        category_name: "Rác",
        description: "Mô tả",
        severity: "LOW",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Địa chỉ",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      await updateQueueItemStatus(item2.queue_id, { status: "FAILED" });

      const stats = await getQueueStatistics("user_test_uuid_123");
      expect(stats.pending_count).toBe(1);
      expect(stats.failed_count).toBe(1);
      expect(stats.sending_count).toBe(0);
    });
  });

  describe("3. Sync Engine (Tự động đồng bộ & Xử lý lỗi)", () => {
    it("đồng bộ thành công và tự động giải phóng mục khỏi hàng đợi (R24)", async () => {
      const item = await enqueueReport({
        client_submission_id: "sub_sync_success",
        idempotency_key: "key_sync_success",
        user_id: "user_test_uuid_123",
        title: "Mục đồng bộ thành công",
        category_id: 1,
        category_name: "Rác",
        description: "Mô tả",
        severity: "LOW",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Địa chỉ",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      // Mock fetch API thành công
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          tracking_code: "#INC-20261102-TEST1",
          incident_id: "inc_12345",
          points_awarded: 50,
        }),
      } as any);

      const summary = await syncOutboxQueue();
      expect(summary.success_count).toBe(1);
      expect(summary.failed_count).toBe(0);
      expect(summary.successful_incidents[0].code).toBe("#INC-20261102-TEST1");

      // Kiểm tra mục đã được giải phóng khỏi hàng đợi (R24)
      const queueAfter = await listUserQueue("user_test_uuid_123");
      expect(queueAfter.length).toBe(0);
    });

    it("chuyển sang FAILED và dừng thử lại khi lỗi nghiệp vụ 4xx (R14, R22)", async () => {
      const item = await enqueueReport({
        client_submission_id: "sub_sync_business_err",
        idempotency_key: "key_sync_business_err",
        user_id: "user_test_uuid_123",
        title: "Mục lỗi nghiệp vụ",
        category_id: 1,
        category_name: "Rác",
        description: "Mô tả",
        severity: "LOW",
        latitude: 10.78,
        longitude: 106.68,
        address_text: "Địa chỉ",
        is_anonymous: false,
        media_blobs: [],
        voice_blob: null,
      });

      // Mock fetch trả về 400 Bad Request
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Loại sự cố rác thải không hợp lệ hoặc đã đóng." }),
      } as any);

      const summary = await syncOutboxQueue();
      expect(summary.success_count).toBe(0);
      expect(summary.failed_count).toBe(1);

      const updatedItem = await getQueueItemById(item.queue_id);
      expect(updatedItem?.status).toBe("FAILED");
      expect(updatedItem?.last_error).toContain("Loại sự cố rác thải không hợp lệ");
    });
  });
});
