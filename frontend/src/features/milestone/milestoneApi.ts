export const fetchMilestoneProgression = async () => ({
  current_tier: "Mầm Xanh",
  next_tier: "Lá Xanh",
  current_points: 0,
  target_points: 100,
  progress_percent: 0,
  tiers: [],
});
export const postMilestoneFeed = async () => ({ post_id: "mock-post-id", success: true });
export const fetchMilestonePosts = async () => ({ items: [], total: 0 });
export const likeMilestonePost = async () => ({ success: true });
