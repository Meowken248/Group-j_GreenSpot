export interface ChallengeItem {
  challenge_id: string;
  title: string;
  description: string;
  points_reward: number;
  category: string;
  icon: string;
  requirements: string;
  is_auto_verify: boolean;
  status: "NOT_STARTED" | "PENDING" | "COMPLETED";
  evidence_image_url?: string | null;
  evidence_note?: string | null;
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
