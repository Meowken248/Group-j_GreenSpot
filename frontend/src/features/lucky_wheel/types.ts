export interface WheelSlotItem {
  slot_id?: string;
  slot_index: number;
  reward_type: string; // POINTS | BADGE | VOUCHER | LUCK
  reward_name: string;
  points_won: number;
  badge_won?: string | null;
  voucher_code?: string | null;
  icon: string;
  color: string;
  probability_weight?: number;
  is_active?: boolean;
}

export interface WheelSlotCreateInput {
  reward_type: string;
  reward_name: string;
  points_won: number;
  badge_won?: string | null;
  voucher_code?: string | null;
  icon: string;
  color: string;
  probability_weight: number;
  is_active: boolean;
}

export interface WheelSlotUpdateInput {
  reward_type?: string;
  reward_name?: string;
  points_won?: number;
  badge_won?: string | null;
  voucher_code?: string | null;
  icon?: string;
  color?: string;
  probability_weight?: number;
  is_active?: boolean;
  slot_index?: number;
}

export interface AdminSlotStatsResponse {
  total_slots: number;
  active_slots: number;
  total_weight: number;
  slots: WheelSlotItem[];
}

export interface WheelStatusResponse {
  spins_left_today: number;
  has_spins_today: boolean;
  next_reset_seconds: number;
  next_reset_time: string;
  total_points_won: number;
  total_badges_won: number;
  slots: WheelSlotItem[];
}

export interface SpinResultResponse {
  success: boolean;
  slot_index: number;
  reward_type: string;
  reward_name: string;
  points_won: number;
  badge_won?: string | null;
  voucher_code?: string | null;
  message: string;
  new_total_points: number;
  spins_left_today: number;
}

export interface SpinHistoryItem {
  spin_id: string;
  spin_date: string;
  formatted_time: string;
  reward_type: string;
  reward_name: string;
  points_won: number;
  badge_won?: string | null;
}

export interface SpinHistoryResponse {
  total_spins: number;
  total_points_won: number;
  total_badges_won: number;
  history: SpinHistoryItem[];
  empty_message?: string | null;
}
