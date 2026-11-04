"""
Bilingual System Domain Dictionary (VI <-> EN)
Provides high-speed O(1) mappings for environmental, urban, GIS, status, and role metadata.
"""

VI_TO_EN_DICTIONARY = {
    # 1. Categories & Incident Types
    "bãi rác tự phát": "Illegal Dump Site",
    "bãi rác": "Dump Site / Waste Pile",
    "rác sinh hoạt": "Domestic Waste",
    "rác thải sinh hoạt": "Domestic Waste",
    "rác thải nhựa": "Plastic Waste",
    "chất thải công nghiệp": "Industrial Waste",
    "rác công nghiệp/nguy hại": "Industrial / Hazardous Waste",
    "chất thải nguy hại": "Hazardous Waste",
    "xà bần / vật liệu xây dựng": "Construction Debris",
    "xà bần": "Construction Debris",
    "rác nguy hại": "Hazardous Waste",
    "điểm ngập úng": "Flood Point / Inundation Hotspot",
    "ngập úng": "Flooding",
    "ngập nước": "Flooding",
    "nước thải": "Wastewater",
    "khí thải": "Emissions & Exhaust Gas",
    "tiếng ồn": "Noise Pollution",
    "tiếng ồn đô thị": "Urban Noise Pollution",
    "ô nhiễm không khí": "Air Pollution",
    "ô nhiễm nguồn nước": "Water Pollution",
    "cháy rừng / cháy cỏ": "Vegetation / Bush Fire",
    "cây xanh ngã đổ": "Fallen Tree Hazard",
    "hố ga mất nắp": "Missing Manhole Cover",
    "tắc nghẽn cống thoát nước": "Clogged Drainage Sewer",

    # 1.1 Specific Penalty Descriptions & Legal Previews
    "vứt rác vỉa hè, lòng đường, vứt tàn thuốc lá, không phân loại rác tại nguồn.": "Littering on sidewalks and roads, throwing cigarette butts, not sorting waste at source.",
    "chôn lấp chất thải nguy hại, đốt chất thải công nghiệp ngoài cơ sở được cấp phép.": "Burying hazardous waste, burning industrial waste outside licensed facilities.",
    "xả nước thải sinh hoạt vào cống thoát nước mưa, xả trộm nước thải ra kênh rạch, sông suối.": "Discharging domestic wastewater into stormwater drains, illegally dumping wastewater into canals and rivers.",
    "thải khí thải công nghiệp nguy hại vượt chuẩn, đốt rác sinh hoạt lộ thiên gây khói bụi.": "Discharging hazardous industrial emissions exceeding standards, open burning of domestic waste causing smoke and dust.",
    "gây tiếng ồn vượt quy chuẩn kỹ thuật tại khu dân cư, sử dụng loa phóng thanh quá giờ quy định.": "Exceeding technical noise standards in residential areas, using loudspeakers beyond permitted hours.",
    "cẩm nang pháp lý & xử phạt vi phạm môi trường": "Environmental Legal Handbook & Penalty Regulations",
    "căn cứ: nghị định 45/2022/nđ-cp": "Basis: Decree 45/2022/ND-CP",
    "tra cứu quy định xử phạt": "Penalty Regulations Lookup",
    "hệ thống pháp luật môi trường": "Environmental Legal Framework",

    # 2. Statuses
    "mới tiếp nhận": "Newly Received",
    "đang xử lý": "In Progress",
    "đang thẩm định": "Under Triage Review",
    "đã xác minh": "Verified",
    "đã giải quyết": "Resolved",
    "đã từ chối": "Rejected",
    "hoàn thành": "Completed",
    "chờ phân công": "Awaiting Dispatch",
    "đã phân công": "Dispatched",
    "đang ứng cứu": "Responding",
    "đã kích hoạt": "Activated",
    "đã hủy": "Cancelled",

    # 3. Severity & Priorities
    "thấp": "Low",
    "trung bình": "Medium",
    "cao": "High",
    "khẩn cấp": "Critical / Emergency",
    "báo động đỏ": "Red Alert",

    # 4. Facilities & Spatial POIs
    "trường học": "School",
    "bệnh viện": "Hospital",
    "trạm y tế": "Medical Clinic",
    "ủy ban nhân dân": "People's Committee",
    "công an phường": "Ward Police Station",
    "chợ dân sinh": "Local Market",
    "siêu thị": "Supermarket",
    "công viên": "Public Park",
    "hồ điều hòa": "Retention Lake",
    "trạm bơm thoát nước": "Drainage Pumping Station",
    "điểm tập kết rác": "Waste Collection Point",
    "trạm trung chuyển rác": "Waste Transfer Station",

    # 5. Roles & Actors
    "quản trị viên": "System Administrator",
    "quản trị viên cấp cao": "Super Admin",
    "cán bộ điều phối": "Operations Coordinator",
    "đội phản ứng nhanh": "Quick Response Team",
    "tình nguyện viên": "Green Volunteer",
    "công dân": "Citizen",
    "người phản ánh": "Reporter",

    # 6. Common Actions & Navigation
    "tổng quan": "Overview",
    "bản đồ môi trường": "Environmental GIS Map",
    "báo cáo sự cố": "Incident Report",
    "thẩm định ai": "AI Triage",
    "phát hiện trùng lặp": "Deduplication & Clustering",
    "định tuyến an toàn": "Safe Flood Routing",
    "bảng rủi ro đô thị": "Urban Risk Dashboard",
    "điều phối ứng cứu": "Operations Dispatch",
    "dự báo điểm nóng": "Hotspot 7-Day Forecast",
    "báo động khẩn cấp": "Emergency Alert",
    "sos cộng đồng": "Community Flood SOS",
    "xuất dữ liệu": "Data Export",
    "thống kê hoạt động": "System Activity Analytics",
    "cài đặt hệ thống": "System Settings",
    "đăng nhập": "Login",
    "đăng ký": "Register",
    "đăng xuất": "Logout",
}

# Inverted Dictionary (EN -> VI)
EN_TO_VI_DICTIONARY = {v.lower(): k for k, v in VI_TO_EN_DICTIONARY.items()}
