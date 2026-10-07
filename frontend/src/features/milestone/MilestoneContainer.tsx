/**
 * GreenSpot - Chức năng 36: Hiệu ứng thăng cấp danh hiệu
 * Milestone Celebration Popup + Auto-generated Post + Tier Progression Map
 *
 * Màn 1: Cửa sổ chúc mừng lên cấp (Popup celebration với confetti)
 * Màn 2: Bài chúc mừng tự tạo lên bảng tin (3-column post editor)
 * Màn 3: Lộ trình các cấp (3-column tier progression roadmap)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { milestoneApi } from "./milestoneApi";
import type {
  MilestoneProgressionResponse,
  TierDetailItem,
  MilestonePostItem,
  CreateMilestonePostRequest,
} from "./types";
import "./milestone.css";

// ============================================================
// Tier points ranges for display
// ============================================================
const TIER_RANGES: Record<string, string> = {
  BRONZE: "0 – 499 điểm",
  SILVER: "500 – 999 điểm",
  GOLD: "1.000 – 1.999 điểm",
  DIAMOND: "≥ 2.000 điểm",
};

// ============================================================
// Confetti Particle Component
// ============================================================
function ConfettiEffect() {
  const particles = useMemo(() => {
    const colors = ["#3b82f6", "#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#06b6d4"];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 6,
    }));
  }, []);

  return (
    <div className="ms-confetti-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="ms-confetti-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Màn 1: Celebration Popup
// ============================================================
interface CelebrationPopupProps {
  progression: MilestoneProgressionResponse;
  onSharePost: () => void;
  onViewRoadmap: () => void;
  onClose: () => void;
}

function CelebrationPopup({ progression, onSharePost, onViewRoadmap, onClose }: CelebrationPopupProps) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="ms-celebration-overlay" onClick={handleOverlayClick}>
      <div className="ms-celebration-popup">
        <ConfettiEffect />
        <span className="ms-popup-label">POPUP</span>
        <h2 className="ms-popup-title">CHÚC MỪNG LÊN CẤP</h2>
        <span className="ms-popup-badge">{progression.current_tier.badge_icon}</span>
        <div
          className="ms-popup-tier-name"
          style={{ color: progression.current_tier.color_hex }}
        >
          Công dân Xanh {progression.current_tier.tier_name}
        </div>
        <p className="ms-popup-message">{progression.congratulation_message}</p>
        <div className="ms-popup-actions">
          <button className="ms-popup-btn primary" onClick={onSharePost}>
            📢 Đăng lên bảng tin
          </button>
          <button className="ms-popup-btn secondary" onClick={onViewRoadmap}>
            🗺️ Xem lộ trình
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Màn 2: Post Editor (3-Column Layout)
// ============================================================
interface PostEditorProps {
  progression: MilestoneProgressionResponse;
  onPublished: () => void;
  onCancel: () => void;
}

function PostEditor({ progression, onPublished, onCancel }: PostEditorProps) {
  const [content, setContent] = useState(progression.default_post_content);
  const [privacy, setPrivacy] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("PUBLIC");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!content.trim() || content.trim().length < 5) return;
    setPublishing(true);
    setError(null);
    try {
      const payload: CreateMilestonePostRequest = {
        tier_code: progression.current_tier.tier_code,
        content: content.trim(),
        privacy,
      };
      await milestoneApi.createPost(payload);
      setToast("Đã đăng bài chia sẻ thành tích lên bảng tin");
      setTimeout(() => {
        setToast(null);
        onPublished();
      }, 3000);
    } catch {
      setError("Không thể đăng bài viết lúc này. Vui lòng thử lại");
    } finally {
      setPublishing(false);
    }
  };

  const privacyOptions = [
    { value: "PUBLIC" as const, label: "🌐 Công khai", desc: "Toàn cộng đồng" },
    { value: "FRIENDS" as const, label: "👥 Bạn bè", desc: "Chỉ bạn bè" },
    { value: "PRIVATE" as const, label: "🔒 Chỉ mình tôi", desc: "Riêng tư" },
  ];

  const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <>
      <div className="ms-post-editor">
        {/* Cột trái: Xem trước bài */}
        <div className="ms-post-col">
          <div className="ms-post-col-header">XEM TRƯỚC BÀI</div>
          <div className="ms-preview-card" style={{ background: progression.current_tier.bg_gradient }}>
            <span className="ms-preview-badge-icon">{progression.current_tier.badge_icon}</span>
            <div className="ms-preview-tier" style={{ color: progression.current_tier.color_hex }}>
              {progression.current_tier.tier_name}
            </div>
            <div className="ms-preview-date">Đạt ngày {today}</div>
          </div>
          <span className="ms-preview-category">Vinh danh lên cấp</span>
          <div className="ms-preview-content">{content || "..."}</div>
        </div>

        {/* Cột giữa: Tùy chọn */}
        <div className="ms-post-col">
          <div className="ms-post-col-header">TÙY CHỌN</div>
          <div className="ms-option-label">Nội dung bài viết</div>
          <textarea
            className="ms-text-editor"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            placeholder="Chia sẻ cảm nghĩ của bạn..."
          />
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "right", marginTop: "0.25rem" }}>
            {content.length}/1000
          </div>

          <div className="ms-option-label" style={{ marginTop: "1rem" }}>Quyền riêng tư</div>
          <div className="ms-privacy-options">
            {privacyOptions.map((opt) => (
              <label
                key={opt.value}
                className={`ms-privacy-radio ${privacy === opt.value ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="privacy"
                  value={opt.value}
                  checked={privacy === opt.value}
                  onChange={() => setPrivacy(opt.value)}
                />
                <span>{opt.label}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#94a3b8" }}>{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cột phải: Đăng */}
        <div className="ms-post-col">
          <div className="ms-post-col-header">ĐĂNG</div>
          {error && <div className="ms-publish-error">{error}</div>}
          <button
            className="ms-publish-btn submit"
            onClick={handlePublish}
            disabled={publishing || content.trim().length < 5}
          >
            {publishing ? "Đang đăng..." : "📤 Đăng bài"}
          </button>
          <button className="ms-publish-btn cancel" onClick={onCancel}>
            Bỏ qua
          </button>
          <div style={{ marginTop: "1rem", fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.5 }}>
            Bài viết sẽ được gắn nhãn <strong>"Vinh danh lên cấp"</strong> trên Bảng tin Geo-Feed.
            Bạn bè và cộng đồng có thể thả cảm xúc sinh thái để chúc mừng.
          </div>
        </div>
      </div>
      {toast && <div className="ms-toast">✅ {toast}</div>}
    </>
  );
}

// ============================================================
// Màn 3: Tier Progression Map (3-Column Layout)
// ============================================================
interface TierProgressionMapProps {
  progression: MilestoneProgressionResponse;
}

function TierProgressionMap({ progression }: TierProgressionMapProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  const circumference = 2 * Math.PI * 55;
  const dashOffset = circumference - (circumference * progression.progress_percent) / 100;

  const progressMessage = progression.is_max_tier
    ? null
    : `Đã đạt ${progression.progress_percent}% — Còn thiếu ${progression.points_needed.toLocaleString("vi-VN")} điểm để lên ${progression.next_tier?.tier_name || "cấp tiếp theo"}`;

  return (
    <div className="ms-progression-grid">
      {/* Cột trái: Cấp hiện tại */}
      <div className="ms-prog-card">
        <div className="ms-prog-card-title">CẤP HIỆN TẠI</div>
        <div className="ms-current-tier-display">
          <span className="ms-current-badge">{progression.current_tier.badge_icon}</span>
          <div className="ms-current-tier-name" style={{ color: progression.current_tier.color_hex }}>
            {progression.current_tier.tier_name}
          </div>
          <div className="ms-current-points-label">Tổng Điểm Xanh</div>
          <div className="ms-current-points-value">{progression.current_points.toLocaleString("vi-VN")}</div>
        </div>

        <div className="ms-benefits-title">Quyền lợi đang hưởng</div>
        <ul className="ms-benefits-list">
          {progression.current_tier.benefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      {/* Cột giữa: Các cấp tiếp theo */}
      <div className="ms-prog-card">
        <div className="ms-prog-card-title">CÁC CẤP TIẾP THEO</div>
        <div className="ms-tier-steps">
          {progression.all_tiers.map((tier) => (
            <div key={tier.tier_code}>
              <div
                className={`ms-tier-step ${tier.is_current ? "current" : ""} ${tier.is_unlocked ? "unlocked" : "locked"}`}
                onClick={() => setExpandedTier(expandedTier === tier.tier_code ? null : tier.tier_code)}
              >
                <span className="ms-tier-step-icon">{tier.badge_icon}</span>
                <div className="ms-tier-step-info">
                  <div className="ms-tier-step-name">{tier.tier_name}</div>
                  <div className="ms-tier-step-range">{TIER_RANGES[tier.tier_code] || `${tier.min_points}+ điểm`}</div>
                </div>
                {tier.is_current && (
                  <span className="ms-tier-step-current-badge">HIỆN TẠI</span>
                )}
              </div>
              {expandedTier === tier.tier_code && (
                <div className="ms-tier-detail-panel">
                  <div className="ms-tier-detail-desc">{tier.description}</div>
                  <ul className="ms-tier-detail-benefits">
                    {tier.benefits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cột phải: Tiến độ */}
      <div className="ms-prog-card">
        <div className="ms-prog-card-title">TIẾN ĐỘ</div>
        <div className="ms-progress-section">
          <div className="ms-progress-ring-wrapper">
            <svg className="ms-progress-ring" viewBox="0 0 130 130">
              <defs>
                <linearGradient id="msGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <circle className="ms-progress-ring-bg" cx="65" cy="65" r="55" />
              <circle
                className="ms-progress-ring-fill"
                cx="65"
                cy="65"
                r="55"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="ms-progress-ring-text">
              <span className="ms-progress-percent">{Math.round(progression.progress_percent)}%</span>
              <span className="ms-progress-label">tiến độ</span>
            </div>
          </div>

          {progression.is_max_tier ? (
            <>
              <span className="ms-max-tier-badge">💎 Đạt cấp tối đa</span>
              <p className="ms-progress-detail">{progression.max_tier_message}</p>
            </>
          ) : (
            <p className="ms-progress-detail">{progressMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Community Feed (Bảng tin vinh danh)
// ============================================================
interface CommunityFeedProps {
  refreshKey: number;
}

function CommunityFeed({ refreshKey }: CommunityFeedProps) {
  const [posts, setPosts] = useState<MilestonePostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    milestoneApi.getPosts(10, 0).then((res) => {
      setPosts(res.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refreshKey]);

  const handleLike = async (postId: string, idx: number) => {
    try {
      const res = await milestoneApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, likes_count: res.likes_count } : p))
      );
    } catch { /* silently fail */ }
  };

  if (loading) return null;
  if (posts.length === 0) return null;

  return (
    <div>
      <div className="ms-feed-header">
        <span className="ms-feed-title">🎉 Bảng tin vinh danh gần đây</span>
      </div>
      <div className="ms-feed-list">
        {posts.map((post, idx) => (
          <div className="ms-feed-card" key={post.post_id}>
            <div className="ms-feed-avatar">{post.badge_icon}</div>
            <div className="ms-feed-body">
              <div>
                <span className="ms-feed-name">{post.user_name}</span>
                <span
                  className="ms-feed-tier-badge"
                  style={{ background: `${post.color_hex}18`, color: post.color_hex }}
                >
                  {post.badge_icon} {post.tier_name}
                </span>
              </div>
              <p className="ms-feed-content">{post.content}</p>
              <div className="ms-feed-meta">
                <button className="ms-feed-like-btn" onClick={() => handleLike(post.post_id, idx)}>
                  ❤️ {post.likes_count}
                </button>
                <span>{new Date(post.created_at).toLocaleDateString("vi-VN")}</span>
                <span>{post.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main Container Export
// ============================================================
interface MilestoneContainerProps {
  onBackToHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateFeed?: () => void;
}

export function MilestoneContainer({ onBackToHome, onNavigateLogin, onNavigateFeed }: MilestoneContainerProps) {
  const [progression, setProgression] = useState<MilestoneProgressionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"celebration" | "post" | "roadmap" | "feed">("roadmap");
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const fetchProgression = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await milestoneApi.getProgression();
      setProgression(data);
    } catch {
      setError("Không thể tải lộ trình cấp bậc. Vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgression();
  }, [fetchProgression]);

  const handleTriggerCelebration = () => {
    setShowCelebration(true);
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
  };

  const handleShareFromPopup = () => {
    setShowCelebration(false);
    setActiveView("post");
  };

  const handleViewRoadmapFromPopup = () => {
    setShowCelebration(false);
    setActiveView("roadmap");
  };

  const handlePostPublished = () => {
    setActiveView("feed");
    setFeedRefreshKey((k) => k + 1);
    if (onNavigateFeed) {
      setTimeout(() => onNavigateFeed(), 3000);
    }
  };

  const handleCancelPost = () => {
    setActiveView("roadmap");
  };

  return (
    <div className="ms-page-container">
      {/* Header */}
      <div className="ms-header">
        <div>
          <div className="ms-title">🏅 Lộ trình danh hiệu Công dân Xanh</div>
          <div className="ms-subtitle">
            Theo dõi tiến độ thăng cấp, chia sẻ thành tích vinh danh và khám phá các quyền lợi đặc quyền tại mỗi cấp bậc
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {progression && !loading && (
            <button className="ms-back-btn" onClick={handleTriggerCelebration}>
              🎉 Chúc mừng
            </button>
          )}
          {onBackToHome && (
            <button className="ms-back-btn" onClick={onBackToHome}>
              ← Trang chủ
            </button>
          )}
        </div>
      </div>

      {/* View toggle tabs */}
      <div className="ms-view-toggle">
        <button
          className={activeView === "roadmap" ? "active" : ""}
          onClick={() => setActiveView("roadmap")}
        >
          🗺️ Lộ trình cấp
        </button>
        <button
          className={activeView === "post" ? "active" : ""}
          onClick={() => setActiveView("post")}
        >
          📝 Đăng vinh danh
        </button>
        <button
          className={activeView === "feed" ? "active" : ""}
          onClick={() => setActiveView("feed")}
        >
          🎉 Bảng tin
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="ms-loading">
          <div className="ms-loading-spinner" />
          <div>Đang tải lộ trình cấp bậc...</div>
        </div>
      ) : error ? (
        <div className="ms-error-block">
          <p>{error}</p>
          <button className="ms-retry-btn" onClick={fetchProgression}>
            🔄 Thử lại
          </button>
        </div>
      ) : progression ? (
        <>
          {activeView === "roadmap" && <TierProgressionMap progression={progression} />}
          {activeView === "post" && (
            <PostEditor
              progression={progression}
              onPublished={handlePostPublished}
              onCancel={handleCancelPost}
            />
          )}
          {activeView === "feed" && <CommunityFeed refreshKey={feedRefreshKey} />}
        </>
      ) : null}

      {/* Celebration Popup (Màn 1) */}
      {showCelebration && progression && (
        <CelebrationPopup
          progression={progression}
          onSharePost={handleShareFromPopup}
          onViewRoadmap={handleViewRoadmapFromPopup}
          onClose={handleCloseCelebration}
        />
      )}
    </div>
  );
}
