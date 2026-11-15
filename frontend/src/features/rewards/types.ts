/**
 * Types & Data Contracts for Features 28 & 29:
 * - Chức năng 28: Cơ chế tích lũy điểm thưởng Công dân Xanh
 * - Chức năng 29: Ví điểm và lịch sử biến động điểm xanh
 */

export interface PointPolicyItem {
  action_type: string;
  name: string;
  points: intNumber;
  description: string;
  icon: string;
  badge_label: string;
  daily_cap?: number | null;
  target_action_hint?: string | null;
}

export type intNumber = number;

export interface TierInfo {
  tier_code: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
  tier_name: string;
  min_points: number;
  badge_icon: string;
  color_hex: string;
  bg_gradient: string;
  description: string;
  benefits: string[];
}

export interface UserSummaryInPolicy {
  user_id: string;
  full_name: string;
  green_points: number;
  lifetime_points: number;
  tier_name: string;
  badge_icon: string;
  next_tier_name?: string | null;
  points_to_next_tier: number;
  progress_percent: number;
}

export interface PointPolicyResponse {
  policy_title: string;
  policy_description: string;
  actions: PointPolicyItem[];
  tiers: TierInfo[];
  user_summary?: UserSummaryInPolicy | null;
}

export interface DailyLimitItem {
  category: string;
  max_points: number;
  unit: string;
  note: string;
}

export interface FraudRuleItem {
  rule_type: string;
  title: string;
  description: string;
  penalty_text: string;
  penalty_points: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface DailyLimitsPolicyResponse {
  title: string;
  description: string;
  limits: DailyLimitItem[];
  conditions: string[];
  fraud_rules: FraudRuleItem[];
  appeal_guide: string;
}

export interface ClaimPointRequest {
  action_type: string;
  incident_id?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface ClaimPointResponse {
  success: boolean;
  points_awarded: number;
  new_balance: number;
  lifetime_points: number;
  current_tier: TierInfo;
  next_tier?: TierInfo | null;
  points_to_next_tier: number;
  tier_upgraded: boolean;
  upgraded_tier_name?: string | null;
  transaction_id: string;
  transaction_code: string;
  action_title: string;
  message: string;
}

export interface WalletSummaryResponse {
  user_id: string;
  full_name: string;
  email: string;
  green_points: number;
  lifetime_points: number;
  current_tier: TierInfo;
  next_tier?: TierInfo | null;
  points_to_next_tier: number;
  progress_percent: number;
  points_earned_this_week: number;
  points_spent_total: number;
  total_transactions_count: number;
  last_updated: string;
}

export interface TransactionHistoryItem {
  transaction_id: string;
  transaction_code: string;
  transaction_type: string;
  action_title: string;
  points_amount: number;
  balance_after: number;
  description?: string | null;
  created_at: string;
  status: string;
  is_positive: boolean;
}

export interface TransactionHistoryResponse {
  items: TransactionHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  total_earned: number;
  total_spent: number;
}

export interface TransactionDetailResponse {
  transaction_id: string;
  transaction_code: string;
  action_name: string;
  transaction_type: string;
  points_amount: number;
  is_positive: boolean;
  balance_after: number;
  status: string;
  created_at: string;
  formatted_time: string;
  description?: string | null;
  incident_id?: string | null;
  reward_id?: number | null;
  audit_note?: string | null;
}

// --------------------------------------------------------------------------
// CHỨC NĂNG 30: QUẢN TRỊ CRUD DANH MỤC QUÀ TẶNG XANH VÀ KHO VOUCHER
// --------------------------------------------------------------------------

export interface EcoRewardItem {
  reward_id: number;
  reward_code: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  points_required: number;
  reward_type: string;
  stock_quantity: number;
  total_redeemed: number;
  image_url?: string | null;
  expiry_date?: string | null;
  is_active: boolean;
  created_at: string;
  stock_status: "IN_STOCK" | "OUT_OF_STOCK" | "EXPIRED";
}

export interface CreateRewardRequest {
  title: string;
  description?: string;
  brand?: string;
  points_required: number;
  reward_type?: string;
  stock_quantity: number;
  image_url?: string;
  expiry_date: string;
}

export interface UpdateRewardRequest {
  title?: string;
  description?: string;
  brand?: string;
  points_required?: number;
  stock_quantity?: number;
  image_url?: string;
  expiry_date?: string;
  is_active?: boolean;
}

export interface RewardCatalogResponse {
  items: EcoRewardItem[];
  total: number;
  total_active: number;
  total_out_of_stock: number;
}

export interface ChartItem {
  reward_id?: number;
  title?: string;
  date?: string;
  count: number;
  points?: number;
}

export interface TopRewardItem {
  reward_id: number;
  title: string;
  brand?: string;
  count: number;
  percentage: number;
}

export interface RedemptionAnalyticsResponse {
  time_range: string;
  total_redemptions: number;
  total_points_spent: number;
  bar_chart: ChartItem[];
  line_chart: ChartItem[];
  top_rewards: TopRewardItem[];
}

// --------------------------------------------------------------------------
// CHỨC NĂNG 31: QUẢN LÝ DANH SÁCH QUÀ TẶNG CÁ NHÂN ĐÃ ĐỔI & VOUCHER WALLET
// --------------------------------------------------------------------------

export interface RedeemRewardRequest {
  reward_id: number;
}

export interface RedeemRewardResponse {
  voucher_id: string;
  voucher_code: string;
  reward_title: string;
  points_spent: number;
  balance_after: number;
  qr_data: string;
  expires_at: string;
  status: string;
  message: string;
}

export interface UserVoucherItem {
  voucher_id: string;
  reward_id: number;
  reward_title: string;
  reward_description?: string | null;
  reward_image_url?: string | null;
  brand?: string | null;
  voucher_code: string;
  qr_data: string;
  points_spent: number;
  status: "ACTIVE" | "USED" | "EXPIRED";
  terms_and_conditions?: string | null;
  redeemed_at: string;
  expires_at: string;
  used_at?: string | null;
  is_expiring_soon: boolean;
  days_remaining: number;
}

export interface UserVoucherListResponse {
  items: UserVoucherItem[];
  total: number;
  total_active: number;
  total_used: number;
  total_expired: number;
}

export interface MarkVoucherUsedResponse {
  voucher_id: string;
  voucher_code: string;
  status: "USED";
  used_at: string;
  message: string;
}
