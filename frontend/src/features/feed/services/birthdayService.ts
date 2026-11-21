import type { BirthdayTodayResponse } from "../types/birthday.types";

export const birthdayService = {
  getTodayBirthdays: async (_limit = 3): Promise<BirthdayTodayResponse> => ({
    total: 0,
    has_more: false,
    limit: _limit,
    today: new Date().toISOString().slice(0, 10),
    points_per_card: 10,
    daily_points_cap: 100,
    daily_points_earned: 0,
    daily_reward_limit_reached: false,
    card_templates: [],
    default_suggestion: "Chúc mừng sinh nhật xanh!",
    items: [],
  }),
  getCardTemplates: async () => [],
  sendWish: async () => ({
    success: true,
    message: "Gửi lời chúc thành công (Mock)",
    points_transferred: 0,
    wish_id: "mock-wish-id",
    wish_type: "MESSAGE" as const,
    recipient_id: "mock-recipient",
    recipient_name: "Mock",
  }),
  getReceivedWishes: async (_page = 1, _limit = 10) => ({
    total: 0,
    unread_count: 0,
    items: [],
  }),
  markAsRead: async () => ({ success: true }),
};
