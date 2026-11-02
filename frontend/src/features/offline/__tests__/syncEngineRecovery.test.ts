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
import {
  subscribeSessionExpired,
  resetSessionExpired,
} from "../../auth/services/sessionManager";

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

let mockedActiveUserId = "test_user_recovery_123";

vi.mock("../services/offlineDb", () => ({
  openOfflineDatabase: () => Promise.resolve(mockDB),
  getCurrentUserId: () => mockedActiveUserId,
  isQuotaError: () => false,
  STORES: {
    DRAFTS: "drafts",
    OUTBOX_QUEUE: "outbox_queue",
    CACHED_CATEGORIES: "cached_categories",
  },
}));

describe("Sync Engine Retry & Stuck SENDING Recovery (Issue 4, 5, 9)", () => {
  beforeEach(() => {
    mockedActiveUserId = "test_user_recovery_123";
    mockDraftsStore.data.clear();
    mockQueueStore.data.clear();
    mockQueueStore.put = MockIDBStore.prototype.put.bind(mockQueueStore);
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
    mockQueueStore.put = MockIDBStore.prototype.put.bind(mockQueueStore);
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

  it("mở lại app trước 30 giây lập lịch đối soát tại thời điểm lease hết hạn (Issue 3 / Issue 5)", async () => {
    const item = await enqueueReport({
      client_submission_id: "sub_recent_sending",
      idempotency_key: "key_recent_sending",
      user_id: "test_user_recovery_123",
      title: "Mục vừa bị tắt trình duyệt 10 giây trước",
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

    // Vừa gửi cách đây 10 giây -> Còn 20 giây lease
    const tenSecondsAgo = Date.now() - 10000;
    await updateQueueItemStatus(item.queue_id, {
      status: "SENDING",
    });
    const raw = mockQueueStore.data.get(item.queue_id);
    raw.updated_at = tenSecondsAgo;
    mockQueueStore.data.set(item.queue_id, raw);

    let sendCalled = false;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/submissions/sub_recent_sending")) {
        return { ok: false, status: 404 };
      }
      sendCalled = true;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          tracking_code: "#INC-20261102-RECENT-RECOVERED",
          incident_id: "inc_recent",
          points_awarded: 50,
        }),
      };
    });

    // Lần đồng bộ đầu tiên khi mở lại ứng dụng: chưa đủ 30 giây lease -> Chưa gửi ngay
    const summaryFirst = await syncOutboxQueue();
    expect(summaryFirst.total).toBe(0);
    expect(sendCalled).toBe(false);

    // Thời gian trôi qua 21 giây (vượt qua mốc lease còn lại)
    await vi.advanceTimersByTimeAsync(21000);

    // Sau khi timer hết hạn lease kích hoạt -> Đối soát và gửi thành công
    expect(sendCalled).toBe(true);
    const queueAfter = await listUserQueue("test_user_recovery_123");
    expect(queueAfter.length).toBe(0);
  });

  it("ngừng đồng bộ ngay lập tức nếu người dùng đổi tài khoản trong khi đang gửi (Issue 3)", async () => {
    // Tạo 2 mục trong hàng đợi của user A
    await enqueueReport({
      client_submission_id: "sub_user_a_1",
      idempotency_key: "key_user_a_1",
      user_id: "test_user_recovery_123",
      title: "Phản ánh A1",
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

    await enqueueReport({
      client_submission_id: "sub_user_a_2",
      idempotency_key: "key_user_a_2",
      user_id: "test_user_recovery_123",
      title: "Phản ánh A2",
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

    const sentTitles: string[] = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (url.includes("/api/v1/offline-sync/incidents")) {
        const body = JSON.parse(opts.body);
        sentTitles.push(body.title);

        // Giả lập giữa chừng: người dùng đăng xuất hoặc chuyển sang user B
        mockedActiveUserId = "different_user_b";
        localStorage.setItem("greenspot_user", JSON.stringify({ user_id: "different_user_b" }));

        return {
          ok: true,
          status: 201,
          json: async () => ({
            tracking_code: `#INC-${body.client_submission_id}`,
            incident_id: "inc_x",
            points_awarded: 50,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const summary = await syncOutboxQueue();
    // Chỉ gửi được 1 mục đầu tiên, mục thứ 2 bị dừng lại để bảo vệ tài khoản
    expect(sentTitles).toEqual(["Phản ánh A1"]);
    expect(summary.success_count).toBe(1);

    // Mục thứ 2 vẫn an toàn trong hàng đợi của User A
    const queueA = await listUserQueue("test_user_recovery_123");
    expect(queueA.some((i) => i.title === "Phản ánh A2")).toBe(true);
  });

  it("ngừng và hoàn trả QUEUED ngay lập tức nếu đổi tài khoản sau khi đánh dấu SENDING (Issue 3)", async () => {
    const item = await enqueueReport({
      client_submission_id: "sub_user_switch_async",
      idempotency_key: "key_user_switch_async",
      user_id: "test_user_recovery_123",
      title: "Phản ánh user A bị đổi lúc cập nhật",
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

    const originalPut = mockQueueStore.put.bind(mockQueueStore);
    try {
      // Can thiệp put: khi status được đổi thành SENDING, ngay lập tức đổi active user thành user B
      mockQueueStore.put = (val: any) => {
        if (val.status === "SENDING") {
          mockedActiveUserId = "user_b_intruder";
        }
        return originalPut(val);
      };

      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      const summary = await syncOutboxQueue();
      // Fetch tuyệt đối không được gọi bằng token/quyền của user B
      expect(fetchMock).not.toHaveBeenCalled();
      expect(summary.success_count).toBe(0);

      // Chuyển lại tài khoản test_user_recovery_123 để đọc lại item theo đúng quyền sở hữu
      mockedActiveUserId = "test_user_recovery_123";
      const updated = await getQueueItemById(item.queue_id);
      expect(updated?.status).toBe("QUEUED");
    } finally {
      mockQueueStore.put = originalPut;
      mockedActiveUserId = "test_user_recovery_123";
    }
  });

  it("kích hoạt triggerSessionExpired và giữ QUEUED khi nhận 401 không thể làm mới (Issue 4)", async () => {
    resetSessionExpired();
    let sessionExpiredTriggered = false;
    const unsubscribe = subscribeSessionExpired(() => {
      sessionExpiredTriggered = true;
    });

    const item = await enqueueReport({
      client_submission_id: "sub_auth_401",
      idempotency_key: "key_auth_401",
      user_id: "test_user_recovery_123",
      title: "Phản ánh bị 401 hết phiên",
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

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/v1/auth/refresh")) {
        return { ok: false, status: 401 };
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ detail: "Token expired" }),
      };
    });

    const summary = await syncOutboxQueue();
    expect(summary.success_count).toBe(0);
    expect(sessionExpiredTriggered).toBe(true);

    const updated = await getQueueItemById(item.queue_id);
    expect(updated?.status).toBe("QUEUED");

    unsubscribe();
    resetSessionExpired();
  });
});
