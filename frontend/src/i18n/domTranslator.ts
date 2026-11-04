/**
 * Global Full-Page DOM Auto-Translation Engine
 * Automatically translates the entire web page (all text nodes, placeholders, tooltips)
 * and continuously observes for any new data added dynamically via MutationObserver.
 */

import api from "../api/client";

// Dictionary of domain phrases and UI patterns (sorted by length descending for accurate greedy matching)
export const DOM_TRANSLATION_MAP: Record<string, string> = {
  // 1. Legal & Penalties (Chức năng 11)
  "Cẩm Nang Pháp Lý & Xử Phạt Vi Phạm Môi Trường": "Environmental Legal Handbook & Penalty Regulations",
  "Hệ thống pháp luật môi trường": "Environmental Legal Framework",
  "Tra cứu quy định xử phạt": "Penalty Regulations Lookup",
  "Căn cứ: Nghị định 45/2022/NĐ-CP": "Basis: Decree 45/2022/ND-CP",
  "Cung cấp thông tin chuẩn xác, minh bạch về các khung hình phạt, chế tài xử lý và biện pháp khắc phục hậu quả đối với các hành vi gây ô nhiễm môi trường đô thị.":
    "Provides accurate, transparent information on penalty frameworks, sanctions, and remedial measures for urban environmental violations.",
  "TÌM KIẾM QUY ĐỊNH": "SEARCH REGULATIONS",
  "Tìm kiếm quy định": "Search Regulations",
  "Nhập hành vi (VD: vứt tàn thuốc, đổ rác vỉa hè...)": "Enter behavior (e.g. littering, illegal dumping...)",
  "Tìm quy định": "Find Regulations",
  "Gợi ý từ khóa vi phạm phổ biến:": "Common violation keywords:",
  "LĨNH VỰC MÔI TRƯỜNG": "ENVIRONMENTAL SECTORS",
  "Lĩnh vực môi trường": "Environmental Sectors",
  "Chọn chuyên đề pháp luật cần tra cứu": "Select legal topic to inspect",
  "Tra cứu ngay": "Inspect Now",
  "Tra cứu ngay →": "Inspect Now →",
  "điều khoản": "clauses",
  "vứt tàn thuốc": "throwing cigarette butts",
  "đổ rác vỉa hè": "dumping garbage on sidewalks",
  "karaoke loa kéo": "loudspeaker karaoke noise",
  "xả nước thải": "wastewater discharge",
  "đốt rác công nghiệp": "burning industrial waste",
  "Rác thải sinh hoạt": "Domestic Waste",
  "Rác công nghiệp/nguy hại": "Industrial / Hazardous Waste",
  "Nước thải": "Wastewater",
  "Khí thải": "Emissions & Exhaust Gas",
  "Tiếng ồn": "Noise Pollution",
  "Vứt rác vỉa hè, lòng đường, vứt tàn thuốc lá, không phân loại rác tại nguồn.":
    "Littering on sidewalks and roads, throwing cigarette butts, not sorting waste at source.",
  "Chôn lấp chất thải nguy hại, đốt chất thải công nghiệp ngoài cơ sở được cấp phép.":
    "Burying hazardous waste, burning industrial waste outside licensed facilities.",
  "Xả nước thải sinh hoạt vào cống thoát nước mưa, xả trộm nước thải ra kênh rạch, sông suối.":
    "Discharging domestic wastewater into stormwater drains, illegally dumping wastewater into canals and rivers.",
  "Thải khí thải công nghiệp nguy hại vượt chuẩn, đốt rác sinh hoạt lộ thiên gây khói bụi.":
    "Discharging hazardous industrial emissions exceeding standards, open burning of domestic waste causing smoke and dust.",
  "Gây tiếng ồn vượt quy chuẩn kỹ thuật tại khu dân cư, sử dụng loa phóng thanh quá giờ quy định.":
    "Exceeding technical noise standards in residential areas, using loudspeakers beyond permitted hours.",

  // 2. Navigation & Header
  "Bản đồ & Khí hậu": "Map & Climate",
  "Tác nghiệp & AI": "Operations & AI",
  "Cộng đồng": "Community",
  "Cứu hộ ngập lụt": "Flood Rescue",
  "Gửi phản ánh": "Report Incident",
  "Gửi phản ánh sự cố": "Submit Incident Report",
  "Gửi phản ánh sự cố môi trường": "Submit Environmental Incident",
  "Trợ lý ảo": "Voice Assistant",
  "Trợ lý Giọng nói": "Voice Assistant",
  "Trợ lý ảo rảnh tay Hands-free": "Hands-free Virtual Assistant",
  "Báo an toàn (Safety Check)": "Safety Check",
  "Báo an toàn thiên tai cho bạn bè & người thân": "Disaster Safety Check for family & friends",
  "SOS Cứu hộ": "SOS Rescue",
  "Cứu hộ ngập lụt khẩn cấp (Flood SOS)": "Emergency Flood SOS Rescue",
  "Bản đồ WebGIS": "WebGIS Map",
  "Không gian xanh, ngập lụt & trạm IoT": "Green spaces, flooding & IoT stations",
  "Phân tích AQI & Khí hậu": "AQI & Climate Analysis",
  "Chất lượng không khí & radar khí tượng": "Air quality & meteorological radar",
  "Dẫn đường tránh ngập": "Safe Flood Routing",
  "Tìm tuyến đường an toàn thời gian thực": "Real-time flood-safe route navigation",
  "Điểm nóng & Dự báo": "Hotspots & 7D Forecast",
  "Dự báo ô nhiễm 7 ngày & chuỗi thời gian": "7-day pollution forecast & time series",
  "Rủi ro đô thị": "Urban Risk Dashboard",
  "Phân tích đa tiêu chí rủi ro toàn thành phố": "City-wide multi-criteria risk analysis",
  "Quản lý vi phạm": "Violation Management",
  "Giám sát & xử lý phản ánh từ công dân": "Monitor & resolve citizen violation reports",
  "Thẩm định AI & GIS": "AI & GIS Triage",
  "AI đánh giá & phân loại tự động": "AI automated assessment & classification",
  "Báo cáo trùng lặp (AI)": "Deduplication (AI)",
  "AI gom cụm sự cố trùng lặp trên bản đồ": "AI spatial clustering of duplicate reports",
  "Đăng bài & Phản ánh": "Create Post & Report",
  "Bạn bè & Kết nối": "Friends & Connect",
  "Kết bạn và theo dõi công dân xanh": "Connect & follow green citizens",
  "DỮ LIỆU KHÔNG GIAN SỐ": "DIGITAL SPATIAL DATA",
  "ĐIỀU HÀNH & HIỆN TRƯỜNG": "OPERATIONS & DISPATCH",
  "KẾT NỐI & TƯƠNG TÁC": "CONNECT & ENGAGE",
  "Quản trị viên": "System Administrator",
  "Quản trị viên Hệ thống": "System Administrator",

  // 3. Common UI Controls & Actions
  "Tìm kiếm...": "Search...",
  "Tìm kiếm": "Search",
  "Bộ lọc": "Filter",
  "Áp dụng": "Apply",
  "Đặt lại": "Reset",
  "Đóng": "Close",
  "Hủy": "Cancel",
  "Lưu": "Save",
  "Lưu thay đổi": "Save Changes",
  "Xác nhận": "Confirm",
  "Xóa": "Delete",
  "Chỉnh sửa": "Edit",
  "Xem chi tiết": "View Details",
  "Quay lại": "Go Back",
  "Tải thêm": "Load More",
  "Đang tải dữ liệu...": "Loading data...",
  "Đang xử lý...": "Processing...",
  "Thành công": "Success",
  "Thất bại": "Failed",
  "Mới tiếp nhận": "Newly Received",
  "Đang xử lý": "In Progress",
  "Đã giải quyết": "Resolved",
  "Đã từ chối": "Rejected",
  "Đã xác minh": "Verified",
  "Hoàn thành": "Completed",
  "Trực tuyến": "Online",
  "Ngoại tuyến": "Offline",
  "Bãi rác tự phát": "Illegal Dump Site",
  "Chất thải công nghiệp": "Industrial Waste",
  "Điểm ngập úng": "Flood Point",
  "Ô nhiễm không khí": "Air Pollution",
  "Ô nhiễm nguồn nước": "Water Pollution",
};

