/**
 * Tests for 100% Comprehensive Elimination of Accent-Stripping
 * and Complete Translation Coverage on the Friends and Community Screens.
 * Specifically validates the 4 areas highlighted in user's screenshot:
 * 1. "Lời mời & Gợi ý" -> "Requests & Suggestions"
 * 2. "GreenSpot Mạng Xã Hội Xanh" -> "GreenSpot Green Social Network"
 * 3. "🌱 Gợi ý công dân xanh" -> "🌱 Green Citizen Suggestions" (NOT "Goi y Green Citizen")
 * 4. "Đang tải danh sách lời mời..." -> "Loading friend requests..." (NOT "Dang tai List loi moi...")
 * 5. "Đang tìm kiếm gợi ý công dân xanh..." -> "Searching for Green Citizen suggestions..." (NOT "Dang Search goi y Green Citizen...")
 * 6. Lossless restoration back to authentic Vietnamese when switched to "VI".
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  translateString,
  applyDOMTranslation,
  setGlobalPageLanguage,
} from "../domTranslator";

describe("Community & Friends 100% UI Translation (Anti-Accent-Stripping)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("dịch hoàn toàn sang tiếng Anh chuẩn, KHÔNG BAO GIỜ bị mất dấu thành tiếng Việt không dấu", () => {
    const criticalCases = [
      {
        vi: "Lời mời & Gợi ý",
        en: "Requests & Suggestions",
        forbiddenBadTranslations: ["Loi moi & Goi y", "Lời mời & Goi y"],
      },
      {
        vi: "Bạn bè & Theo dõi",
        en: "Friends & Following",
        forbiddenBadTranslations: ["Ban be & Theo doi"],
      },
      {
        vi: "GreenSpot Mạng Xã Hội Xanh",
        en: "GreenSpot Green Social Network",
        forbiddenBadTranslations: ["GreenSpot Mang Xa Hoi Xanh"],
      },
      {
        vi: "🌱 Gợi ý công dân xanh",
        en: "🌱 Green Citizen Suggestions",
        forbiddenBadTranslations: [
          "🌱 Goi y Green Citizen",
          "Goi y Green Citizen",
          "🌱 Goi y cong dan xanh",
        ],
      },
      {
        vi: "Gợi ý công dân xanh",
        en: "Green Citizen Suggestions",
        forbiddenBadTranslations: [
          "Goi y Green Citizen",
          "Goi y cong dan xanh",
        ],
      },
      {
        vi: "Đang tải danh sách lời mời...",
        en: "Loading friend requests...",
        forbiddenBadTranslations: [
          "Dang tai List loi moi...",
          "Dang tai danh sach loi moi...",
        ],
      },
      {
        vi: "Đang tìm kiếm gợi ý công dân xanh...",
        en: "Searching for Green Citizen suggestions...",
        forbiddenBadTranslations: [
          "Dang Search goi y Green Citizen...",
          "Dang tim kiem goi y cong dan xanh...",
        ],
      },
      {
        vi: "Hiện không có lời mời kết bạn nào đang chờ phản hồi.",
        en: "No pending friend requests at this time.",
        forbiddenBadTranslations: [
          "Hien khong co loi moi ket ban nao dang cho phan hoi.",
        ],
      },
      {
        vi: "Chưa có thêm gợi ý mới tại khu vực của bạn.",
        en: "No new suggestions in your area yet.",
        forbiddenBadTranslations: [
          "Chua co them goi y moi tai khu vuc cua ban.",
        ],
      },
      {
        vi: "Bạn không có thông báo mới",
        en: "You have no new notifications",
        forbiddenBadTranslations: ["Ban khong co thong bao moi"],
      },
      {
        vi: "Thông báo tương tác",
        en: "Interaction Notifications",
        forbiddenBadTranslations: ["Thong bao tuong tac"],
      },
      {
        vi: "Công Dân Xanh",
        en: "Green Citizen",
        forbiddenBadTranslations: ["Cong Dan Xanh"],
      },
      {
        vi: "Thành viên cộng đồng xanh",
        en: "Green Community Member",
        forbiddenBadTranslations: ["Thanh vien cong dong xanh"],
      },
      {
        vi: "Bạn chưa có người bạn nào trong danh sách.",
        en: "You do not have any friends in your list.",
        forbiddenBadTranslations: [
          "Ban chua co nguoi ban nao trong danh sach.",
        ],
      },
      {
        vi: "Bạn chưa theo dõi công dân xanh nào.",
        en: "You are not following any green citizens.",
        forbiddenBadTranslations: [
          "Ban chua theo doi cong dan xanh nao.",
        ],
      },
      {
        vi: "Tìm kiếm bạn bè theo họ tên hoặc quận/huyện...",
        en: "Search friends by name or district...",
        forbiddenBadTranslations: [
          "Tim kiem ban be theo ho ten hoac quan/huyen...",
        ],
      },
    ];

    for (const { vi, en, forbiddenBadTranslations } of criticalCases) {
      const translated = translateString(vi, "EN");
      expect(translated).toBe(en);

      // Tuyệt đối không được bằng bất kỳ biến thể bỏ dấu nào
      for (const bad of forbiddenBadTranslations) {
        expect(translated).not.toBe(bad);
      }

      // Tuyệt đối không được chứa ký tự tiếng Việt có dấu nào còn sót lại
      expect(/[\u00C0-\u1EF9]/i.test(translated)).toBe(false);
    }
  });

  it("chuyển đổi qua lại giữa EN và VI mượt mà 100% trên cấu trúc DOM của màn hình Friends", () => {
    document.body.innerHTML = `
      <div class="friends-page-wrapper">
        <header class="friends-header">
          <div class="brand-text">GreenSpot Mạng Xã Hội Xanh</div>
          <button class="nav-tab active">
            <span>📩</span>
            <span>Lời mời & Gợi ý</span>
          </button>
          <button class="nav-tab">
            <span>👥</span>
            <span>Bạn bè & Theo dõi</span>
          </button>
        </header>

        <div class="two-column-layout">
          <div class="left-col">
            <h2>📩 Lời mời kết bạn</h2>
            <div class="notice">Đang tải danh sách lời mời...</div>
          </div>
          <div class="right-col">
            <h2>🌱 Gợi ý công dân xanh</h2>
            <div class="notice">Đang tìm kiếm gợi ý công dân xanh...</div>
          </div>
        </div>

        <input placeholder="Tìm kiếm bạn bè theo họ tên hoặc quận/huyện..." />
      </div>
    `;

    // 1. Chuyển sang tiếng Anh
    setGlobalPageLanguage("EN");

    const brand = document.querySelector(".brand-text")?.textContent;
    expect(brand).toBe("GreenSpot Green Social Network");

    const navTabs = document.querySelectorAll(".nav-tab span:last-child");
    expect(navTabs[0]?.textContent).toBe("Requests & Suggestions");
    expect(navTabs[1]?.textContent).toBe("Friends & Following");

    const leftTitle = document.querySelector(".left-col h2")?.textContent;
    expect(leftTitle).toBe("📩 Friend Requests");

    const leftNotice = document.querySelector(".left-col .notice")?.textContent;
    expect(leftNotice).toBe("Loading friend requests...");

    const rightTitle = document.querySelector(".right-col h2")?.textContent;
    expect(rightTitle).toBe("🌱 Green Citizen Suggestions");

    const rightNotice = document.querySelector(".right-col .notice")?.textContent;
    expect(rightNotice).toBe("Searching for Green Citizen suggestions...");

    const inputPlaceholder = (document.querySelector("input") as HTMLInputElement)?.placeholder;
    expect(inputPlaceholder).toBe("Search friends by name or district...");

    // 2. Chuyển ngược lại về tiếng Việt
    setGlobalPageLanguage("VI");

    expect(document.querySelector(".brand-text")?.textContent).toBe("GreenSpot Mạng Xã Hội Xanh");
    expect(navTabs[0]?.textContent).toBe("Lời mời & Gợi ý");
    expect(navTabs[1]?.textContent).toBe("Bạn bè & Theo dõi");
    expect(document.querySelector(".left-col h2")?.textContent).toBe("📩 Lời mời kết bạn");
    expect(document.querySelector(".left-col .notice")?.textContent).toBe("Đang tải danh sách lời mời...");
    expect(document.querySelector(".right-col h2")?.textContent).toBe("🌱 Gợi ý công dân xanh");
    expect(document.querySelector(".right-col .notice")?.textContent).toBe("Đang tìm kiếm gợi ý công dân xanh...");
    expect((document.querySelector("input") as HTMLInputElement)?.placeholder).toBe(
      "Tìm kiếm bạn bè theo họ tên hoặc quận/huyện..."
    );
  });
});
