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
  "Vui lòng nhập từ khoá tìm kiếm": "Please enter a search keyword",

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
  "Xuất dữ liệu sự cố (Excel/PDF)": "Export Incident Data (Excel/PDF)",
  "Trích xuất danh sách sự cố theo bộ lọc": "Extract incident list based on custom filters",
  "Thống kê hoạt động hệ thống": "System Activity Analytics",
  "KPIs người dùng mới, bài đăng, nhóm theo ngày": "Daily KPIs for new users, posts, and groups",

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

  // 5. Dispatch Operations & Field Command (STT 43)
  "Mã": "Code",
  "MÃ": "CODE",
  "Sự cố": "Problem",
  "SỰ CỐ": "PROBLEM",
  "Đội": "Team",
  "ĐỘI": "TEAM",
  "Mức độ": "Level",
  "MỨC ĐỘ": "LEVEL",
  "Trạng thái": "Status",
  "Lệnh xử lý": "Processing Order",
  "LỆNH XỬ LÝ": "PROCESSING ORDER",
  "Tổng số lệnh": "Total Commands",
  "TỔNG SỐ LỆNH": "TOTAL COMMANDS",
  "Tổng lệnh:": "Total Orders:",
  "TỔNG LỆNH": "TOTAL ORDERS",
  "Tình hình tác nghiệp": "Working Situation",
  "TÌNH HÌNH TÁC NGHIỆP": "WORKING SITUATION",
  "Lệnh tổng cộng": "General Command",
  "LỆNH TỔNG CỘNG": "GENERAL COMMAND",
  "Khẩn cấp / Hỏa tốc": "Critical / Emergency / Urgent",
  "Hỏa tốc": "Urgent",
  "Đã giao": "Delivered",
  "Đang đến": "Coming",
  "Chờ tiếp nhận": "Pending Acceptance",
  "Đội Cơ động số 3": "Mobile Team No. 3",
  "Đội Cơ động số 2": "Mobile Team No. 2",
  "Đội Cơ động số 1": "Mobile Team No. 1",
  "Đội Thoát Nước Thủ Đức": "Thu Duc Drainage Team",
  "Đội MTĐT Quận 8": "Urban Environment Team District 8",
  "Đội MTĐT District 8": "Urban Environment Team District 8",
  "Đội Cứu hộ ngập lụt Bình Thạnh": "Binh Thanh Flood Rescue Team",
  "Đội Flood Rescue Bình Thạnh": "Binh Thanh Flood Rescue Team",
  "Đội Môi trường đô thị Quận 1": "District 1 Urban Environment Team",
  "Đội phản ứng nhanh 1": "Rapid Response Team 1",
  "Đội nạo vét cơ động 2": "Mobile Dredging Team 2",
  "Đội tuần tra môi trường 3 (Đội Cơ động số 3)": "Environmental Patrol Team 3 (Mobile Team No. 3)",
  "Điểm ngập úng sâu 50cm giao lộ Nguyễn Văn Quá": "Flood Point 50cm deep at Nguyen Van Qua intersection",
  "Ngập úng đường Tô Ngọc Vân": "Flooding on To Ngoc Van Street",
  "Flooding đường Tô Ngọc Vân": "Flooding on To Ngoc Van Street",
  "Bãi rác tự phát Kênh Đôi": "Illegal Dump Site at Kenh Doi",
  "Illegal Dump Site Kênh Đôi": "Illegal Dump Site at Kenh Doi",
  "Ùn ứ rác sinh hoạt chợ Bà Chiểu": "Domestic Waste Congestion at Ba Chieu Market",
  "Ùn ứ Domestic Waste chợ Bà Chiểu": "Domestic Waste Congestion at Ba Chieu Market",
  "Điểm nghẽn cống đường Nguyễn Hữu Cảnh": "Drainage Sewer Blockage on Nguyen Huu Canh Street",
  "Ngã tư Nguyễn Văn Quá - Tô Ký, Quận 12": "Nguyen Van Qua - To Ky Intersection, District 12",
  "Đường Tô Ngọc Vân, Phường Linh Tây, TP. Thủ Đức": "To Ngoc Van Street, Linh Tay Ward, Thu Duc City",
  "Bờ kè Kênh Đôi, Phường 4, Quận 8": "Kenh Doi Embankment, Ward 4, District 8",
  "Bờ kè Kênh Đôi, Phường 4, District 8": "Kenh Doi Embankment, Ward 4, District 8",
  "Chợ Bà Chiểu, Phường 1, Quận Bình Thạnh": "Ba Chieu Market, Ward 1, Binh Thanh District",
  "22 Nguyễn Hữu Cảnh, Phường Bến Nghé, Quận 1": "22 Nguyen Huu Canh, Ben Nghe Ward, District 1",
  "Danh sách lệnh": "List of commands",
  "Tạo lệnh điều phối mới": "Create new command",
  "Theo dõi hiện trường": "Monitor the scene",
  "Lệnh điều động": "Dispatch command",
  "Ban quản trị": "Administration",
  "Đội xử lý": "Processing team",
  "Sửa lệnh": "Fix",
  "Huỷ lệnh": "Cancel order",
  "Hướng dẫn nhanh": "Quick guide",
  "Bấm một lần vào hàng để chọn lệnh.": "Click once on a row to select an order.",
  "Nhấp đúp chuột vào hàng để xem Theo dõi hiện trường.": "Double click on the row to view Monitor the scene.",
  "Nhấp đúp chuột vào một hàng bất kỳ để mở Giám sát hiện trường": "Double click on any order row to open Field Watch",
  "Tìm nhanh theo mã lệnh, tên sự cố, địa chỉ, đội phụ trách...": "Quickly search by command code, incident name, address, team in charge...",

  // 6. Risk Dashboard (STT 42)
  "CHỈ SỐ": "INDICATORS",
  "Toàn đô thị": "City-wide",
  "Điểm rủi ro chung": "Overall Risk Score",
  "Khu vực nguy cơ cao": "High Risk Areas",
  "Sự cố đang mở": "Open Incidents",
  "Bãi rác tự phát & Điểm ngập úng chưa xử lý dứt điểm": "Illegal dump sites & unresolved flood points",
  "Báo động Cam / Đỏ": "Orange / Red Alert",
  "quận/huyện": "districts",
  "vụ việc": "cases",
  "CƠ CẤU RỦI RO THEO LOẠI HÌNH": "RISK COMPOSITION BY TYPE",
  "XU HƯỚNG RỦI RO THEO THỜI GIAN": "RISK TREND OVER TIME",
  "PHÂN TÍCH RỦI RO": "RISK ANALYSIS",
  "Chọn quận/huyện cần phân tích:": "Select district to analyze:",
  "Tất cả quận huyện": "All districts",
  "Tháng này": "This Month",
  "Hôm nay": "Today",
  "7 ngày qua": "Last 7 Days",
  "30 ngày qua": "Last 30 Days",
  "Tuỳ chọn khoảng thời gian": "Custom Date Range",

  // 7. Emergency Broadcast Console (STT 45)
  "NỘI DUNG": "CONTENT",
  "PHẠM VI": "COVERAGE",
  "Loại cảnh báo thiên tai khẩn cấp:": "Emergency Disaster Alert Type:",
  "Ngập lụt nghiêm trọng": "Severe Flooding",
  "Triều cường dâng cao": "High Tidal Surge",
  "Sạt lở bờ sông/kênh": "Riverbank / Canal Landslide",
  "Bão / Lốc xoáy cực đoan": "Severe Storm / Tornado",
  "Tiêu đề phát sóng cảnh báo:": "Broadcast Alert Title:",
  "Nội dung chi tiết cảnh báo:": "Detailed Alert Content:",
  "Đường dây nóng cứu hộ (Hotline):": "Rescue Hotline:",
  "Phát lệnh cảnh báo khẩn cấp": "Broadcast Emergency Alert",
  "Lịch sử phát sóng": "Broadcast History",

  // 8. Administrative Districts
  "Quận 1": "District 1",
  "Quận 3": "District 3",
  "Quận 4": "District 4",
  "Quận 5": "District 5",
  "Quận 6": "District 6",
  "Quận 7": "District 7",
  "Quận 10": "District 10",
  "Quận 11": "District 11",
  "Quận 12": "District 12",
  "Quận Bình Tân": "Binh Tan District",
  "Quận Bình Thạnh": "Binh Thanh District",
  "Quận Gò Vấp": "Go Vap District",
  "Quận Phú Nhuận": "Phu Nhuan District",
  "Quận Tân Bình": "Tan Binh District",
  "Quận Tân Phú": "Tan Phu District",
  "TP. Thủ Đức": "Thu Duc City",
  "TP Thủ Đức": "Thu Duc City",
  "Huyện Bình Chánh": "Binh Chanh District",
  "Huyện Cần Giờ": "Can Gio District",
  "Huyện Củ Chi": "Cu Chi District",
  "Huyện Hóc Môn": "Hoc Mon District",
  "Huyện Nhà Bè": "Nha Be District",
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
 * Standard Vietnamese Accent Remover / Romanization
 * Converts accented proper nouns into clean Latin text (e.g. "Nguyễn Văn Quá" -> "Nguyen Van Qua")
 */
