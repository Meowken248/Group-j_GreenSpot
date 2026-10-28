export interface ChallengeItem {
  challenge_id: string;
  title: string;
  description: string;
  points_reward: number;
  category: string;
  icon: string;
  requirements: string;
  is_auto_verify: boolean;
  status: "NOT_STARTED" | "PENDING" | "COMPLETED" | "REJECTED";
  evidence_image_url?: string | null;
  evidence_note?: string | null;
  rejection_reason?: string | null;
  completed_at?: string | null;
}

export interface WeeklyChallengesData {
  week_year: string;
  days_left: number;
  hours_left: number;
  time_left_str: string;
  completed_count: number;
  total_count: number;
  progress_percentage: number;
  combo_reward_points: number;
  is_all_completed: boolean;
  challenges: ChallengeItem[];
}

export interface ChallengeSubmitPayload {
  evidence_image_url: string;
  evidence_note?: string;
}

export interface ChallengeCompletionResult {
  challenge_id: string;
  title: string;
  points_awarded: number;
  combo_awarded: number;
  new_balance: number;
  status: string;
  message: string;
}

export interface AdminChallengeItem {
  challenge_id: string;
  title: string;
  description: string;
  points_reward: number;
  category: string;
  icon: string;
  requirements: string;
  is_auto_verify: boolean;
  is_active: boolean;
  order_index: number;
  created_at: string;
  participants_count: number;
  completed_count: number;
}

export interface AdminChallengeListResult {
  total: number;
  challenges: AdminChallengeItem[];
}

export interface ChallengeCreatePayload {
  challenge_id?: string;
  title: string;
  description: string;
  points_reward: number;
  category: string;
  icon: string;
  requirements: string;
  is_auto_verify: boolean;
  is_active: boolean;
  order_index?: number;
}

export interface ChallengeUpdatePayload {
  title?: string;
  description?: string;
  points_reward?: number;
  category?: string;
  icon?: string;
  requirements?: string;
  is_auto_verify?: boolean;
  is_active?: boolean;
  order_index?: number;
}

export interface AdminSubmissionItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  challenge_id: string;
  challenge_title: string;
  points_reward: number;
  week_year: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  evidence_image_url?: string | null;
  evidence_note?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface AdminSubmissionListResult {
  total: number;
  pending_count: number;
  submissions: AdminSubmissionItem[];
}

export interface AdminReviewSubmissionPayload {
  action: "APPROVE" | "REJECT";
  rejection_reason?: string;
}

export interface AdminReviewSubmissionResult {
  submission_id: string;
  action: string;
  new_status: string;
  points_awarded: number;
  message: string;
}

