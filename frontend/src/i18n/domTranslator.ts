/**
 * Global Full-Page DOM Auto-Translation Engine
 * Automatically translates the entire web page (all text nodes, placeholders, tooltips, form inputs)
 * and continuously observes for any new data added dynamically via MutationObserver.
 */

import api from "../api/client";

// Dictionary of domain phrases and UI patterns
export const DOM_TRANSLATION_MAP: Record<string, string> = {
  // 1. Flood SOS & Emergency Rescue (STT 45 & 46)
  "CỨU HỘ NGẬP LỤT (FLOOD SOS)": "FLOOD RESCUE (FLOOD SOS)",
  "Cứu hộ ngập lụt (Flood SOS)": "Flood Rescue (Flood SOS)",
  "Mạng lưới Cứu hộ Cộng đồng & Phản ứng nhanh GreenSpot": "GreenSpot Community Rescue & Rapid Response Network",
  "Mạng lưới Cứu hộ Community & Phản ứng nhanh GreenSpot": "GreenSpot Community Rescue & Rapid Response Network",
  "Phát tín hiệu Cấp cứu Khẩn cấp (Emergency SOS Dispatch)": "Broadcast Emergency SOS Dispatch",
  "Phát tín hiệu Cấp cứu Khẩn cấp": "Emergency SOS Dispatch",
  "Phát tín hiệu cấp cứu": "Broadcast Emergency Signal",
  "Dành cho người dân mắc kẹt tại vùng ngập sâu, lũ dâng cao hoặc sạt lở nguy hiểm. Tín hiệu sẽ được phát sóng tức thì tới tình nguyện viên và đội phản ứng nhanh cơ sở trong bán kính 3km.":
    "For residents trapped in deep flooding, rising waters, or hazardous landslides. Signals are broadcast instantly to local volunteers and rapid response teams within a 3km radius.",
  "TÌNH HUỐNG": "SITUATION",
  "Số người cần cứu": "People in need of rescue",
  "Người già": "Elderly",
  "Trẻ nhỏ": "Children",
  "Cần y tế gấp": "Urgent Medical Need",
  "Mô tả chi tiết tình trạng": "Detailed Situation Description",
  "Ảnh chụp hiện trường": "Field Photo",
  "Họ và tên người cần cứu": "Victim's Full Name",
  "Số điện thoại liên hệ": "Contact Phone Number",
  "Người dân vùng ngập": "Flooded Area Resident",
  "VỊ TRÍ": "LOCATION",
  "GPS TỰ ĐỘNG KẾT NỐI": "GPS AUTO-CONNECTED",
  "Dùng vị trí hiện tại": "Use Current Location",
  "Địa chỉ ước tính hoặc tự nhập": "Estimated or Manual Address",
  "Tọa độ": "Coordinates",
  "Độ chính xác": "Accuracy",
  "GỬI": "SUBMIT & DISPATCH",
  "Tổng số người:": "Total People:",
  "Tổng số người": "Total People",
  "Ưu tiên cứu hộ:": "Rescue Priority:",
  "Ưu tiên cứu hộ": "Rescue Priority",
  "Khẩn cấp (Nước dâng)": "Critical (Rising Water)",
  "Phạm vi phát sóng:": "Broadcast Range:",
  "Phạm vi phát sóng": "Broadcast Range",
  "Bán kính 3km": "3km Radius",
  "Kênh truyền:": "Channel:",
  "Kênh truyền": "Channel",
  "GỬI SOS": "SEND SOS",
  "Bấm để xác nhận phát tín hiệu cấp cứu": "Click to confirm emergency signal dispatch",
  "3 người": "3 people",
  "2 người": "2 people",
  "1 người": "1 person",
  "0 người": "0 people",
  "Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp":
    "Chest-deep water, power outage, ceiling about to submerge, life buoys urgently needed",
  "Hẻm 42 Bến Phú Định, Phường 16, Quận 8, TP.HCM":
    "Alley 42 Ben Phu Dinh, Ward 16, District 8, HCMC",
  "Đội phản ứng & Tình nguyện viên": "Response Teams & Volunteers",
  "Theo dõi tiến độ cứu hộ": "Track Rescue Progress",
  "Trường hợp nguy kịch đe dọa tính mạng, gọi ngay:": "In life-threatening emergencies, call immediately:",
  "Trường hợp nguy kịch đe dọa tính mạng, gọi ngay": "In life-threatening emergencies, call immediately",
  "Đang quét GPS chính xác cao...": "Scanning high-accuracy GPS...",
  "Bấm để chụp hoặc tải ảnh hiện trường giúp đội cứu nạn định vị cột mốc":
    "Click to take or upload field photo to help rescuers locate landmarks",
  "Gỡ ảnh": "Remove photo",
  "Ảnh hiện trường nước ngập": "Flood field photo",
  "Quay lại Bản đồ số WebGIS TP.HCM": "Return to HCMC WebGIS Map",
  "Số nhà, hẻm, tên đường, phường/xã, quận/huyện...": "House number, alley, street name, ward, district...",
  "Nhập tổng số người...": "Enter total victims...",
  "VD: Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp...":
    "E.g. Chest-deep water, power outage, ceiling about to submerge, life buoys urgently needed...",
  "Số người già": "Number of elderly",
  "Số trẻ nhỏ": "Number of children",
  "Số người cần hỗ trợ y tế": "Number of people needing medical care",
  "Bà Nguyễn Thị Mai": "Ms. Nguyen Thi Mai",
  "Số 42/5 Hẻm 120 Đường Bến Phú Định, Phường 16, Quận 8, TP.HCM":
    "No. 42/5 Alley 120 Ben Phu Dinh Street, Ward 16, District 8, HCMC",
  "Quận 8": "District 8",
  "Cách bạn 650m": "650m away from you",
  "Cách bạn": "Away from you",

  // 2. Legal & Penalties (STT 11)
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

  // 3. Navigation & Header
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

  // 4. Common UI Controls & System Metadata
  "TỔNG QUAN": "OVERVIEW",
  "BÁO CÁO": "REPORT",
  "THỐNG KÊ": "STATISTICS",
  "LỊCH SỬ": "HISTORY",
  "THÔNG TIN": "INFORMATION",
  "CHI TIẾT": "DETAILS",
  "DANH SÁCH": "LIST",
  "HÀNH ĐỘNG": "ACTIONS",
  "TRẠNG THÁI": "STATUS",
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

// Pre-sorted arrays by string length descending to guarantee greedy matching
const SORTED_DOM_MAP = Object.entries(DOM_TRANSLATION_MAP).sort(
  (a, b) => b[0].length - a[0].length
);
const SORTED_EN_TO_VI_MAP = Object.entries(EN_TO_VI_MAP).sort(
  (a, b) => b[0].length - a[0].length
);

const asyncTranslationCache: Record<string, string> = {};
const inFlightRequests = new Set<string>();
let observer: MutationObserver | null = null;
let isTranslating = false;
let activeLang: "VI" | "EN" = "VI";

/**
 * Translates a single string using exact dictionary, sorted substring replacement,
 * common regex patterns, or cached async backend translation.
 */
export function translateString(text: string, targetLang: "VI" | "EN"): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (targetLang === "EN") {
    // 1. Exact match in dictionary
    if (DOM_TRANSLATION_MAP[trimmed]) {
      return text.replace(trimmed, DOM_TRANSLATION_MAP[trimmed]);
    }
    // 2. Exact match in async cache
    if (asyncTranslationCache[trimmed]) {
      return text.replace(trimmed, asyncTranslationCache[trimmed]);
    }

    let result = text;
    let replaced = false;

    // 3. Regex replacements for common patterns with numbers/variables
    const withPatterns = result
      .replace(/(\d+)\s*người/gi, (_m, num) => (num === "1" ? "1 person" : `${num} people`))
      .replace(/(\d+)\s*điều khoản/gi, "$1 clauses")
      .replace(/Bán kính\s*(\d+)km/gi, "$1km radius")
      .replace(/Cách bạn\s*(\d+)m/gi, "$1m away from you")
      .replace(/Tọa độ:\s*/gi, "Coordinates: ")
      .replace(/Độ chính xác:\s*/gi, "Accuracy: ")
      .replace(/Đã định vị tọa độ GPS của bạn/gi, "Your GPS coordinates have been determined");

    if (withPatterns !== result) {
      result = withPatterns;
      replaced = true;
    }

    // 4. Greedy substring replacement using pre-sorted dictionary
    for (const [vi, en] of SORTED_DOM_MAP) {
      if (vi.length > 2 && result.includes(vi)) {
        result = result.split(vi).join(en);
        replaced = true;
      }
    }

    if (replaced) return result;

    // 5. Asynchronous backend translation for Vietnamese sentences (prevent duplicate requests)
    if (/[\u00C0-\u1EF9]/i.test(trimmed) && trimmed.length > 2 && !inFlightRequests.has(trimmed)) {
      inFlightRequests.add(trimmed);
      api
        .post<{ translated_text: string }>("/api/v1/translation/translate", {
          text: trimmed,
          target_lang: "en",
          source_lang: "vi",
        })
        .then((res) => {
          inFlightRequests.delete(trimmed);
          if (res.data?.translated_text) {
            asyncTranslationCache[trimmed] = res.data.translated_text;
            if (activeLang === "EN") {
              requestAnimationFrame(() => applyDOMTranslation(document.body, "EN"));
            }
          }
        })
        .catch(() => {
          inFlightRequests.delete(trimmed);
        });
    }

    return text;
  } else {
    // Reverse to VI
    if (EN_TO_VI_MAP[trimmed]) {
      return text.replace(trimmed, EN_TO_VI_MAP[trimmed]);
    }
    let result = text;
    for (const [en, vi] of SORTED_EN_TO_VI_MAP) {
      if (en.length > 2 && result.includes(en)) {
        result = result.split(en).join(vi);
      }
    }
    return result;
  }
}

