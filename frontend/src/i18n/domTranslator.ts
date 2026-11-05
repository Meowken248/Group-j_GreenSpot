/**
 * Global Full-Page DOM Auto-Translation Engine
 * Automatically translates the entire web page (all text nodes, placeholders, tooltips, form inputs)
 * and continuously observes for any new data added dynamically via MutationObserver.
 */

import api from "../api/client";

// Dictionary of domain phrases and UI patterns
export const DOM_TRANSLATION_MAP: Record<string, string> = {
  "VẤN ĐỀ": "PROBLEM",
  "Vấn đề": "Problem",
  "ĐỘI PHỤ TRÁCH": "TEAM IN CHARGE",
  "Đội phụ trách": "Team in charge",
  "CẤP ĐỘ": "LEVEL",
  "Cấp độ": "Level",
  "Điểm ngập sâu 50cm giao lộ Nguyễn Văn Quá - Tô Ký, Quận 12": "Flood Point 50cm deep at Nguyen Van Qua - To Ky intersection, District 12",
  "Ngập lụt đường Tô Ngọc Vân, Phường Linh Tây, TP. Thủ Đức": "Flooding on To Ngoc Van Street, Linh Tay Ward, Thu Duc City",
  "Bãi rác tự phát Kênh Đôi, Bờ kè Kênh Đôi, Phường 4, Quận 8": "Illegal Dump Site Kenh Doi, Kenh Doi Embankment, Ward 4, District 8",
  "LỆNH ĐIỀU PHỐI": "DISPATCH ORDERS",
  "Lệnh điều phối": "Dispatch Order",
  "Tổng số: 5 lệnh": "Total: 5 orders",
  "CỨU HỘ NGẬP LỤT (FLOOD SOS)": "FLOOD RESCUE (FLOOD SOS)",
  "Cứu hộ ngập lụt (Flood SOS)": "Flood Rescue (Flood SOS)",
  "Mạng lưới Cứu hộ Cộng đồng & Phản ứng nhanh GreenSpot": "GreenSpot Community Rescue & Rapid Response Network",
  "Mạng lưới Cứu hộ Community & Phản ứng nhanh GreenSpot": "GreenSpot Community Rescue & Rapid Response Network",
  "Phát tín hiệu Cấp cứu Khẩn cấp (Emergency SOS Dispatch)": "Broadcast Emergency SOS Dispatch",
  "Phát tín hiệu Cấp cứu Khẩn cấp": "Emergency SOS Dispatch",
  "Phát tín hiệu cấp cứu": "Broadcast Emergency Signal",
  "Dành cho người dân mắc kẹt tại vùng ngập sâu, lũ dâng cao hoặc sạt lở nguy hiểm. Tín hiệu sẽ được phát sóng tức thì tới tình nguyện viên và đội phản ứng nhanh cơ sở trong bán kính 3km.": "For residents trapped in deep flooding, rising waters, or hazardous landslides. Signals are broadcast instantly to local volunteers and rapid response teams within a 3km radius.",
  "TÌNH HUỐNG": "SITUATION",
  "Số người cần cứu": "People in need of rescue",
  "Người già": "Elderly",
  "Trẻ nhỏ": "Children",
  "Cần y tế gấp": "Urgent Medical Need",
  "Mô tả chi tiết tình trạng": "Detailed Situation Description",
  "Ảnh chụp hiện trường": "Field Photo",
  "Họ và tên người cần cứu": "Victim",
  "Số điện thoại liên hệ": "Contact Phone Number",
  "Người dân vùng ngập": "Flooded Area Resident",
  "VỊ TRÍ": "LOCATION",
  "GPS TỰ ĐỘNG KẾT NỐI": "GPS AUTO-CONNECTED",
  "Dùng vị trí hiện tại": "Use Current Location",
  "Địa chỉ ước tính hoặc tự nhập": "Estimated or Manual Address",
  "Tọa độ": "Coordinates",
  "Độ chính xác": "Accuracy",
  "GỬI CHO BẠN BÈ": "SEND TO FRIENDS",
  "GỬI CHO": "SEND TO",
  "GỬI": "SUBMIT & DISPATCH",
  "Gửi cho bạn bè": "Send to Friends",
  "XÁC NHẬN AN TOÀN": "SAFETY CONFIRMATION",
  "Xác nhận an toàn": "Safety Confirmation",
  "Tôi an toàn": "I Am Safe",
  "ĐÃ BÁO AN TOÀN TRÊN HỒ SƠ": "MARKED SAFE ON PROFILE",
  "ĐANG CẬP NHẬT...": "UPDATING...",
  "Danh bạ bạn bè": "Friends Contacts",
  "Chọn tất cả": "Select All",
  "Bạn chưa có người bạn nào trong danh bạ": "You do not have any friends in your contact list",
  " để có thể gửi thông báo an toàn khi xảy ra thiên tai.": "Connect with friends in the Community section to send safety alerts during natural disasters.",
  "Đến trang Bạn bè & Theo dõi": "Go to Friends & Following",
  "Vị trí GPS thời gian thực (Đã xác thực ✅)": "Real-time GPS Location (Verified ✅)",
  "Vị trí GPS thời gian thực (Đã xác thực)": "Real-time GPS Location (Verified)",
  "Vị trí GPS thời gian thực": "Real-time GPS Location",
  "Vị trí ước tính (Chưa cấp quyền GPS)": "Estimated Location (GPS Permission Denied)",
  "Không thể xác định vị trí hiện tại. Vui lòng bật định vị GPS trong cài đặt trình duyệt để có độ chính xác cao nhất.": "Cannot determine current location. Please enable GPS in browser settings for highest accuracy.",
  "Vị trí hiện tại của bạn đã được xác định. Hãy báo an toàn cho bạn bè.": "Your current location has been determined. Please notify your friends that you are safe.",
  "Bạn đã được đánh dấu là AN TOÀN trong đợt thiên tai này.": "You have been marked SAFE during this disaster.",
  "Vui lòng chọn ít nhất một người bạn để gửi thông báo an toàn.": "Please select at least one friend to send safety notification.",
  "Đang gửi thông báo an toàn đến bạn bè...": "Sending safety notification to friends...",
  "Tôi hiện đang an toàn tại khu vực, gia đình và bạn bè hãy yên tâm!": "I am currently safe in this area, family and friends please be assured!",
  "BAN CHỈ HUY PCTT & TKCN": "DISASTER PREVENTION & RESCUE STEERING COMMITTEE",
  "Ban chỉ huy PCTT & TKCN": "Disaster Prevention & Rescue Steering Committee",
  "Phát lệnh Critical": "Critical Alert Broadcast",
  "Thử nghiệm cảnh báo": "Test Alert",
  "GreenSpot PCTT": "GreenSpot Disaster Management",
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
  "Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp": "Chest-deep water, power outage, ceiling about to submerge, life buoys urgently needed",
  "Hẻm 42 Bến Phú Định, Phường 16, Quận 8, TP.HCM": "Alley 42 Ben Phu Dinh, Ward 16, District 8, HCMC",
  "Đội phản ứng & Tình nguyện viên": "Response Teams & Volunteers",
  "Theo dõi tiến độ cứu hộ": "Track Rescue Progress",
  "Trường hợp nguy kịch đe dọa tính mạng, gọi ngay:": "In life-threatening emergencies, call immediately:",
  "Trường hợp nguy kịch đe dọa tính mạng, gọi ngay": "In life-threatening emergencies, call immediately",
  "Đang quét GPS chính xác cao...": "Scanning high-accuracy GPS...",
  "Bấm để chụp hoặc tải ảnh hiện trường giúp đội cứu nạn định vị cột mốc": "Click to take or upload field photo to help rescuers locate landmarks",
  "Gỡ ảnh": "Remove photo",
  "Ảnh hiện trường nước ngập": "Flood field photo",
  "Quay lại Bản đồ số WebGIS TP.HCM": "Return to HCMC WebGIS Map",
  "Số nhà, hẻm, tên đường, phường/xã, quận/huyện...": "House number, alley, street name, ward, district...",
  "Nhập tổng số người...": "Enter total victims...",
  "VD: Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp...": "E.g. Chest-deep water, power outage, ceiling about to submerge, life buoys urgently needed...",
  "Số người già": "Number of elderly",
  "Số trẻ nhỏ": "Number of children",
  "Số người cần hỗ trợ y tế": "Number of people needing medical care",
  "Bà Nguyễn Thị Mai": "Ms. Nguyen Thi Mai",
  "Số 42/5 Hẻm 120 Đường Bến Phú Định, Phường 16, Quận 8, TP.HCM": "No. 42/5 Alley 120 Ben Phu Dinh Street, Ward 16, District 8, HCMC",
  "Quận 8": "District 8",
  "Cách bạn 650m": "650m away from you",
  "Cách bạn": "Away from you",
  "Cẩm Nang Pháp Lý & Xử Phạt Vi Phạm Môi Trường": "Environmental Legal Handbook & Penalty Regulations",
  "Hệ thống pháp luật môi trường": "Environmental Legal Framework",
  "Tra cứu quy định xử phạt": "Penalty Regulations Lookup",
  "Căn cứ: Nghị định 45/2022/NĐ-CP": "Basis: Decree 45/2022/ND-CP",
  "Cung cấp thông tin chuẩn xác, minh bạch về các khung hình phạt, chế tài xử lý và biện pháp khắc phục hậu quả đối với các hành vi gây ô nhiễm môi trường đô thị.": "Provides accurate, transparent information on penalty frameworks, sanctions, and remedial measures for urban environmental violations.",
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
  "Vứt rác vỉa hè, lòng đường, vứt tàn thuốc lá, không phân loại rác tại nguồn.": "Littering on sidewalks and roads, throwing cigarette butts, not sorting waste at source.",
  "Chôn lấp chất thải nguy hại, đốt chất thải công nghiệp ngoài cơ sở được cấp phép.": "Burying hazardous waste, burning industrial waste outside licensed facilities.",
  "Xả nước thải sinh hoạt vào cống thoát nước mưa, xả trộm nước thải ra kênh rạch, sông suối.": "Discharging domestic wastewater into stormwater drains, illegally dumping wastewater into canals and rivers.",
  "Thải khí thải công nghiệp nguy hại vượt chuẩn, đốt rác sinh hoạt lộ thiên gây khói bụi.": "Discharging hazardous industrial emissions exceeding standards, open burning of domestic waste causing smoke and dust.",
  "Gây tiếng ồn vượt quy chuẩn kỹ thuật tại khu dân cư, sử dụng loa phóng thanh quá giờ quy định.": "Exceeding technical noise standards in residential areas, using loudspeakers beyond permitted hours.",
  "Vui lòng nhập từ khoá tìm kiếm": "Please enter a search keyword",
  "Bản đồ & Khí hậu": "Map & Climate",
  "Tác nghiệp & AI": "Operations & AI",
  "Cộng đồng": "Community",
  "Cứu hộ ngập lụt": "Flood Rescue",
  "Gửi phản ánh": "Report Incident",
  "Gửi phản ánh sự cố": "Report Environmental Incident",
  "Gửi phản ánh sự cố môi trường": "Submit Environmental Incident",
  "Trợ lý ảo": "Voice Assistant",
  "Trợ lý Giọng nói": "Voice Assistant",
  "Trợ lý ảo rảnh tay Hands-free": "Hands-free voice assistant",
  "Báo an toàn (Safety Check)": "Community Safety Check",
  "Báo an toàn thiên tai cho bạn bè & người thân": "Notify disaster safety to family & friends",
  "SOS Cứu hộ": "SOS Rescue",
  "Cứu hộ ngập lụt khẩn cấp (Flood SOS)": "Emergency Flood SOS Rescue",
  "Bản đồ WebGIS": "WebGIS Map",
  "Không gian xanh, ngập lụt & trạm IoT": "Green spaces, flood areas & IoT stations",
  "Phân tích AQI & Khí hậu": "AQI & Climate Analysis",
  "Chất lượng không khí & radar khí tượng": "Air quality & meteorological radar",
  "Dẫn đường tránh ngập": "Safe Flood Routing",
  "Tìm tuyến đường an toàn thời gian thực": "Find real-time safe navigation routes",
  "Điểm nóng & Dự báo": "Hotspots & Forecast",
  "Dự báo ô nhiễm 7 ngày & chuỗi thời gian": "7-day pollution forecast & time series",
  "Rủi ro đô thị": "Urban Environmental Risk",
  "Phân tích đa tiêu chí rủi ro toàn thành phố": "Multi-criteria city-wide risk analysis",
  "Quản lý vi phạm": "Violation Management",
  "Giám sát & xử lý phản ánh từ công dân": "Monitor & process citizen complaints",
  "Thẩm định AI & GIS": "AI & GIS Triage",
  "AI đánh giá & phân loại tự động": "AI evaluation & auto classification",
  "Báo cáo trùng lặp (AI)": "Duplicate Reports (AI)",
  "AI gom cụm sự cố trùng lặp trên bản đồ": "AI clusters duplicate incidents on map",
  "Đăng bài & Phản ánh": "Create Post & Voice",
  "Bạn bè & Kết nối": "Friends & Network",
  "Kết bạn và theo dõi công dân xanh": "Add friends & follow green citizens",
  "DỮ LIỆU KHÔNG GIAN SỐ": "DIGITAL SPATIAL DATA",
  "ĐIỀU HÀNH & HIỆN TRƯỜNG": "OPERATIONS & FIELD DISPATCH",
  "KẾT NỐI & TƯƠNG TÁC": "COMMUNITY & INTERACTION",
  "Quản trị viên": "System Administrator",
  "Quản trị viên Hệ thống": "System Administrator",
  "Xuất dữ liệu sự cố (Excel/PDF)": "Export Incident Data (Excel/PDF)",
  "Trích xuất danh sách sự cố theo bộ lọc": "Extract filtered incident reports",
  "Thống kê hoạt động hệ thống": "System Activity Analytics",
  "KPIs người dùng mới, bài đăng, nhóm theo ngày": "Daily KPIs for users, posts, and groups",
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
  "NỘI DUNG": "CONTENT",
  "PHẠM VI": "RANGE / SCOPE",
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
  "Quản lý sự cố": "Incident Management",
  "Tiếp nhận & duyệt phản ánh sự cố môi trường": "Receive & review environmental reports",
  "Điều phối tác nghiệp": "Operations Dispatch",
  "Trung tâm điều phối & phân công hiện trường": "Dispatch center & field assignment",
  "Báo cáo ô nhiễm & sự cố môi trường kèm ảnh/video": "Report pollution & issues with photo/video",
  "Phản ánh sự cố & chia sẻ kinh nghiệm sống xanh": "Share green lifestyle & eco tips",
  "Phát tín hiệu cứu hộ & mạng lưới cứu nạn cộng đồng": "Broadcast emergency rescue signal & volunteers",
  "Ví Điểm Thưởng & Danh Hiệu": "Reward Points Wallet & Tier",
  "Thử Thách Xanh Trong Tuần": "Weekly Green Challenges",
  "Cẩm Nang Phân Loại Rác": "Waste Sorting Handbook",
  "Bảng Xếp Hạng Công Dân Xanh": "Green Citizen Leaderboard",
  "Bản Đồ Nhiệt Môi Trường (GIS)": "Environmental Heatmap (GIS)",
  "Quét Mã QR Nhận Điểm": "Scan QR Code for Points",
  "Vòng Quay May Mắn Mỗi Ngày": "Daily Lucky Wheel",
  "Lộ Trình Danh Hiệu": "Badge & Tier Milestones",
  "Nhật Ký Kiểm Toán (Audit Log)": "System Audit Log",
  "Quản lý thiết bị & Phiên": "Device & Session Management",
  "Cài đặt tài khoản": "Account Settings",
  "QUẢN TRỊ HỆ THỐNG": "SYSTEM ADMINISTRATION",
  "Quản lý người dùng": "User Management",
  "Phân quyền vai trò RBAC": "RBAC Role Permissions",
  "Phát lệnh cảnh báo khẩn cấp (PCTT)": "Broadcast Emergency Alert (PCTT)",
  "Đăng xuất": "Logout",
  "Đăng xuất tài khoản": "Logout Account",
  "Xác thực tài khoản": "Account Authentication",
  "Hồ sơ cá nhân": "Personal Profile",
  "Cài đặt ứng dụng": "Application Settings",
  "Tra cứu quy định & Chế tài xử phạt": "Penalty Regulations & Sanctions",
  "Thống kê biên bản vi phạm": "Violation Reports Analytics",
  "Đăng tải bài viết cộng đồng": "Create Community Post",
  "Báo cáo sự cố môi trường": "Report Environmental Incident",
  "Quản lý danh sách sự cố": "Incident Management List",
  "Ví điểm thưởng & Đổi quà sinh thái": "Green Points Wallet & Eco Gifts",
  "Thử thách sống xanh tuần": "Weekly Green Challenges",
  "Cẩm nang phân loại rác thải": "Waste Sorting Handbook",
  "Bảng vinh danh công dân xanh": "Green Citizen Leaderboard",
  "Bản đồ nhiệt đa chế độ": "Multi-mode Climate Heatmap",
  "Quét mã QR địa điểm": "Scan Location QR Code",
  "Vòng quay may mắn": "Lucky Wheel",
  "Mốc điểm danh hiệu xanh": "Green Milestone & Tier",
  "Trích xuất & Báo cáo dữ liệu sự cố (Excel/PDF)": "Extract & Report Incident Data (Excel/PDF)",
  "Thống kê hoạt động hệ thống toàn diện": "Comprehensive System Activity Analytics",
  "Chỉ số chất lượng không khí AQI": "Air Quality Index (AQI)",
  "Khử trùng lặp phản ánh môi trường": "Deduplicate Environmental Reports",
  "Phân loại sự cố AI & Cơ sở trọng yếu": "AI Incident Triage & Key Facilities",
  "Lộ trình an toàn tránh ngập lụt": "Safe Navigation Route Avoiding Floods",
  "Bảng chỉ số rủi ro môi trường đô thị": "Urban Environmental Risk Index Dashboard",
  "Điều phối tác nghiệp xử lý hiện trường": "Operations Dispatch & Field Assignment",
  "Phân tích điểm nóng & Dự báo 7 ngày": "Hotspot Analytics & 7-Day Forecast",
  "Phát lệnh cảnh báo khẩn cấp Geofencing": "Geofencing Emergency Broadcast Alert",
  "Khảo sát an toàn cộng đồng (Safety Check)": "Community Safety Check Survey",
  "Cứu nạn ngập lụt khẩn cấp (Flood SOS)": "Emergency Flood Rescue (Flood SOS)",
  "Trợ lý điều khiển giọng nói AI": "AI Voice Control Assistant",
  "Bản đồ số WebGIS": "WebGIS Digital Map",
  "Không thể kết nối đến máy chủ. Vui lòng thử lại": "Cannot connect to server. Please try again",
  "Không thể tải danh sách thiết bị. Vui lòng thử lại": "Unable to load device list. Please try again",
  "Không thể gửi mã OTP. Vui lòng thử lại sau": "Unable to send OTP code. Please try again later",
  "Mất kết nối. Vui lòng thử lại": "Connection lost. Please try again",
  "Kích hoạt tài khoản thành công": "Account activated successfully",
  "Mã OTP đã được gửi đến email của bạn": "OTP code has been sent to your email",
  "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau 1 giờ": "You have requested OTP too many times. Please try again in 1 hour",
  "Họ tên phải từ 2 đến 50 ký tự, chỉ gồm chữ cái và khoảng trắng": "Full name must be 2 to 50 characters, letters and spaces only",
  "Tệp không hợp lệ (ảnh tối đa 10MB, video MP4 tối đa 50MB)": "Invalid file (Photos max 10MB, MP4 videos max 50MB)",
  "Chỉ được đăng tối đa 5 ảnh hoặc 1 video": "Maximum 5 photos or 1 video allowed",
  "Tối đa 5 tệp đính kèm": "Maximum 5 attachments",
  "Thông báo hệ thống": "System Notifications",
  "Chính sách bảo mật": "Privacy Policy",
  "Điều khoản sử dụng": "Terms of Service",
  "Ẩn mật khẩu": "Hide password",
  "Hiện mật khẩu": "Show password",
  "Hoàn tất": "Completed",
  "Đóng chi tiết": "Close details",
  "Đang tính...": "Calculating...",
  "Chỉ số AQI": "AQI Index",
  "Người dùng": "Users",
  "Thao tác": "Actions",
  "Ngập úng": "Waterlogging",
  "PHÂN CÔNG": "DISPATCH & ASSIGN",
  "Đang lưu...": "Saving...",
  "Vị trí đã chọn": "Selected Location",
  "Chỉ đường từ vị trí của tôi": "Directions from my location",
  "HỆ THỐNG GIÁM SÁT MÔI TRƯỜNG GREENSPOT": "GREENSPOT ENVIRONMENTAL MONITORING SYSTEM",
  "Liên hệ hỗ trợ": "Contact Support",
  "Người thực hiện:": "Assignee:",
  "Chuông thông báo": "Notification Bell",
  "Gửi mã mới": "Send new code",
  "Chụp": "Capture",
  "Thử lại": "Try Again",
  "#ChủNhậtXanh": "#GreenSunday",
  "#PhânLoạiRác": "#WasteSorting",
  "+ Kết bạn": "+ Add Friend",
  "+ Thêm ảnh/video": "+ Add Photo/Video",
  "+10 Điểm": "+10 Points",
  "+15 Điểm": "+15 Points",
  "+20 Điểm Xanh": "+20 Green Points",
  "+5 Điểm": "+5 Points",
  "+50 Điểm": "+50 Points",
  "Admin cấp cao": "Super Admin",
  "An toàn": "Safe",
  "Avatar người dùng": "User Avatar",
  "BIỂU ĐỒ": "CHART",
  "Ban Giám Đốc": "Board of Directors",
  "Ban đêm": "Night",
  "Biến động điểm:": "Points fluctuation:",
  "Biểu tượng": "Icon",
  "BÁO CÁO A": "REPORT A",
  "BÁO CÁO B": "REPORT B",
  "Bài": "Post",
  "Bài đăng mới": "New Post",
  "Báo cáo A": "Report A",
  "Báo cáo B": "Report B",
  "Báo cáo ngập": "Report Flooding",
  "Báo động": "Alarm / Alert",
  "Bã cà phê": "Coffee grounds",
  "Bìa carton": "Cardboard",
  "Bình Chánh": "Binh Chanh",
  "Bình Thạnh": "Binh Thanh",
  "Bình Tân": "Binh Tan",
  "Bình thường": "Normal",
  "BẠN TRÚNG THƯỞNG!": "YOU WON A PRIZE!",
  "Bạn bè": "Friends",
  "BẢN ĐỒ": "MAP",
  "BẢNG": "TABLE",
  "Bản Đồ WebGIS": "WebGIS Map",
  "Bản đồ": "Map",
  "Bản đồ 3D": "3D Map",
  "Bản đồ nhiệt": "Heatmap",
  "Bản đồ số": "Digital Map",
  "Bảng vàng": "Leaderboard / Hall of Fame",
  "Bật Camera": "Turn On Camera",
  "Bật flash": "Turn On Flash",
  "Bắt đầu nói": "Start Speaking",
  "Bằng chứng": "Evidence",
  "Bến Thành": "Ben Thanh",
  "Bệnh viện": "Hospitals",
  "Bị khóa": "Locked",
  "Bỏ theo dõi": "Unfollow",
  "BỘ LỌC": "FILTER",
  "Bụi PM10": "PM10 Dust",
  "Bụi PM2.5": "PM2.5 Dust",
  "CHI TIẾT QUẬN": "DISTRICT DETAILS",
  "CHỨC NĂNG": "FEATURE",
  "Cam: Nghiêm trọng": "Orange: Severe",
  "Cao ốc (70m+)": "High-rise (70m+)",
  "Chi tiết": "Details",
  "Chiều dài:": "Length:",
  "Cho phép (Allow)": "Allow",
  "Chuông cảnh báo": "Alarm Bell",
  "Chính bạn": "You",
  "Chính sách": "Policy",
  "Chúc may mắn": "Good luck",
  "Chưa chọn": "Not selected",
  "Chưa có": "None",
  "Chưa có GPS": "No GPS",
  "Chưa có phiên": "No active session",
  "Chưa kiểm chứng": "Unverified",
  "Chưa làm": "Not done",
  "Chưa phân quận": "Unassigned district",
  "Chưa xác định": "Undefined",
  "Chưa đăng nhập:": "Not logged in:",
  "Chưa đặt": "Not set",
  "Chất": "Substance",
  "Chất Chủ Yếu": "Primary Pollutant",
  "Chất Chủ Đạo": "Dominant Pollutant",
  "Chất lượng KK": "Air Quality",
  "Chất lượng khí": "Air Quality",
  "Chế độ sáng": "Light Mode",
  "Chế độ tối": "Dark Mode",
  "Chỉ Số AQI": "AQI Index",
  "Chỉ bạn bè": "Friends Only",
  "Chỉ số PM2.5": "PM2.5 Index",
  "Chỉ số Xanh": "Green Index",
  "Chờ thực hiện": "Pending Execution",
  "Chờ tín hiệu...": "Waiting for signal...",
  "Chờ xác minh": "Pending Verification",
  "CÔNG DÂN GREENSPOT": "GREENSPOT CITIZEN",
  "Cài đặt": "Settings",
  "Cài đặt chung": "General Settings",
  "Cá nhân": "Personal",
  "Cách 1.8km": "1.8km away",
  "Cách 140m": "140m away",
  "Cách 180m": "180m away",
  "Cách 2.5km": "2.5km away",
  "Cách 4.8km": "4.8km away",
  "Cách 45m": "45m away",
  "Còn hàng": "In stock",
  "Còn hạn": "Valid",
  "Công Dân Xanh": "Green Citizen",
  "Công dân": "Citizen",
  "Công dân GreenSpot": "GreenSpot Citizen",
  "Cơ cấu": "Structure",
  "CẢNH BÁO": "WARNING",
  "CẢNH BÁO NGẬP": "FLOOD WARNING",
  "Cảnh báo SLA": "SLA Warning",
  "Cảnh báo khẩn": "Emergency Alert",
  "CẤP HIỆN TẠI": "CURRENT TIER",
  "Cấp hiện tại:": "Current Tier:",
  "Cần Giờ": "Can Gio",
  "Cần duyệt": "Needs Review",
  "Cần giúp đỡ": "Needs Help",
  "CẬP NHẬT": "UPDATE",
  "Cập nhật": "Update",
  "Cộng/trừ điểm": "Adjust points",
  "Củ Chi": "Cu Chi",
  "Cửa hàng": "Store / Shop",
  "Danh sách": "List",
  "Dài 2.2 km": "2.2 km long",
  "Dân cư chung:": "General residents:",
  "Dễ chịu": "Pleasant / Moderate",
  "DỪNG": "STOP",
  "Dữ liệu mới:": "New data:",
  "GIAO DIỆN": "INTERFACE",
  "GIỚI HẠN": "LIMIT",
  "GPS của tôi": "My GPS",
  "Gia hạn:": "Extend:",
  "Giao lệnh": "Dispatch Order",
  "Giao thông": "Traffic",
  "Giám sát": "Monitor",
  "Gió (km/h)": "Wind (km/h)",
  "Giọng nói": "Voice",
  "Giới thiệu": "Introduction",
  "GloFAS Vệ tinh": "GloFAS Satellite",
  "Google Vệ tinh": "Google Satellite",
  "Google Đường phố": "Google Street",
  "Gò Vấp": "Go Vap",
  "Gắn vị trí": "Attach Location",
  "Gọi đội": "Call Team",
  "Gốc (0%)": "Original (0%)",
  "Gộp": "Merge",
  "Gộp trùng": "Merge Duplicates",
  "Gỡ gắn thẻ": "Remove Tag",
  "Gỡ vị trí": "Remove Location",
  "Gợi ý nhanh:": "Quick tips:",
  "Gửi lại mã": "Resend code",
  "Gửi đánh giá": "Submit Review",
  "HIỆN TẠI": "CURRENT",
  "Hiệu quả 99%": "99% Efficiency",
  "Hoạt động": "Active",
  "Huyện": "District / County",
  "Huỷ": "Cancel",
  "Huỷ yêu cầu": "Cancel Request",
  "Hành trình xanh": "Green Journey",
  "Hành động": "Action",
  "Hành động:": "Action:",
  "Hóc Môn": "Hoc Mon",
  "Hạn Dùng": "Expiration Date",
  "Hạn SLA:": "SLA Deadline:",
  "Hạng Của Bạn": "Your Rank",
  "Hạng Mục": "Category",
  "HẾT HẠN": "EXPIRED",
  "Hết hàng": "Out of stock",
  "Hết hạn": "Expired",
  "Hệ thống": "System",
  "Hệ thực vật": "Flora",
  "Họ tên": "Full Name",
  "Họ tên *": "Full Name *",
  "HỦY": "CANCEL",
  "Hủy chọn nhóm": "Deselect group",
  "KHÓA": "LOCK",
  "KHẨN": "URGENT",
  "KHẨN CẤP": "CRITICAL / URGENT",
  "KHỐI HÀNH ĐỘNG": "ACTION BLOCK",
  "KHỐI SỐ DƯ": "BALANCE BLOCK",
  "KHỐI TÓM TẮT": "SUMMARY BLOCK",
  "Khoảng Thời Gian:": "Time Range:",
  "Khoảng cách:": "Distance:",
  "Khoảng thời gian:": "Time range:",
  "Khu vực:": "Area:",
  "Khác": "Other",
  "Khách vãng lai": "Guest",
  "Khám phá": "Explore",
  "Khí Tượng Học": "Meteorology",
  "Khí tượng": "Meteorology",
  "Khóa tài khoản": "Lock Account",
  "Không có ảnh": "No image",
  "Không khí (AQI)": "Air Quality (AQI)",
  "Không khỏe mạnh": "Unhealthy",
  "Không mây": "Clear sky",
  "Không thời hạn": "Permanent / No Expiration",
  "Không trùng": "Not duplicate",
  "Khảo sát": "Survey",
  "Khối Nội dung": "Content Block",
  "Khối Tuỳ chọn": "Options Block",
  "Khối mức phạt": "Penalty Block",
  "Khối Đăng": "Publish Block",
  "Khởi đầu": "Starter / Level 1",
  "Kiểm chứng": "Verification",
  "Kích hoạt ngay": "Activate Now",
  "KẾT LUẬN AI": "AI CONCLUSION",
  "KẾT QUẢ": "RESULTS",
  "Kết quả:": "Result:",
  "Liên hệ": "Contact",
  "Loại": "Type",
  "Loại Biến Động:": "Fluctuation Type:",
  "Loại hoạt động": "Activity Type",
  "Loại hành động:": "Action Type:",
  "Loại phế thải": "Waste Type",
  "Loại quà tặng": "Reward Type",
  "Loại rủi ro:": "Risk Type:",
  "Loại sự cố": "Incident Type",
  "Loại sự cố:": "Incident Type:",
  "Loại:": "Type:",
  "Làm Mới": "Refresh",
  "Làm mới": "Refresh",
  "Làm mới sau:": "Refresh in:",
  "Lá phổi xanh": "Green Lung",
  "Lý do mẫu:": "Sample reason:",
  "LƯU CÀI ĐẶT": "SAVE SETTINGS",
  "LƯU THAY ĐỔI": "SAVE CHANGES",
  "Lưu quyền": "Save Permissions",
  "Lưu vực:": "Catchment basin:",
  "Lượng Mưa (mm)": "Rainfall (mm)",
  "LỆNH CỦA BẠN": "YOUR ORDERS",
  "LỆNH HIỆN TẠI": "CURRENT ORDER",
  "Lệnh điều phối": "Dispatch Order",
  "LỌC": "FILTER",
  "Lọc": "Filter",
  "Lỗi GPS:": "GPS Error:",
  "Lỗi bắt GPS:": "GPS Acquisition Error:",
  "Lỗi micro:": "Microphone Error:",
  "Lỗi đăng bài:": "Post Error:",
  "Lộ trình né:": "Detour Route:",
  "Lớp": "Layer",
  "Lớp bản đồ:": "Map Layers:",
  "Menu quản trị": "Admin Menu",
  "Menu tài khoản": "Account Menu",
  "Menu điều hướng": "Navigation Menu",
  "Miền Bắc": "Northern Region",
  "Miền Nam": "Southern Region",
  "Miền Trung": "Central Region",
  "MÃ VOUCHER": "VOUCHER CODE",
  "MÃ VOUCHER:": "VOUCHER CODE:",
  "Màn 1/4": "Screen 1/4",
  "Màn 3/4": "Screen 3/4",
  "Mây che phủ": "Cloud Cover",
  "Mây dày": "Heavy Clouds",
  "Mây mỏng": "Thin Clouds",
  "Mã SC:": "Incident Code:",
  "Mã chứng từ:": "Voucher Code:",
  "Mã cụm": "Cluster Code",
  "Mã hồ sơ": "Dossier ID",
  "Mã sự cố": "Incident ID",
  "Môi trường": "Environment",
  "Mưa & Sét": "Rain & Lightning",
  "Mưa (mm)": "Rainfall (mm)",
  "Mưa nhẹ": "Light rain",
  "Mưa đá/Bão": "Hail / Storm",
  "Mạnh": "Strong",
  "Mầm Xanh": "Green Sprout",
  "Mật khẩu": "Password",
  "Mật khẩu mới": "New Password",
  "Mật khẩu:": "Password:",
  "Mẹo hữu ích:": "Useful Tips:",
  "Mới": "New",
  "Mới:": "New:",
  "MỞ KHÓA": "UNLOCK",
  "Mức Cảnh Báo": "Warning Level",
  "Mức khẩn cấp:": "Emergency Level:",
  "Mức thay đổi:": "Change Level:",
  "Mực nước ngập": "Flood Water Level",
  "Mực nước triều": "Tide Level",
  "NGÔN NGỮ": "LANGUAGE",
  "NGƯỜI CỨU HỘ": "RESCUER",
  "NGƯỜI PHẢN ÁNH:": "REPORTER:",
  "NHÓM TRÙNG": "DUPLICATE GROUP",
  "Nguyên nhân:": "Cause:",
  "Nguồn OpenStreetMap": "OpenStreetMap Source",
  "Ngày": "Date",
  "Ngày sinh": "Date of Birth",
  "Người báo cáo:": "Reporter:",
  "Người cần cứu": "Victim in need of rescue",
  "Người cứu hộ": "Rescuer",
  "Người dùng mới": "New Users",
  "Người gieo mầm": "Green Planter",
  "Người gặp nạn": "Disaster Victim",
  "Người gửi": "Sender",
  "Người kêu cứu": "Person Calling for Help",
  "Người thực hiện": "Assignee",
  "Ngưỡng tối thiểu:": "Minimum Threshold:",
  "Nhiệt Độ (°C)": "Temperature (°C)",
  "Nhiệt độ": "Temperature",
  "Nhiệt độ (°C)": "Temperature (°C)",
  "Nhà Bè": "Nha Be",
  "Nhóm": "Group",
  "Nhóm 1": "Group 1",
  "Nhóm 2": "Group 2",
  "Nhóm của bạn": "Your Groups",
  "Nhóm mới": "New Group",
  "Nhóm tình nguyện": "Volunteer Groups",
  "Nhạy cảm (101-150)": "Sensitive (101-150)",
  "Nhận yêu cầu": "Accept Request",
  "Nhập lại": "Re-enter",
  "Nitơ Điôxít (NO₂)": "Nitrogen Dioxide (NO2)",
  "NÓI TIẾP": "CONTINUE SPEAKING",
  "Né ngập": "Flood Avoidance",
  "Nói tiếp": "Continue Speaking",
  "Nút Tìm kiếm": "Search Button",
  "Nút micro lớn": "Large Microphone Button",
  "Năm 2025": "Year 2025",
  "Nộp nhiệm vụ": "Submit Mission",
  "PHÂN TÍCH": "ANALYSIS",
  "PHẢN HỒI": "FEEDBACK",
  "Phân quyền": "Permissions",
  "Phóng to": "Zoom In",
  "Phú Mỹ Hưng": "Phu My Hung",
  "Phú Nhuận": "Phu Nhuan",
  "Phường 13": "Ward 13",
  "Phạm vi TP.HCM:": "HCMC Area:",
  "Phạt vi phạm": "Penalty Violations",
  "Pin cũ": "Used batteries",
  "QUYẾT ĐỊNH": "DECISION",
  "Quang phổ": "Spectrum",
  "Quang đãng (0%)": "Clear (0%)",
  "Quy chuẩn GIS": "GIS Standards",
  "Quyền riêng tư": "Privacy Rights",
  "Quá hạn": "Overdue",
  "Quét mã QR": "Scan QR Code",
  "Quét quanh đây": "Scan Nearby",
  "Quý này": "This Quarter",
  "Quận / Huyện": "District",
  "Quận / Huyện:": "District:",
  "Quận/Huyện:": "District:",
  "Radar Khí Tượng": "Meteorological Radar",
  "Radar thời tiết": "Weather Radar",
  "Riêng tư": "Private",
  "Rác sinh hoạt": "Domestic Waste",
  "Rác thải": "Waste",
  "Rác thải nhựa": "Plastic Waste",
  "RẤT CAO": "VERY HIGH",
  "Rất nghiêm trọng": "Very Severe",
  "Rất to": "Very Large",
  "Rất xấu (201-300)": "Very Poor (201-300)",
  "Rủi ro": "Risk",
  "Rủi ro thấp": "Low Risk",
  "SO SÁNH": "COMPARE",
  "Sau khi bấm": "After clicking",
  "Sinh thái": "Ecological",
  "Sinh thái mới": "New Eco",
  "Sinh động": "Dynamic",
  "Sáng": "Light",
  "Sóng biển": "Sea Waves",
  "Sóng âm": "Sound Waves",
  "Sẵn sàng": "Ready",
  "Số nhà (OSM)": "House Number (OSM)",
  "Số điện thoại": "Phone Number",
  "Sổ tay rác": "Waste Handbook",
  "Sửa": "Edit",
  "Sửa dữ liệu": "Edit Data",
  "Sự cố:": "Incident:",
  "THAO TÁC": "ACTIONS",
  "THÊM": "ADD",
  "THÊM (CREATE)": "ADD (CREATE)",
  "THẤP": "LOW",
  "TIẾN ĐỘ": "PROGRESS",
  "TRUNG BÌNH": "MEDIUM",
  "TRUY CẬP": "ACCESS",
  "TRUY CẬP (ACCESS)": "ACCESS",
  "TUỲ CHỌN": "OPTIONS",
  "TÙY CHỌN": "OPTIONS",
  "Tham gia từ:": "Joined since:",
  "Thao Tác": "Actions",
  "Theo dõi": "Follow",
  "Thiết bị này": "This Device",
  "Thu nhỏ": "Zoom Out",
  "Thu nhỏ ▲": "Collapse ▲",
  "Thuật toán:": "Algorithm:",
  "Thành phố": "City",
  "Tháng": "Month",
  "Tháp (150m+)": "Tower (150m+)",
  "Thông báo": "Notifications",
  "Thấp": "Low",
  "Thấp (0-15m)": "Low (0-15m)",
  "Thẩm định AI": "AI Triage",
  "Thống kê Admin": "Admin Statistics",
  "Thời gian": "Time",
  "Thời gian gửi:": "Sent Time:",
  "Thời gian:": "Time:",
  "Thủ Đức": "Thu Duc",
  "Thử thách": "Challenges",
  "Thử thách xanh": "Green Challenges",
  "Thực hiện ngay": "Execute Now",
  "Tiêu thoát:": "Drainage:",
  "Tiêu đề:": "Title:",
  "Tiến độ tuần": "Weekly Progress",
  "Tiếng Việt": "Vietnamese",
  "Tiếp nhận": "Received",
  "Tiếp nhận lệnh": "Accept Order",
  "Tiếp tục nhập": "Continue typing",
  "Toàn Cảnh": "Overview / Panoramic",
  "Toàn cộng đồng": "All Community",
  "Toàn thành phố": "City-wide",
  "Toạ độ GPS:": "GPS Coordinates:",
  "Tra cứu phạt": "Penalty Lookup",
  "Trang tiếp": "Next Page",
  "Trang trước": "Previous Page",
  "Trong ngày": "During Day",
  "Trong vùng đệm": "Within Buffer Zone",
  "Trung bình": "Medium",
  "Trung tâm": "Center",
  "Trái tim xanh": "Green Heart",
  "Tránh ngập:": "Avoid Flooding:",
  "Trước": "Previous",
  "Trường học": "Schools",
  "Trạm y tế": "Medical Stations",
  "Trạng thái:": "Status:",
  "Trần Tối Đa": "Maximum Ceiling",
  "Trồng cây xanh": "Plant Green Trees",
  "Trở về WebGIS": "Back to WebGIS",
  "Trợ lý:": "Assistant:",
  "Trợ năng (Accessibility)": "Accessibility",
  "Trực tiếp": "Live",
  "Tuần": "Week",
  "Tuần này": "This Week",
  "Tuỳ chỉnh": "Customize",
  "TÓM TẮT AI": "AI SUMMARY",
  "Tài khoản": "Account",
  "Tài khoản:": "Account:",
  "Tái chế rác": "Recycle Waste",
  "Tân Bình": "Tan Binh",
  "Tân Phú": "Tan Phu",
  "Tên hoặc email...": "Name or email...",
  "Tên điểm nóng": "Hotspot Name",
  "Tình nguyện viên": "Volunteers",
  "Tùy biến": "Customize",
  "Tùy chỉnh": "Customize",
  "Túi nilon": "Plastic bags",
  "Tương quan yếu": "Weak correlation",
  "Tạm dừng xe": "Pause vehicle",
  "Tạo lệnh": "Create Order",
  "Tạo lệnh mới": "Create New Order",
  "Tạo tài khoản": "Create Account",
  "Tất cả": "All",
  "Tất cả quận/huyện": "All Districts",
  "Tắt Camera": "Turn Off Camera",
  "Tắt flash": "Turn Off Flash",
  "Tệp CSV (.csv)": "CSV File (.csv)",
  "Tỉnh Thành": "Province / City",
  "Tọa độ GPS": "GPS Coordinates",
  "Tọa độ:": "Coordinates:",
  "Tốc Độ Gió": "Wind Speed",
  "Tối": "Dark",
  "Tốt": "Good",
  "Tốt (0-50)": "Good (0-50)",
  "Tồn Kho": "Inventory",
  "TỔNG ĐIỂM": "TOTAL POINTS",
  "Tổ chức": "Organizations",
  "Tổ chức (x2)": "Organizations (x2)",
  "Tổng Lượng Mưa": "Total Rainfall",
  "Tổng Quan AQI": "AQI Overview",
  "Tổng lệnh": "Total Orders",
  "Tổng phản ánh": "Total Reports",
  "Tổng Điểm Xanh": "Total Green Points",
  "Tổng điểm": "Total Points",
  "Từ": "From",
  "Từ chối": "Declined",
  "Từ ngày": "From Date",
  "Từ ngày:": "From Date:",
  "U ám (100%)": "Overcast (100%)",
  "Vai trò:": "Role:",
  "Vòng quay": "Lucky Wheel",
  "Vùng Miền": "Regions",
  "Vùng sinh thái": "Ecological Zone",
  "Vượt chuẩn": "Exceeding standard",
  "Vận hành 24/7": "24/7 Operations",
  "Vị trí": "Location",
  "Vị trí:": "Location:",
  "Vỏ hộp sữa": "Milk cartons",
  "Vừa": "Moderate",
  "Vừa phải": "Moderate",
  "Vừa phải (51-100)": "Moderate (51-100)",
  "Vừa xong": "Just now",
  "Vừa đến": "Just arrived",
  "XEM TRƯỚC BÀI": "PREVIEW POST",
  "XOÁ": "DELETE",
  "XUẤT DANH SÁCH": "EXPORT LIST",
  "Xe máy": "Motorbike",
  "Xe đạp": "Bicycle",
  "Xem bản đồ": "View Map",
  "Xem lịch sử": "View History",
  "Xem thêm": "View More",
  "Xem ví điểm": "View Points Wallet",
  "Xem điều phối": "View Dispatch",
  "Xem điểm nóng": "View Hotspots",
  "Xin chào": "Hello",
  "Xoá tệp này": "Delete this file",
  "Xoá vai trò": "Delete Role",
  "Xoá vĩnh viễn": "Delete Permanently",
  "Xuất": "Export",
  "Xuất Excel": "Export Excel",
  "Xuất Excel (.xlsx)": "Export Excel (.xlsx)",
  "Xuất PDF": "Export PDF",
  "Xuất PDF (.pdf)": "Export PDF (.pdf)",
  "Xuất báo cáo": "Export Report",
  "Xuất danh sách": "Export List",
  "Xuất dữ liệu": "Export Data",
  "Xuất nhật ký": "Export Audit Logs",
  "Xuất sự cố": "Export Incidents",
  "XÁC THỰC EMAIL": "VERIFY EMAIL",
  "XÓA VĨNH VIỄN": "DELETE PERMANENTLY",
  "Xác nhận hủy": "Confirm Cancellation",
  "Xóa tệp": "Delete file",
  "Xóa vĩnh viễn": "Delete Permanently",
  "Xả khói bụi": "Smoke & Dust Emission",
  "Xấu (151-200)": "Poor (151-200)",
  "Yếu": "Weak",
  "Ô nhiễm": "Pollution",
  "Ô nhiễm nước": "Water Pollution",
  "Ô tô": "Car",
  "Ý định chung": "General Intent",
  "Ăn uống": "Food & Beverage",
  "ĐANG NGHE...": "LISTENING...",
  "ĐANG PHÁT SÓNG...": "BROADCASTING...",
  "Đang BẬT": "Active / ON",
  "Đang TẮT": "Inactive / OFF",
  "Đang bắt nét…": "Focusing camera…",
  "Đang cập nhật...": "Updating...",
  "Đang di chuyển": "In Transit",
  "Đang gửi mã...": "Sending code...",
  "Đang gửi...": "Sending...",
  "Đang gửi…": "Sending…",
  "Đang hoạt động": "Active",
  "Đang hoạt động:": "Active:",
  "Đang huỷ...": "Cancelling...",
  "Đang khóa quyền...": "Locking permissions...",
  "Đang khởi tạo...": "Initializing...",
  "Đang kiểm tra...": "Checking...",
  "Đang làm": "In Progress",
  "Đang lọc...": "Filtering...",
  "Đang ping...": "Ping in progress...",
  "Đang quay…": "Spinning…",
  "Đang quét...": "Scanning...",
  "Đang truy vấn...": "Querying...",
  "Đang tìm kiếm…": "Searching…",
  "Đang tải thêm…": "Loading more…",
  "Đang tải...": "Loading...",
  "Đang tải…": "Loading…",
  "Đang xoá...": "Deleting...",
  "Đang xuất...": "Exporting...",
  "Đang xác thực...": "Verifying...",
  "Đang xử lý…": "Processing…",
  "Đang đăng bài…": "Publishing post…",
  "Đang đăng...": "Posting...",
  "Đang đến (EN_ROUTE)": "En Route (EN_ROUTE)",
  "Đang đổi...": "Redeeming...",
  "Điều Khiển Radar": "Radar Controls",
  "Điều hướng chính": "Main Navigation",
  "Điều khoản": "Terms & Conditions",
  "Điều phối": "Dispatch",
  "Điều phối viên": "Dispatch Coordinator",
  "Điểm Xanh": "Green Points",
  "Điểm cộng (+)": "Plus points (+)",
  "Điểm của tôi:": "My points:",
  "Điểm hiện có": "Available Points",
  "Điểm hiện tại": "Current Points",
  "Điểm ngập": "Flood Point",
  "Điểm ngập nước": "Waterlogged Point",
  "Điểm nóng 7N": "7-Day Hotspots",
  "Điểm rủi ro": "Risk Points",
  "Điểm rủi ro:": "Risk Score:",
  "Điểm trừ (-)": "Minus points (-)",
  "Điểm xanh": "Green Points",
  "Điểm Đổi": "Points Required",
  "Điểm đi (A):": "Origin (A):",
  "Điểm đi:": "Origin:",
  "Điểm đã dùng": "Used Points",
  "Điểm đến": "Destination",
  "Điểm đến (B):": "Destination (B):",
  "Điểm đến:": "Destination:",
  "Đo đạc...": "Measuring...",
  "Đoạn đường:": "Road segment:",
  "ĐÃ DÙNG": "USED",
  "ĐÃ HUỶ LỆNH": "ORDER CANCELLED",
  "ĐÃ TẠO TỆP": "FILE CREATED",
  "ĐÃ ĐĂNG BÀI": "POST PUBLISHED",
  "ĐÓNG": "CLOSE",
  "Đánh Giá": "Ratings / Evaluation",
  "Đánh giá:": "Evaluation:",
  "Đã bị khóa": "Locked",
  "Đã dùng": "Used",
  "Đã giao lệnh": "Order Dispatched",
  "Đã gửi": "Sent",
  "Đã hoàn thành": "Completed",
  "Đã hoàn tất": "Completed",
  "Đã huỷ": "Cancelled",
  "Đã lưu lúc:": "Saved at:",
  "Đã lưu nháp": "Draft Saved",
  "Đã nhận": "Received",
  "Đã sử dụng": "Used",
  "Đã thu gom": "Collected",
  "Đã xoá": "Deleted",
  "Đã đóng": "Closed",
  "Đã ẩn": "Hidden",
  "Đích đến": "Destination",
  "Đóng (Esc)": "Close (Esc)",
  "Đóng chat": "Close chat",
  "Đóng cảnh báo": "Close alert",
  "Đóng cửa sổ": "Close window",
  "Đóng lệnh": "Close order",
  "Đóng lộ trình": "Close route",
  "Đóng popup": "Close popup",
  "Đóng thông báo": "Close notification",
  "Đóng xem ảnh": "Close photo preview",
  "Đông Hưng Thuận": "Dong Hung Thuan",
  "ĐĂNG": "PUBLISH",
  "Đăng bài": "Publish Post",
  "Đăng ký": "Register",
  "Đăng ký ngay": "Register Now",
  "Đăng nhập": "Login",
  "Đăng nhập ngay": "Login Now",
  "Đăng vào nhóm": "Post to group",
  "Đến ngày": "To Date",
  "Đến ngày:": "To Date:",
  "Địa chỉ IP": "IP Address",
  "Địa chỉ IP:": "IP Address:",
  "Địa chỉ:": "Address:",
  "Địa hình": "Terrain",
  "Địa điểm": "Location",
  "Đối lưu mạnh": "Strong Convection",
  "Đồng ý hủy": "Confirm Cancel",
  "Đổi mật khẩu": "Change Password",
  "Đổi quyền": "Change Permissions",
  "Đổi quà": "Redeem Gift",
  "Đổi quà tặng": "Redeem Gifts",
  "Đổi thưởng": "Redeem Rewards",
  "Đổi vai trò": "Change Role",
  "Độ khẩn cấp": "Urgency Level",
  "Độ sâu chuẩn:": "Standard Depth:",
  "Độ sâu:": "Depth:",
  "Độ trễ GPS:": "GPS Latency:",
  "Độ trễ: ~0s": "Latency: ~0s",
  "Độ Ẩm (%)": "Humidity (%)",
  "Độ ẩm (%)": "Humidity (%)",
  "Đội cứu hộ": "Rescue Team",
  "Đội nhận:": "Assigned Team:",
  "Đội phản ứng": "Rapid Response Team",
  "Đội phản ứng:": "Response Team:",
  "Đội phụ trách:": "Team in charge:",
  "đăng nhập": "Login",
  "ƯU TIÊN": "PRIORITY",
  "Ưu tiên": "Priority",
  "Ưu tiên:": "Priority:",
  "Ảnh": "Photos",
  "Ảnh bìa": "Cover Photo",
  "Ảnh vệ tinh": "Satellite Image",
  "Ảnh đại diện": "Avatar",
  "Ảnh/video": "Photos/Videos",
  "Ẩn thông báo": "Hide notification",
  "Ổ khóa (🔒)": "Lock (🔒)",
  "Duyệt ngay": "Approve Now",
  "Đã chép": "Copied",
  "Đã xong": "Done",
  "Toàn quốc": "Nationwide",
  "Đà Nẵng": "Da Nang",
  "Công khai": "Public",
  "Cần Thơ": "Can Tho",
  "Bị chặn": "Blocked",
  "Hà Nội": "Hanoi",
  "Biển Đông": "East Sea",
  "Cấp Quận": "District Level",
  "Tổng quan": "Overview",
  "Sao chép": "Copy",
  "LỘ TRÌNH": "ROUTE",
  "Bỏ vào:": "Put in:",
  "Nghe lại": "Replay",
  "Đang đọc...": "Reading...",
  "Tìm đường": "Find Route",
  "Ẩn danh": "Anonymous",
  "Điều hướng": "Navigate",
  "Cấp cứu:": "Emergency:",
  "Cứu hỏa:": "Fire Department:",
  "Đang dò...": "Probing...",
  "Đang bận": "Busy",
  "BÌNH THƯỜNG": "NORMAL",
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

const CACHE_STORAGE_KEY = "greenspot_i18n_cache_v2";

const loadCachedTranslations = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCachedTranslations = (cache: Record<string, string>) => {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Quota handled safely
  }
};

