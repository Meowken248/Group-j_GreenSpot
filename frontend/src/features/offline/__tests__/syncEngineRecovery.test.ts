import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  enqueueReport,
  listUserQueue,
  updateQueueItemStatus,
  getQueueItemById,
} from "../services/outboxQueueRepository";
import {
  syncOutboxQueue,
  resetAllFailedQueueItems,
} from "../services/syncEngine";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";

// In-memory Mock IDB store for Vitest
class MockIDBStore {
  data = new Map<string, any>();
  put(val: any) {
    const key = val.draft_id || val.queue_id;
    this.data.set(key, val);
    const req: any = { onsuccess: null, onerror: null };
    queueMicrotask(() => {
      req.result = key;
      if (req.onsuccess) req.onsuccess({ target: req });
    });
    return req;
  }
  get(key: string) {
    const req: any = { onsuccess: null, onerror: null };
    queueMicrotask(() => {
      req.result = this.data.get(key) || null;
      if (req.onsuccess) req.onsuccess({ target: req });
    });
    return req;
  }
  delete(key: string) {
    this.data.delete(key);
    const req: any = { onsuccess: null, onerror: null };
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    });
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
        queueMicrotask(() => {
          const matched = Array.from(this.data.values()).filter(
            (item: any) => item.user_id === userId
          );
          req.result = matched;
          if (req.onsuccess) req.onsuccess({ target: req });
        });
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
  getCurrentUserId: () => "test_user_recovery_123",
  isQuotaError: () => false,
  STORES: {
    DRAFTS: "drafts",
    OUTBOX_QUEUE: "outbox_queue",
    CACHED_CATEGORIES: "cached_categories",
  },
}));

describe("Sync Engine Retry & Stuck SENDING Recovery (Issue 4, 5, 9)", () => {
  beforeEach(() => {
    mockDraftsStore.data.clear();
    mockQueueStore.data.clear();
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, "valid_test_token_abc");
    vi.useFakeTimers();
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("tuân thủ next_retry_at: không gửi mục khi chưa tới hạn thử lại (Issue 4)", async () => {
    const item = await enqueueReport({
      client_submission_id: "sub_retry_delayed",
      idempotency_key: "key_retry_delayed",
      user_id: "test_user_recovery_123",
      title: "Mục đang giãn cách retry",
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

    // Giả lập mục đã bị lỗi 1 lần, next_retry_at là 2000ms sau
    const futureTime = Date.now() + 2000;
    await updateQueueItemStatus(item.queue_id, {
      status: "QUEUED",
      retry_count: 1,
      next_retry_at: futureTime,
    });

    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Gọi đồng bộ ngay lập tức -> candidateItems = 0 vì chưa tới hạn
    const summary = await syncOutboxQueue();
    expect(summary.total).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();

    // Tua nhanh 2000ms tới hạn -> bộ lập lịch kích hoạt và gửi
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        tracking_code: "#INC-20261102-RETRY",
        incident_id: "inc_retry_ok",
        points_awarded: 50,
      }),
    });

    await vi.advanceTimersByTimeAsync(2100);

    const queueAfter = await listUserQueue("test_user_recovery_123");
    expect(queueAfter.length).toBe(0); // Đã gửi thành công và giải phóng
  });

  it("phục hồi mục bị kẹt ở trạng thái SENDING do đóng tab (Issue 5)", async () => {
    const item = await enqueueReport({
      client_submission_id: "sub_stuck_sending",
      idempotency_key: "key_stuck_sending",
      user_id: "test_user_recovery_123",
      title: "Mục bị kẹt do tắt trình duyệt",
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

    // Giả lập trạng thái SENDING từ 40 giây trước (quá lease 30s)
    const oldTime = Date.now() - 40000;
    await updateQueueItemStatus(item.queue_id, {
      status: "SENDING",
    });
    // Can thiệp updated_at trong mock store để giả lập thời điểm quá khứ
    const raw = mockQueueStore.data.get(item.queue_id);
    raw.updated_at = oldTime;
    mockQueueStore.data.set(item.queue_id, raw);

    // Giả lập server kiểm tra: chưa nhận được biên nhận (404)
    // Sau đó gửi POST thành công
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/submissions/sub_stuck_sending")) {
        return { ok: false, status: 404 };
      }
      return {
        ok: true,
        status: 201,
        json: async () => ({
          tracking_code: "#INC-20261102-RECOVERED",
          incident_id: "inc_rec",
          points_awarded: 50,
        }),
      };
    });

    const summary = await syncOutboxQueue();
    expect(summary.success_count).toBe(1);
    expect(summary.successful_incidents[0].code).toBe("#INC-20261102-RECOVERED");

    const queueAfter = await listUserQueue("test_user_recovery_123");
    expect(queueAfter.length).toBe(0);
  });

  it("reset toàn bộ mục FAILED về QUEUED khi người dùng yêu cầu thử lại (Issue 9)", async () => {
    const item = await enqueueReport({
      client_submission_id: "sub_failed_item",
      idempotency_key: "key_failed_item",
      user_id: "test_user_recovery_123",
      title: "Mục đã bị thất bại",
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

    await updateQueueItemStatus(item.queue_id, { status: "FAILED", retry_count: 3 });

    await resetAllFailedQueueItems();

    const updated = await getQueueItemById(item.queue_id);
    expect(updated?.status).toBe("QUEUED");
    expect(updated?.retry_count).toBe(0);
  });
});
