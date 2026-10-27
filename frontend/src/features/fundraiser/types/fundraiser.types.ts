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