const asyncTranslationCache: Record<string, string> = loadCachedTranslations();
const inFlightRequests = new Set<string>();
const pendingBatchQueue = new Set<string>();
let batchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let observer: MutationObserver | null = null;
let isTranslating = false;
let activeLang: "VI" | "EN" = "VI";

function flushBatchQueue() {
  if (pendingBatchQueue.size === 0) return;
  const itemsToTranslate = Array.from(pendingBatchQueue).slice(0, 50);
  itemsToTranslate.forEach((item) => pendingBatchQueue.delete(item));

  api
    .post<{ translations: string[] }>("/api/v1/translation/batch", {
      texts: itemsToTranslate,
      target_lang: "en",
      source_lang: "vi",
    })
    .then((res) => {
      itemsToTranslate.forEach((item) => inFlightRequests.delete(item));
      const translations = res.data?.translations;
      if (Array.isArray(translations) && translations.length === itemsToTranslate.length) {
        let hasNew = false;
        itemsToTranslate.forEach((original, idx) => {
          const trans = translations[idx];
          if (trans && trans.trim()) {
            asyncTranslationCache[original] = trans.trim();
            hasNew = true;
          }
        });
        if (hasNew) {
          saveCachedTranslations(asyncTranslationCache);
          if (activeLang === "EN") {
            requestAnimationFrame(() => applyDOMTranslation(document.body, "EN"));
          }
        }
      }
    })
    .catch(() => {
      itemsToTranslate.forEach((item) => inFlightRequests.delete(item));
    });
}

function queueBatchTranslation(text: string) {
  if (inFlightRequests.has(text) || asyncTranslationCache[text]) return;
  inFlightRequests.add(text);
  pendingBatchQueue.add(text);
  if (batchDebounceTimer) clearTimeout(batchDebounceTimer);
  batchDebounceTimer = setTimeout(flushBatchQueue, 50);
}

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

    // 5. If string was partially replaced by domain/location patterns (proper nouns of streets/teams/incidents remain), romanize them cleanly!
    if (replaced && /[\u00C0-\u1EF9]/i.test(result)) {
      result = stripVietnameseAccents(result);
    }

    if (replaced) {
      asyncTranslationCache[trimmed] = result.trim();
      return result;
    }

    // 6. Asynchronous high-performance batch translation for Vietnamese phrases and sentences
    if (/[\u00C0-\u1EF9]/i.test(trimmed) && trimmed.length >= 2) {
      queueBatchTranslation(trimmed);
    }

    // If still completely untranslated, strip accents as final fallback to guarantee no raw diacritics
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
