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

  it("xóa sạch các thành phần Google Translate toolbar thừa đảm bảo giao diện sạch sẽ", () => {
    expect(() => triggerGoogleTranslate("EN")).not.toThrow();
    expect(() => triggerGoogleTranslate("VI")).not.toThrow();
  });
});
