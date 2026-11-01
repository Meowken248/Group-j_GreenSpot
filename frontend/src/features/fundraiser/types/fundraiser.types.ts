export type FundraiserStatusType =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "closed";

export interface FundraiserCampaignItem {
  id?: string;
  campaign_id: string;
  creator_id: string;
  creator_name?: string | null;
  creator_avatar?: string | null;
  title: string;
  description: string;
  cover_image_url?: string | null;
  target_amount: number;
  total_donated: number;
  donation_count: number;
  donor_count?: number;
  total_spent: number;
  district: string;
  end_date: string; // YYYY-MM-DD
  status: FundraiserStatusType;
  rejection_reason?: string | null;
  days_left: number;
  percent_achieved: number;
  remaining_balance: number;
  created_at: string;
  updated_at?: string;

  // Bảo mật: chỉ trả về khi là Admin hoặc Creator
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
}

export interface FundraiserCampaignListResponse {
  items: FundraiserCampaignItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface FundraiserCampaignCreateInput {
  title: string;
  description: string;
  district: string;
  target_amount: number;
  end_date: string;
  cover_image_url?: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
}

export interface FundraiserCampaignUpdateInput {
  title?: string;
  description?: string;
  district?: string;
  target_amount?: number;
  end_date?: string;
  cover_image_url?: string;
}

export interface FundraiserDonationItem {
  id?: string;
  donation_id: string;
  campaign_id?: string;
  donor_id?: string | null;
  donor_name: string;
  amount: number;
  message?: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface FundraiserDonationCreateInput {
  amount: number;
  message?: string;
  is_anonymous: boolean;
}

export interface FundraiserExpenseItem {
  id?: string;
  expense_id: string;
  campaign_id?: string;
  content?: string;
  purpose?: string;
  amount: number;
  expense_date?: string;
  spent_date?: string;
  proof_image_url?: string;
  receipt_image_url?: string;
  created_at: string;
}

export interface FundraiserExpenseCreateInput {
  content: string;
  amount: number;
  expense_date: string;
  proof_image_url: string;
}

export interface FundraiserApprovalInput {
  action: "approve" | "reject";
  rejection_reason?: string;
}

export const VIETNAM_PROVINCES: string[] = [
  "Toàn quốc",
  // Miền Bắc
  "Hà Nội",
  "Hải Phòng",
  "Quảng Ninh",
  "Bắc Ninh",
  "Hải Dương",
  "Hưng Yên",
  "Hà Nam",
  "Nam Định",
  "Ninh Bình",
  "Thái Bình",
  "Vĩnh Phúc",
  "Hà Giang",
  "Cao Bằng",
  "Bắc Kạn",
  "Tuyên Quang",
  "Lào Cai",
  "Yên Bái",
  "Thái Nguyên",
  "Lạng Sơn",
  "Bắc Giang",
  "Phú Thọ",
  "Điện Biên",
  "Lai Châu",
  "Sơn La",
  "Hòa Bình",
  // Miền Trung & Tây Nguyên
  "Đà Nẵng",
  "Thừa Thiên Huế",
  "Quảng Nam",
  "Quảng Ngãi",
  "Bình Định",
  "Phú Yên",
  "Khánh Hòa",
  "Ninh Thuận",
  "Bình Thuận",
  "Thanh Hóa",
  "Nghệ An",
  "Hà Tĩnh",
  "Quảng Bình",
  "Quảng Trị",
  "Kon Tum",
  "Gia Lai",
  "Đắk Lắk",
  "Đắk Nông",
  "Lâm Đồng",
  // Miền Nam & ĐBSCL
  "TP. Hồ Chí Minh",
  "Cần Thơ",
  "Bình Dương",
  "Đồng Nai",
  "Bà Rịa - Vũng Tàu",
  "Tây Ninh",
  "Bình Phước",
  "Long An",
  "Tiền Giang",
  "Bến Tre",
  "Trà Vinh",
  "Vĩnh Long",
  "Đồng Tháp",
  "An Giang",
  "Kiên Giang",
  "Hậu Giang",
  "Sóc Trăng",
  "Bạc Liêu",
  "Cà Mau",
];

export const HCMC_DISTRICTS: string[] = [
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Quận Bình Thạnh",
  "Quận Bình Tân",
  "Quận Gò Vấp",
  "Quận Phú Nhuận",
  "Quận Tân Bình",
  "Quận Tân Phú",
  "Thành phố Thủ Đức",
  "Huyện Bình Chánh",
  "Huyện Cần Giờ",
  "Huyện Củ Chi",
  "Huyện Hóc Môn",
  "Huyện Nhà Bè",
];

export const HANOI_DISTRICTS: string[] = [
  "Quận Ba Đình",
  "Quận Hoàn Kiếm",
  "Quận Tây Hồ",
  "Quận Long Biên",
  "Quận Cầu Giấy",
  "Quận Đống Đa",
  "Quận Hai Bà Trưng",
  "Quận Hoàng Mai",
  "Quận Thanh Xuân",
  "Quận Nam Từ Liêm",
  "Quận Bắc Từ Liêm",
  "Quận Hà Đông",
  "Thị xã Sơn Tây",
  "Huyện Ba Vì",
  "Huyện Chương Mỹ",
  "Huyện Đan Phượng",
  "Huyện Đông Anh",
  "Huyện Gia Lâm",
  "Huyện Hoài Đức",
  "Huyện Mê Linh",
  "Huyện Mỹ Đức",
  "Huyện Phú Xuyên",
  "Huyện Phúc Thọ",
  "Huyện Quốc Oai",
  "Huyện Sóc Sơn",
  "Huyện Thạch Thất",
  "Huyện Thanh Oai",
  "Huyện Thanh Trì",
  "Huyện Thường Tín",
  "Huyện Ứng Hòa",
];

export const DANANG_DISTRICTS: string[] = [
  "Quận Hải Châu",
  "Quận Thanh Khê",
  "Quận Sơn Trà",
  "Quận Ngũ Hành Sơn",
  "Quận Liên Chiểu",
  "Quận Cẩm Lệ",
  "Huyện Hòa Vang",
  "Huyện Hoàng Sa",
];

export const CANTHO_DISTRICTS: string[] = [
  "Quận Ninh Kiều",
  "Quận Bình Thủy",
  "Quận Cái Răng",
  "Quận Ô Môn",
  "Quận Thốt Nốt",
  "Huyện Phong Điền",
  "Huyện Cờ Đỏ",
  "Huyện Thới Lai",
  "Huyện Vĩnh Thạnh",
];

export const HAIPHONG_DISTRICTS: string[] = [
  "Quận Hồng Bàng",
  "Quận Ngô Quyền",
  "Quận Lê Chân",
  "Quận Hải An",
  "Quận Kiến An",
  "Quận Đồ Sơn",
  "Quận Dương Kinh",
  "Huyện Thủy Nguyên",
  "Huyện An Dương",
  "Huyện An Lão",
  "Huyện Kiến Thụy",
  "Huyện Tiên Lãng",
  "Huyện Vĩnh Bảo",
  "Huyện Cát Hải",
  "Huyện Bạch Long Vĩ",
];

export const BINHDUONG_DISTRICTS: string[] = [
  "Thành phố Thủ Dầu Một",
  "Thành phố Dĩ An",
  "Thành phố Thuận An",
  "Thành phố Tân Uyên",
  "Thành phố Bến Cát",
  "Huyện Bàu Bàng",
  "Huyện Bắc Tân Uyên",
  "Huyện Dầu Tiếng",
  "Huyện Phú Giáo",
];

export const DONGNAI_DISTRICTS: string[] = [
  "Thành phố Biên Hòa",
  "Thành phố Long Khánh",
  "Huyện Long Thành",
  "Huyện Nhơn Trạch",
  "Huyện Trảng Bom",
  "Huyện Thống Nhất",
  "Huyện Cẩm Mỹ",
  "Huyện Vĩnh Cửu",
  "Huyện Xuân Lộc",
  "Huyện Định Quán",
  "Huyện Tân Phú",
];

export const BARIA_VUNGTAU_DISTRICTS: string[] = [
  "Thành phố Vũng Tàu",
  "Thành phố Bà Rịa",
  "Thị xã Phú Mỹ",
  "Huyện Châu Đức",
  "Huyện Côn Đảo",
  "Huyện Đất Đỏ",
  "Huyện Long Điền",
  "Huyện Xuyên Mộc",
];

export const KHANHHOA_DISTRICTS: string[] = [
  "Thành phố Nha Trang",
  "Thành phố Cam Ranh",
  "Thị xã Ninh Hòa",
  "Huyện Cam Lâm",
  "Huyện Diên Khánh",
  "Huyện Khánh Sơn",
  "Huyện Khánh Vĩnh",
  "Huyện Trường Sa",
  "Huyện Vạn Ninh",
];

export const LAMDONG_DISTRICTS: string[] = [
  "Thành phố Đà Lạt",
  "Thành phố Bảo Lộc",
  "Huyện Lạc Dương",
  "Huyện Đơn Dương",
  "Huyện Đức Trọng",
  "Huyện Lâm Hà",
  "Huyện Di Linh",
  "Huyện Bảo Lâm",
  "Huyện Đam Rông",
  "Huyện Đạ Huoai",
  "Huyện Đạ Tẻh",
  "Huyện Cát Tiên",
];

export const QUANGNINH_DISTRICTS: string[] = [
  "Thành phố Hạ Long",
  "Thành phố Cẩm Phả",
  "Thành phố Uông Bí",
  "Thành phố Móng Cái",
  "Thị xã Đông Triều",
  "Thị xã Quảng Yên",
  "Huyện Vân Đồn",
  "Huyện Tiên Yên",
  "Huyện Hải Hà",
  "Huyện Cô Tô",
  "Huyện Đầm Hà",
  "Huyện Bình Liêu",
  "Huyện Ba Chẽ",
];

export const THUATHIENHUE_DISTRICTS: string[] = [
  "Thành phố Huế",
  "Thị xã Hương Thủy",
  "Thị xã Hương Trà",
  "Huyện Phong Điền",
  "Huyện Quảng Điền",
  "Huyện Phú Vang",
  "Huyện Phú Lộc",
  "Huyện A Lưới",
  "Huyện Nam Đông",
];

export const VIETNAM_PROVINCE_DISTRICTS_MAP: Record<string, string[]> = {
  "TP. Hồ Chí Minh": HCMC_DISTRICTS,
  "Hà Nội": HANOI_DISTRICTS,
  "Đà Nẵng": DANANG_DISTRICTS,
  "Cần Thơ": CANTHO_DISTRICTS,
  "Hải Phòng": HAIPHONG_DISTRICTS,
  "Bình Dương": BINHDUONG_DISTRICTS,
  "Đồng Nai": DONGNAI_DISTRICTS,
  "Bà Rịa - Vũng Tàu": BARIA_VUNGTAU_DISTRICTS,
  "Khánh Hòa": KHANHHOA_DISTRICTS,
  "Lâm Đồng": LAMDONG_DISTRICTS,
  "Quảng Ninh": QUANGNINH_DISTRICTS,
  "Thừa Thiên Huế": THUATHIENHUE_DISTRICTS,
};

export function getDistrictsByProvince(provinceName: string): string[] {
  if (!provinceName || provinceName === "Toàn quốc") {
    return [];
  }
  if (VIETNAM_PROVINCE_DISTRICTS_MAP[provinceName]) {
    return VIETNAM_PROVINCE_DISTRICTS_MAP[provinceName];
  }
  // Mặc định đối với các tỉnh thành còn lại: Các đơn vị hành chính chuẩn
  return [
    `Thành phố trung tâm (${provinceName})`,
    `Thị xã trung tâm (${provinceName})`,
    `Khu vực Huyện phía Bắc (${provinceName})`,
    `Khu vực Huyện phía Nam (${provinceName})`,
    `Khu vực Huyện phía Đông (${provinceName})`,
    `Khu vực Huyện phía Tây (${provinceName})`,
    `Địa bàn toàn tỉnh (${provinceName})`,
  ];
}

