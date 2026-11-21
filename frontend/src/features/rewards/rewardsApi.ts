export const fetchPointPolicy = async () => ({ policy_items: [] });
export const fetchDailyLimitsPolicy = async () => ({ daily_cap: 100, current_earned: 0 });
export const fetchWalletSummary = async () => ({
  total_points: 0,
  available_points: 0,
  lifetime_earned: 0,
  lifetime_spent: 0,
  current_tier: "Mầm Xanh",
});
export const fetchTransactionHistory = async () => ({ items: [], total: 0 });
export const fetchRewardsCatalog = async () => ({ items: [], total: 0 });
export const redeemReward = async () => ({ success: true, voucher_code: "MOCK-VOUCHER" });
export const fetchMyVouchers = async () => ({ vouchers: [] });
export const useVoucher = async () => ({ success: true });