// Inverted dictionary (EN -> VI)
const EN_TO_VI_MAP: Record<string, string> = {};
for (const [vi, en] of Object.entries(DOM_TRANSLATION_MAP)) {
  EN_TO_VI_MAP[en] = vi;
}

const asyncTranslationCache: Record<string, string> = {};
let observer: MutationObserver | null = null;
let isTranslating = false;
let activeLang: "VI" | "EN" = "VI";

/**
 * Translates a single string using exact dictionary, token replacement, or cached async translation.
 */
export function translateString(text: string, targetLang: "VI" | "EN"): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (targetLang === "EN") {
    if (DOM_TRANSLATION_MAP[trimmed]) {
      return text.replace(trimmed, DOM_TRANSLATION_MAP[trimmed]);
    }
    if (asyncTranslationCache[trimmed]) {
      return text.replace(trimmed, asyncTranslationCache[trimmed]);
    }

    let result = text;
    let replaced = false;
    for (const [vi, en] of Object.entries(DOM_TRANSLATION_MAP)) {
      if (vi.length > 2 && result.includes(vi)) {
        result = result.split(vi).join(en);
        replaced = true;
      }
    }

    if (replaced) return result;

    // Asynchronous backend translation for long accented Vietnamese sentences
    if (/[\u00C0-\u1EF9]/i.test(trimmed) && trimmed.length > 2) {
      api
        .post<{ translated_text: string }>("/api/v1/translation/translate", {
          text: trimmed,
          target_lang: "en",
          source_lang: "vi",
        })
        .then((res) => {
          if (res.data?.translated_text) {
            asyncTranslationCache[trimmed] = res.data.translated_text;
            if (activeLang === "EN") {
              requestAnimationFrame(() => applyDOMTranslation(document.body, "EN"));
            }
          }
        })
        .catch(() => {});
    }

    return text;
  } else {
    // Reverse to VI
    if (EN_TO_VI_MAP[trimmed]) {
      return text.replace(trimmed, EN_TO_VI_MAP[trimmed]);
    }
    let result = text;
    for (const [en, vi] of Object.entries(EN_TO_VI_MAP)) {
      if (en.length > 2 && result.includes(en)) {
        result = result.split(en).join(vi);
      }
    }
    return result;
  }
}

