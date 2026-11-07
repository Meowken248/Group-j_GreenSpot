import React from "react";
import type { FriendRequestItem, GreenCitizenSuggestion } from "../types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { useLanguage } from "../../../i18n";

interface FriendRequestsViewProps {
  requests: FriendRequestItem[];
  suggestions: GreenCitizenSuggestion[];
  loadingRequests: boolean;
  loadingSuggestions: boolean;
  onAcceptRequest: (req: FriendRequestItem) => void;
  onRejectRequest: (req: FriendRequestItem) => void;
  onSendRequest: (sug: GreenCitizenSuggestion) => void;
  onToggleFollow: (sug: GreenCitizenSuggestion) => void;
  onOpenProfile?: (userId: string) => void;
}

export const FriendRequestsView: React.FC<FriendRequestsViewProps> = ({
  requests,
  suggestions,
  loadingRequests,
  loadingSuggestions,
  onAcceptRequest,
  onRejectRequest,
  onSendRequest,
  onToggleFollow,
  onOpenProfile,
}) => {
  const { currentLang } = useLanguage();
  const isEn = currentLang === "EN";

  return (
    <div className="two-column-layout">
      {/* KHỐI 1 (CỘT TRÁI): LỜI MỜI KẾT BẠN */}
      <div className="section-card">
        <div className="card-header-bar">
          <h2 className="card-title">
            <span>📩 {isEn ? "Friend Requests" : "Lời mời kết bạn"}</span>
            <span className="count-badge">{requests.length}</span>
          </h2>
        </div>

        <div className="requests-list-container">
          {loadingRequests ? (
            <div className="empty-state-notice">
              <p>{isEn ? "Loading friend requests..." : "Đang tải danh sách lời mời..."}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state-notice">
              <div className="empty-icon">📭</div>
              <p>{isEn ? "No pending friend requests at this time." : "Hiện không có lời mời kết bạn nào đang chờ phản hồi."}</p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.request_id}
                className={`request-row-item ${req.isFading ? "fading-row" : ""}`}
              >
                <div
                  className="user-meta-left"
                  style={{ cursor: "pointer" }}
                  onClick={() => onOpenProfile?.(req.sender_id)}
                  title={`Xem trang cá nhân của ${req.sender_name}`}
                >
                  {req.sender_avatar ? (
                    <img
                      src={resolveMediaUrl(req.sender_avatar)}
                      alt={req.sender_name}
                      className="user-avatar-round"
                    />
                  ) : (
                    <div className="user-avatar-round">
                      {req.sender_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="user-text-details">
                    <h4 className="user-name-title">{req.sender_name}</h4>
                    <div className="user-subtext">
                      {req.district && <span>📍 {req.district}</span>}
                      {req.district && <span className="dot-divider">•</span>}
                      <span>
                        {req.mutual_friends_count > 0
                          ? (isEn
                              ? `${req.mutual_friends_count} ${req.mutual_friends_count === 1 ? "mutual friend" : "mutual friends"}`
                              : `${req.mutual_friends_count} bạn chung`)
                          : (isEn ? "Green Community Member" : "Thành viên cộng đồng xanh")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className="btn-accept"
                    disabled={req.isFading}
                    onClick={() => onAcceptRequest(req)}
                  >
                    {isEn ? "Accept" : "Chấp nhận"}
                  </button>
                  <button
                    type="button"
                    className="btn-reject"
                    disabled={req.isFading}
                    onClick={() => onRejectRequest(req)}
                  >
                    {isEn ? "Reject" : "Từ chối"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KHỐI 2 (CỘT PHẢI): GỢI Ý CÔNG DÂN XANH */}
      <div className="section-card">
        <div className="card-header-bar">
          <h2 className="card-title">
            <span>🌱 {isEn ? "Green Citizen Suggestions" : "Gợi ý công dân xanh"}</span>
            <span className="count-badge">{suggestions.length}</span>
          </h2>
        </div>

        <div className="suggestions-list-container">
          {loadingSuggestions ? (
            <div className="empty-state-notice">
              <p>{isEn ? "Searching for Green Citizen suggestions..." : "Đang tìm kiếm gợi ý công dân xanh..."}</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="empty-state-notice">
              <div className="empty-icon">🤝</div>
              <p>{isEn ? "No new suggestions in your area yet." : "Chưa có thêm gợi ý mới tại khu vực của bạn."}</p>
            </div>
          ) : (
            suggestions.map((sug) => (
              <div key={sug.user_id} className="suggestion-card-item">
                <div
                  className="user-meta-left"
                  style={{ cursor: "pointer" }}
                  onClick={() => onOpenProfile?.(sug.user_id)}
                  title={`Xem trang cá nhân của ${sug.full_name}`}
                >
                  {sug.avatar_url ? (
                    <img
                      src={resolveMediaUrl(sug.avatar_url)}
                      alt={sug.full_name}
                      className="user-avatar-round"
                    />
                  ) : (
                    <div className="user-avatar-round">
                      {sug.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="user-text-details">
                    <h4 className="user-name-title">{sug.full_name}</h4>
                    <div className="user-subtext">
                      {sug.district && <span>📍 {sug.district} • </span>}
                      <span className="points-highlight">
                        ⭐ {sug.total_green_points} {isEn ? (sug.total_green_points === 1 ? "green point" : "green points") : "điểm xanh"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className={`btn-add-friend ${sug.isRequested ? "btn-requested" : ""}`}
                    disabled={sug.isRequested}
                    onClick={() => onSendRequest(sug)}
                  >
                    {sug.isRequested ? (isEn ? "Request Sent" : "Đã gửi lời mời") : (isEn ? "+ Add Friend" : "+ Kết bạn")}
                  </button>

                  <button
                    type="button"
                    className={`btn-follow-toggle ${sug.is_following ? "btn-unfollow" : ""}`}
                    onClick={() => onToggleFollow(sug)}
                  >
                    {sug.is_following ? (isEn ? "Unfollow" : "Bỏ theo dõi") : (isEn ? "Follow" : "Theo dõi")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
