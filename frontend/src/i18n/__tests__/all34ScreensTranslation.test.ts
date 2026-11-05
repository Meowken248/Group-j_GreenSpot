import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyDOMTranslation, translateString } from "../domTranslator";
import { APP_ROUTES } from "../../routes/appRoutes";

describe("Comprehensive Verification: All 34 GreenSpot Screens & Complex UI Modules", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("dịch chính xác nhãn tiêu đề của toàn bộ 34 màn hình trong hệ thống APP_ROUTES", () => {
    const routeKeys = Object.keys(APP_ROUTES) as Array<keyof typeof APP_ROUTES>;
    expect(routeKeys.length).toBe(34);

    routeKeys.forEach((key) => {
      const route = APP_ROUTES[key];
      const translated = translateString(route.label, "EN");
      // Phải có bản dịch tiếng Anh hợp lệ
      expect(translated).toBeTruthy();
      expect(typeof translated).toBe("string");
      // Tuyệt đối không được chứa ký tự tiếng Việt có dấu
      expect(/[\u00C0-\u1EF9]/i.test(translated)).toBe(false);
    });
  });

  it("dịch toàn diện màn hình Cứu Hộ Ngập Lụt (Flood SOS - STT 46) không sót bất kỳ phần tử nào", () => {
    document.body.innerHTML = `
      <div id="flood-sos-page">
        <h1>CỨU HỘ NGẬP LỤT (FLOOD SOS)</h1>
        <p class="subtitle">Mạng lưới Cứu hộ Cộng đồng & Phản ứng nhanh GreenSpot</p>
        <button class="btn-broadcast">Phát tín hiệu cấp cứu</button>
        
        <div class="card situation">
          <h3>TÌNH HUỐNG</h3>
          <label>Số người cần cứu *</label>
          <input id="victims" value="3" />
          <div class="demographics">
            <span>Người già</span>
            <span>Trẻ nhỏ</span>
            <span>Cần y tế gấp</span>
          </div>
          <label>Mô tả chi tiết tình trạng *</label>
          <textarea>Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp</textarea>
          <label>Ảnh chụp hiện trường</label>
          <label>Họ và tên người cần cứu</label>
          <input value="Người dân vùng ngập" />
        </div>

        <div class="card location">
          <h3>VỊ TRÍ</h3>
          <div class="badge">GPS TỰ ĐỘNG KẾT NỐI</div>
          <button>Dùng vị trí hiện tại</button>
          <label>Địa chỉ ước tính hoặc tự nhập *</label>
          <div class="address">Hẻm 42 Bến Phú Định, Phường 16, Quận 8, TP.HCM</div>
        </div>

        <div class="card dispatch">
          <h3>GỬI</h3>
          <div class="row"><span>Tổng số người:</span><span>3 người</span></div>
          <div class="row"><span>Ưu tiên cứu hộ:</span><span>Khẩn cấp (Nước dâng)</span></div>
          <div class="row"><span>Phạm vi phát sóng:</span><span>Bán kính 3km</span></div>
          <div class="row"><span>Kênh truyền:</span><span>WebSocket + FCM</span></div>
          <button class="btn-submit-sos">GỬI SOS - Bấm để xác nhận phát tín hiệu cấp cứu</button>
        </div>
      </div>
    `;

    applyDOMTranslation(document.body, "EN");

    // Tiêu đề và nhãn
    expect(document.querySelector("h1")?.textContent).toBe("FLOOD RESCUE (FLOOD SOS)");
    expect(document.querySelector(".btn-broadcast")?.textContent).toBe("Broadcast Emergency Signal");
    expect(document.querySelector(".situation h3")?.textContent).toBe("SITUATION");
    expect(document.querySelector(".location h3")?.textContent).toBe("LOCATION");
    expect(document.querySelector(".dispatch h3")?.textContent).toBe("SUBMIT & DISPATCH");

    // Form inputs & textareas
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe(
      "Chest-deep water, power outage, ceiling about to submerge, life buoys urgently needed"
    );

    const address = document.querySelector(".address")?.textContent;
    expect(address).toBe("Alley 42 Ben Phu Dinh, Ward 16, District 8, HCMC");

    // Toàn bộ trang không còn chữ tiếng Việt có dấu
    expect(/[\u00C0-\u1EF9]/i.test(document.body.textContent || "")).toBe(false);
  });

  it("dịch toàn diện màn hình Khảo Sát An Toàn (Safety Check & PCTT - STT 45)", () => {
    document.body.innerHTML = `
      <div id="safety-check-page">
        <header>
          <span class="brand">GreenSpot PCTT</span>
          <span class="committee">BAN CHỈ HUY PCTT & TKCN</span>
          <button>Phát lệnh Critical</button>
          <button>Safety Check</button>
          <button>Thử nghiệm cảnh báo</button>
        </header>

        <main>
          <div class="left-box">
            <h2>XÁC NHẬN AN TOÀN</h2>
            <p>Vị trí hiện tại của bạn đã được xác định. Hãy báo an toàn cho bạn bè.</p>
            <div class="gps-status">Vị trí GPS thời gian thực (Đã xác thực ✅)</div>
            <div class="gps-address">Đường An Dương Vương, Phường 3, Quận 5, TP.HCM</div>
            <button class="btn-safe">Tôi an toàn</button>
          </div>

          <div class="right-box">
            <h2>GỬI CHO BẠN BÈ</h2>
            <div class="contact-header">Danh bạ bạn bè (0)</div>
            <p class="empty-hint">Bạn chưa có người bạn nào trong danh bạ</p>
            <p class="sub-hint">Hãy kết nối bạn bè ở mục "Cộng đồng" để có thể gửi thông báo an toàn khi xảy ra thiên tai.</p>
            <button class="btn-connect">+ Đến trang Bạn bè & Theo dõi</button>
            <button class="btn-send-friends">Gửi cho bạn bè</button>
          </div>
        </main>
      </div>
    `;

    applyDOMTranslation(document.body, "EN");

    expect(document.querySelector(".committee")?.textContent).toBe(
      "DISASTER PREVENTION & RESCUE STEERING COMMITTEE"
    );
    expect(document.querySelector(".left-box h2")?.textContent).toBe("SAFETY CONFIRMATION");
    expect(document.querySelector(".btn-safe")?.textContent).toBe("I Am Safe");
    expect(document.querySelector(".right-box h2")?.textContent).toBe("SEND TO FRIENDS");
    expect(document.querySelector(".btn-send-friends")?.textContent).toBe("Send to Friends");

    // Tuyệt đối không còn xuất hiện lỗi sai cú pháp "SUBMIT & DISPATCH CHO" hay "Toi an toan" không dịch
    expect(document.body.textContent).not.toContain("SUBMIT & DISPATCH CHO");
    expect(document.body.textContent).not.toContain("Toi an toan");
    expect(/[\u00C0-\u1EF9]/i.test(document.body.textContent || "")).toBe(false);
  });

  it("dịch toàn diện bảng Điều Phối Tác Nghiệp Hiện Trường (Dispatch - STT 43)", () => {
    document.body.innerHTML = `
      <div id="dispatch-table">
        <h2>LỆNH ĐIỀU PHỐI (Tổng số: 5 lệnh)</h2>
        <table>
          <thead>
            <tr>
              <th>MÃ</th>
              <th>VẤN ĐỀ</th>
              <th>ĐỘI PHỤ TRÁCH</th>
              <th>CẤP ĐỘ</th>
              <th>TRẠNG THÁI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>LX-1044</td>
              <td>Điểm ngập sâu 50cm giao lộ Nguyễn Văn Quá - Tô Ký, Quận 12</td>
              <td>Đội Cơ động số 3 - 0903.778.899</td>
              <td><span class="badge red">Khẩn cấp / Hỏa tốc</span></td>
              <td>Đã giao lệnh</td>
            </tr>
            <tr>
              <td>LX-1043</td>
              <td>Ngập lụt đường Tô Ngọc Vân, Phường Linh Tây, TP. Thủ Đức</td>
              <td>Đội Thoát Nước Thủ Đức - 0918.445.566</td>
              <td><span class="badge red">Khẩn cấp / Hỏa tốc</span></td>
              <td>Đang đến</td>
            </tr>
            <tr>
              <td>LX-1042</td>
              <td>Bãi rác tự phát Kênh Đôi, Bờ kè Kênh Đôi, Phường 4, Quận 8</td>
              <td>Đội MTĐT District 8 - 0912.112.233</td>
              <td><span class="badge yellow">Cao</span></td>
              <td>Đang xử lý</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    applyDOMTranslation(document.body, "EN");

    const ths = Array.from(document.querySelectorAll("th")).map((th) => th.textContent);
    expect(ths).toEqual(["CODE", "PROBLEM", "TEAM IN CHARGE", "LEVEL", "STATUS"]);

    expect(document.body.textContent).toContain("Mobile Team No. 3");
    expect(document.body.textContent).toContain("Thu Duc Drainage Team");
    expect(document.body.textContent).toContain("Illegal Dump Site Kenh Doi");
    expect(document.body.textContent).toContain("In Progress");

    expect(/[\u00C0-\u1EF9]/i.test(document.body.textContent || "")).toBe(false);
  });
});
