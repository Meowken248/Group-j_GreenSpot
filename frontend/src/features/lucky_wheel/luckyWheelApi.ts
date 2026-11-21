export const fetchWheelStatus = async () => ({
  can_spin: true,
  spins_left_today: 1,
  prizes: [],
});
export const spinLuckyWheel = async () => ({
  prize_index: 0,
  prize_label: "Chúc may mắn lần sau",
  points_awarded: 0,
});
export const fetchSpinHistory = async () => ({ history: [] });