export function stripVietnameseAccents(str: string): string {
  if (!str) return str;
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Translates a single string using exact dictionary, greedy substring replacement,
 * common regex patterns, and automatic accent romanization for proper nouns.
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

    // 3. GREEDY SUBSTRING REPLACEMENT FIRST (Longer phrases first, preventing broken tokens)
    for (const [vi, en] of SORTED_DOM_MAP) {
      if (vi.length > 2 && result.includes(vi)) {
        result = result.split(vi).join(en);
        replaced = true;
      }
    }

    // 4. Regex replacements for common patterns with numbers/variables and urban terms
    const withPatterns = result
      .replace(/(\d+)\s*người/gi, (_m, num) => (num === "1" ? "1 person" : `${num} people`))
      .replace(/(\d+)\s*điều khoản/gi, "$1 clauses")
      .replace(/Bán kính\s*(\d+)km/gi, "$1km radius")
      .replace(/Cách bạn\s*(\d+)m/gi, "$1m away from you")
      .replace(/Tọa độ:\s*/gi, "Coordinates: ")
      .replace(/Độ chính xác:\s*/gi, "Accuracy: ")
      .replace(/Đã định vị tọa độ GPS của bạn/gi, "Your GPS coordinates have been determined")
      .replace(/\bNgã tư\b/gi, "Intersection of")
      .replace(/\bGiao lộ\b/gi, "Intersection of")
      .replace(/\bĐường\b/gi, "Street")
      .replace(/\bPhường\b/gi, "Ward")
      .replace(/\bQuận\b/gi, "District")
      .replace(/\bHuyện\b/gi, "District")
      .replace(/\bTP\.?\s*Thủ Đức\b/gi, "Thu Duc City")
      .replace(/\bTP\.?\s*HCM\b/gi, "HCMC")
      .replace(/\bBờ kè\b/gi, "Embankment")
      .replace(/\bChợ\b/gi, "Market")
      .replace(/\bKênh\b/gi, "Canal")
      .replace(/\bSông\b/gi, "River")
      .replace(/\bCầu\b/gi, "Bridge")
      .replace(/\bHẻm\b/gi, "Alley")
      .replace(/\bĐoạn\b/gi, "Section")
      .replace(/\bsâu\s*(\d+)cm\b/gi, "$1cm deep")
      .replace(/\bĐội\b/gi, "Team")
      .replace(/\bCơ động\b/gi, "Mobile")
      .replace(/\bThoát Nước\b/gi, "Drainage")
      .replace(/\bMôi trường đô thị\b/gi, "Urban Environment")
      .replace(/\bMTĐT\b/gi, "Urban Environment")
      .replace(/\bHỏa tốc\b/gi, "Urgent")
      .replace(/\bKhẩn cấp\b/gi, "Critical")
      .replace(/\bCao\b/g, "High")
      .replace(/\bTrung bình\b/g, "Medium")
      .replace(/\bThấp\b/g, "Low");

    if (withPatterns !== result) {
      result = withPatterns;
      replaced = true;
    }

    // 5. If result still contains Vietnamese accented characters (proper nouns of streets/people), romanize cleanly!
    if (/[\u00C0-\u1EF9]/i.test(result)) {
      result = stripVietnameseAccents(result);
      replaced = true;
    }

    if (replaced) {
      asyncTranslationCache[trimmed] = result.trim();
      return result;
    }

    // 6. Asynchronous backend translation for Vietnamese sentences (prevent duplicate requests)
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

    return stripVietnameseAccents(text);
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
 * Traverses DOM and translates text nodes, input placeholders, values, titles and aria-labels.
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
      // Inputs & Textareas
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

      // Tooltips & Accessibility labels
      const titledElements = root.querySelectorAll("[title], [aria-label]");
      titledElements.forEach((el) => {
        const title = el.getAttribute("title");
        if (title) {
          const trans = translateString(title, lang);
          if (title !== trans) el.setAttribute("title", trans);
        }
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) {
          const trans = translateString(ariaLabel, lang);
          if (ariaLabel !== trans) el.setAttribute("aria-label", trans);
        }
      });
    }
  } finally {
    isTranslating = false;
  }
}

/**
 * Clears any external translator artifacts or cookies to ensure
 * a 100% clean, native interface without third-party bars or banners.
 */
export function clearExternalTranslatorArtifacts() {
  try {
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    if (window.location.hostname) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
    }
    const frames = document.querySelectorAll(
      ".goog-te-banner-frame, #google_translate_element, iframe.skiptranslate, .goog-te-gadget"
    );
    frames.forEach((el) => el.remove());
    if (document.body) {
      document.body.style.top = "0px";
    }
  } catch {
    // Ignore in SSR / test environments
  }
}

export function triggerGoogleTranslate(_lang?: "VI" | "EN") {
  clearExternalTranslatorArtifacts();
}

/**
 * Initializes continuous full-page observation.
 * Whenever React renders new nodes (API results, modals, newly created posts),
 * they are automatically translated!
 */
export function setGlobalPageLanguage(lang: "VI" | "EN") {
  activeLang = lang;
  clearExternalTranslatorArtifacts();

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