/**
 * Traverses DOM and translates text nodes and input placeholders.
 */
export function applyDOMTranslation(root: Node = document.body, lang: "VI" | "EN") {
  if (!root || isTranslating) return;
  isTranslating = true;

  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "noscript" || tag === "code") {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      const currentVal = currentNode.nodeValue || "";
      const translated = translateString(currentVal, lang);
      if (currentVal !== translated) {
        currentNode.nodeValue = translated;
      }
      currentNode = walker.nextNode();
    }

    if (root instanceof Element) {
      const inputs = root.querySelectorAll("input, textarea");
      inputs.forEach((el) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        if (input.placeholder) {
          const transPlaceholder = translateString(input.placeholder, lang);
          if (input.placeholder !== transPlaceholder) {
            input.placeholder = transPlaceholder;
          }
        }
      });
    }
  } finally {
    isTranslating = false;
  }
}

/**
 * Initializes continuous full-page observation.
 * Whenever React renders new nodes (API results, modals, newly created posts),
 * they are automatically translated!
 */
export function setGlobalPageLanguage(lang: "VI" | "EN") {
  activeLang = lang;

  if (lang === "EN") {
    applyDOMTranslation(document.body, "EN");

    if (!observer) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      observer = new MutationObserver(() => {
        if (isTranslating || activeLang !== "EN") return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          applyDOMTranslation(document.body, "EN");
        }, 50);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  } else {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    applyDOMTranslation(document.body, "VI");
  }
}