/**
 * Traverses DOM and translates text nodes, input placeholders, and input values.
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
        // Also translate default/preset form values if in dictionary
        if (input.value && (input.type === "text" || input.tagName.toLowerCase() === "textarea")) {
          const transVal = translateString(input.value, lang);
          if (input.value !== transVal) {
            input.value = transVal;
          }
        }
      });
    }
  } finally {
    isTranslating = false;
  }
}

/**
 * Triggers Google Translate element if available as secondary multi-engine layer.
 */
export function triggerGoogleTranslate(lang: "VI" | "EN") {
  const targetCode = lang === "EN" ? "en" : "vi";
  try {
    // Set cookies across root and domain
    document.cookie = `googtrans=/vi/${targetCode}; path=/;`;
    if (window.location.hostname) {
      document.cookie = `googtrans=/vi/${targetCode}; domain=${window.location.hostname}; path=/;`;
    }

    const triggerSelect = () => {
      const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (select && select.value !== targetCode) {
        select.value = targetCode;
        select.dispatchEvent(new Event("change"));
        return true;
      }
      return false;
    };

    if (!triggerSelect()) {
      // Poll briefly if script is still loading
      const interval = setInterval(() => {
        if (triggerSelect()) {
          clearInterval(interval);
        }
      }, 300);
      setTimeout(() => clearInterval(interval), 3000);
    }
  } catch {
    // Ignore in SSR / test environments
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
    triggerGoogleTranslate("EN");

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
    triggerGoogleTranslate("VI");
  }
}
