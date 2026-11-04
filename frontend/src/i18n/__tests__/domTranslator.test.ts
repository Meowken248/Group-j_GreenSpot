// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  translateString,
  applyDOMTranslation,
  setGlobalPageLanguage,
  triggerGoogleTranslate,
} from "../domTranslator";

describe("domTranslator: Full-Page Auto-Translation & Dynamic Observer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    setGlobalPageLanguage("VI");
  });

  it("dịch chính xác các cụm từ nghiệp vụ pháp lý và môi trường", () => {
    expect(
      translateString("Cẩm Nang Pháp Lý & Xử Phạt Vi Phạm Môi Trường", "EN")
    ).toBe("Environmental Legal Handbook & Penalty Regulations");

    expect(translateString("TÌM KIẾM QUY ĐỊNH", "EN")).toBe("SEARCH REGULATIONS");
    expect(translateString("LĨNH VỰC MÔI TRƯỜNG", "EN")).toBe("ENVIRONMENTAL SECTORS");
    expect(translateString("Rác thải sinh hoạt", "EN")).toBe("Domestic Waste");
    expect(translateString("Rác công nghiệp/nguy hại", "EN")).toBe("Industrial / Hazardous Waste");
  });

  it("dịch chính xác các cụm từ cứu hộ ngập lụt Flood SOS và các mẫu regex động", () => {
    expect(translateString("CỨU HỘ NGẬP LỤT (FLOOD SOS)", "EN")).toBe("FLOOD RESCUE (FLOOD SOS)");
    expect(translateString("TÌNH HUỐNG", "EN")).toBe("SITUATION");
    expect(translateString("VỊ TRÍ", "EN")).toBe("LOCATION");
    expect(translateString("GỬI", "EN")).toBe("SUBMIT & DISPATCH");
    expect(translateString("🆘 GỬI SOS", "EN")).toBe("🆘 SEND SOS");
    expect(translateString("3 người", "EN")).toBe("3 people");
    expect(translateString("1 người", "EN")).toBe("1 person");
    expect(translateString("Tọa độ: 10.851957, 106.757911", "EN")).toBe("Coordinates: 10.851957, 106.757911");
    expect(translateString("Bán kính 3km", "EN")).toBe("3km Radius");
  });

  it("dịch chính xác các cụm từ điều phối lệnh tác nghiệp Dispatch (STT 43) và thông tin đội cứu hộ", () => {
    expect(translateString("MÃ", "EN")).toBe("CODE");
    expect(translateString("LỆNH XỬ LÝ", "EN")).toBe("PROCESSING ORDER");
    expect(translateString("Đội Cơ động số 3", "EN")).toBe("Mobile Team No. 3");
    expect(translateString("Đội Thoát Nước Thủ Đức", "EN")).toBe("Thu Duc Drainage Team");
    expect(translateString("Đội MTĐT District 8", "EN")).toBe("Urban Environment Team District 8");
    expect(translateString("Khẩn cấp / Hỏa tốc", "EN")).toBe("Critical / Emergency / Urgent");
    expect(translateString("Đã giao", "EN")).toBe("Delivered");
    expect(translateString("Đang đến", "EN")).toBe("Coming");
    expect(
      translateString("Điểm ngập úng sâu 50cm giao lộ Nguyễn Văn Quá", "EN")
    ).toBe("Flood Point 50cm deep at Nguyen Van Qua intersection");
  });

  it("quét toàn bộ DOM và chuyển đổi toàn bộ trang web sang tiếng Anh", () => {
    document.body.innerHTML = `
      <div id="test-root">
        <h1 class="title">Cẩm Nang Pháp Lý & Xử Phạt Vi Phạm Môi Trường</h1>
        <p class="desc">Căn cứ: Nghị định 45/2022/NĐ-CP</p>
        <div class="card">
          <h3>Rác thải sinh hoạt</h3>
          <span>Tra cứu ngay →</span>
        </div>
        <input type="text" placeholder="Nhập hành vi (VD: vứt tàn thuốc, đổ rác vỉa hè...)" />
      </div>
    `;

    applyDOMTranslation(document.body, "EN");

    const title = document.querySelector(".title");
    const desc = document.querySelector(".desc");
    const h3 = document.querySelector("h3");
    const arrow = document.querySelector(".card span");
    const input = document.querySelector("input");

    expect(title?.textContent).toBe("Environmental Legal Handbook & Penalty Regulations");
    expect(desc?.textContent).toBe("Basis: Decree 45/2022/ND-CP");
    expect(h3?.textContent).toBe("Domestic Waste");
    expect(arrow?.textContent).toBe("Inspect Now →");
    expect(input?.placeholder).toBe("Enter behavior (e.g. littering, illegal dumping...)");
  });

  it("dịch cả form input value và textarea value cho màn Flood SOS", () => {
    document.body.innerHTML = `
      <div id="sos-root">
        <h3>TÌNH HUỐNG</h3>
        <input id="name" type="text" value="Người dân vùng ngập" />
        <textarea id="desc">Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp</textarea>
      </div>
    `;

    applyDOMTranslation(document.body, "EN");

    const nameInput = document.querySelector("#name") as HTMLInputElement;
    const descTextarea = document.querySelector("#desc") as HTMLTextAreaElement;

    expect(nameInput.value).toBe("Flooded Area Resident");
    expect(descTextarea.value).toBe(
      "Chest-deep water, power outage, ceiling about to submerge, life buoys urgently needed"
    );
  });

  it("khôi phục 100% nguyên trạng tiếng Việt khi chuyển đổi ngược về VI", () => {
    document.body.innerHTML = `
      <div id="test-root">
        <h1 class="title">Cẩm Nang Pháp Lý & Xử Phạt Vi Phạm Môi Trường</h1>
      </div>
    `;

    // 1. Sang EN
    applyDOMTranslation(document.body, "EN");
    expect(document.querySelector(".title")?.textContent).toBe(
      "Environmental Legal Handbook & Penalty Regulations"
    );

    // 2. Về lại VI
    applyDOMTranslation(document.body, "VI");
    expect(document.querySelector(".title")?.textContent).toBe(
      "Cẩm Nang Pháp Lý & Xử Phạt Vi Phạm Môi Trường"
    );
  });

  it("dịch triệt để các địa chỉ và sự cố phức hợp không còn bất kỳ ký tự tiếng Việt nào", () => {
    const testCases = [
      "Flood Point sâu 50cm giao lộ Nguyễn Văn Quá",
      "Flooding đường Tô Ngọc Vân",
      "Illegal Dump Site Kênh Đôi",
      "Ùn ứ Domestic Waste chợ Bà Chiểu",
      "Điểm nghẽn cống đường Nguyễn Hữu Cảnh",
      "Ngã tư Nguyễn Văn Quá - Tô Ký, Quận 12",
      "Đường Tô Ngọc Vân, Phường Linh Tây, TP. Thủ Đức",
      "Bờ kè Kênh Đôi, Phường 4, District 8",
      "Chợ Bà Chiểu, Phường 1, Quận Bình Thạnh",
      "22 Nguyễn Hữu Cảnh, Phường Bến Nghé, Quận 1",
      "Đội Cơ động số 3",
      "Đội Thoát Nước Thủ Đức",
      "Đội MTĐT District 8",
      "Đội Flood Rescue Bình Thạnh",
      "Đội Môi trường đô thị Quận 1",
      "Hỏa tốc",
      "Cao",
    ];

    for (const phrase of testCases) {
      const translated = translateString(phrase, "EN");
      // Phải chuyển đổi sạch sẽ, không còn nguyên gốc tiếng Việt
      expect(translated).not.toBe(phrase);
      // Không còn sót lại bất kỳ dấu thanh tiếng Việt nào
      expect(/[\u00C0-\u1EF9]/i.test(translated)).toBe(false);
    }
  });

  it("xóa sạch các thành phần Google Translate toolbar thừa đảm bảo giao diện sạch sẽ", () => {
    expect(() => triggerGoogleTranslate("EN")).not.toThrow();
    expect(() => triggerGoogleTranslate("VI")).not.toThrow();
  });
});
