import React, { useState } from "react";
import type { GreenEvent, CheckinResponse } from "../types/event.types";
import { eventService } from "../services/eventService";
import { EventCheckinModal } from "./EventCheckinModal";

interface EventDetailModalProps {
  event: GreenEvent;
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  currentUserId?: string;
  onOpenLogin: () => void;
  onEventUpdated: (updatedEvent: GreenEvent) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  isLoggedIn,
  currentUserId,
  onOpenLogin,
  onEventUpdated,
}) => {
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  if (!isOpen) return null;

  // Kiểm tra khung giờ Check-in: [T_start - 1h, T_start + 3h]
  const now = new Date();
  const startDt = new Date(event.start_time);
  const checkinStart = new Date(startDt.getTime() - 60 * 60 * 1000); // Trước 1h
  const checkinEnd = event.end_time
    ? new Date(event.end_time)
    : new Date(startDt.getTime() + 3 * 60 * 60 * 1000); // Sau 3h

  const isCheckinTimeWindow = now >= checkinStart && now <= checkinEnd;
  const isFull = event.current_participants >= event.max_participants;
  const isCreator = currentUserId && event.creator_id === currentUserId;

  // Xử lý Quan tâm
  const handleToggleInterest = async () => {
    if (!isLoggedIn) {
      onOpenLogin();
      return;
    }
    try {
      setLoadingAction(true);
      const res = await eventService.toggleInterest(event.event_id);
      const updated: GreenEvent = {
        ...event,
        is_interested: res.is_interested,
        interested_count: res.interested_count,
      };
      onEventUpdated(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể cập nhật trạng thái quan tâm.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Xử lý Tham gia
  const handleToggleJoin = async () => {
    if (!isLoggedIn) {
      onOpenLogin();
      return;
    }
    try {
      setLoadingAction(true);
      const res = await eventService.toggleJoin(event.event_id);
      const updated: GreenEvent = {
        ...event,
        is_joined: res.is_joined,
        current_participants: res.current_participants,
      };
      onEventUpdated(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể đăng ký tham gia.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Xử lý Hủy sự kiện
  const handleCancelEvent = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy sự kiện này? Hành động này không thể hoàn tác.")) {
      return;
    }
    try {
      setLoadingAction(true);
      await eventService.cancelEvent(event.event_id);
      alert("Đã hủy sự kiện.");
      onEventUpdated({ ...event, status: "CANCELLED" });
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể hủy sự kiện.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCheckinSuccess = (_res: CheckinResponse) => {
    const updated: GreenEvent = {
      ...event,
      is_checked_in: true,
    };
    onEventUpdated(updated);
  };

  return (
    <>
      <div className="event-modal-overlay" data-testid="event-detail-modal-overlay">
        <div className="event-modal-box large" data-testid="event-detail-modal">
          {/* Header */}
          <div className="modal-header">
            <div className="modal-title-wrap">
              <h2>Chi tiết Sự kiện Chủ Nhật Xanh</h2>
              <p className="modal-sub">Mã sự kiện: {event.event_id.slice(0, 8)}...</p>
            </div>
            <button
              type="button"
              className="btn-close-modal"
              data-testid="btn-close-detail-modal"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="modal-body-scroll">
            <div className="event-detail-view">
              {/* Hero Banner */}
              <div className="detail-hero-banner">
                <img src={event.cover_image_url} alt={event.title} />
                <div className="banner-overlay">
                  <h3 className="hero-title">{event.title}</h3>
                  <div className="hero-meta-row">
                    <span>📍 {event.district}</span>
                    <span>
                      📅 {new Date(event.start_time).toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 2 cột */}
              <div className="detail-content-grid">
                {/* Cột trái: Mô tả & Người tham gia */}
                <div className="detail-main-col">
                  {/* Trạng thái duyệt */}
                  {event.status !== "APPROVED" && (
                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "8px",
                        marginBottom: "1.25rem",
                        fontSize: "0.85rem",
                        background: event.status === "PENDING" ? "#fffbeb" : "#fef2f2",
                        color: event.status === "PENDING" ? "#b45309" : "#b91c1c",
                        border: `1px solid ${
                          event.status === "PENDING" ? "#fde68a" : "#fecaca"
                        }`,
                      }}
                    >
                      {event.status === "PENDING" && (
                        <span>⏳ <strong>Sự kiện đang chờ Quản trị viên phê duyệt.</strong> Chỉ bạn mới nhìn thấy sự kiện này.</span>
                      )}
                      {event.status === "REJECTED" && (
                        <span>❌ <strong>Sự kiện đã bị từ chối:</strong> {event.reject_reason || "Không rõ lý do"}</span>
                      )}
                      {event.status === "CANCELLED" && (
                        <span>🛑 <strong>Sự kiện đã bị hủy bỏ bởi ban tổ chức.</strong></span>
                      )}
                    </div>
                  )}

                  {/* Nội dung hoạt động */}
                  <div className="section-block">
                    <h4>📋 Nội dung hoạt động & Vật dụng cần mang theo</h4>
                    <div className="desc-text">{event.description}</div>
                  </div>

                  {/* Danh sách người tham gia */}
                  <div className="section-block">
                    <h4>
                      👥 Người tham gia ({event.current_participants}/{event.max_participants})
                    </h4>
                    {event.participants_preview && event.participants_preview.length > 0 ? (
                      <div className="participants-avatar-list">
                        {event.participants_preview.map((p) => (
                          <div
                            key={p.user_id}
                            className="participant-avatar-item"
                            title={`${p.full_name} ${p.is_creator ? "(Người tạo)" : ""}`}
                          >
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={p.full_name} />
                            ) : (
                              <span>{p.full_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        Chưa có người tham gia nào ngoài người tổ chức.
                      </p>
                    )}
                  </div>
                </div>

                {/* Cột phải: Thông tin tổ chức & Nút bấm */}
                <div className="detail-side-col">
                  <div className="info-box-card">
                    <div className="info-row">
                      <span className="info-icon">👤</span>
                      <div className="info-text">
                        <div className="info-label">Người tổ chức</div>
                        <div className="info-val">{event.creator_name || "Quản trị viên"}</div>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-icon">📍</span>
                      <div className="info-text">
                        <div className="info-label">Địa điểm tập trung</div>
                        <div className="info-val">{event.address}</div>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-icon">🎯</span>
                      <div className="info-text">
                        <div className="info-label">Bán kính Check-in</div>
                        <div className="info-val">Trong vòng 100m quanh điểm ghim</div>
                      </div>
                    </div>
                  </div>

                  {/* Ngăn xếp các nút tương tác */}
                  <div className="action-buttons-stack">
                    {/* 1. Nút Check-in GPS (Nếu đã tham gia) */}
                    {event.is_joined && (
                      <div>
                        {event.is_checked_in ? (
                          <button
                            type="button"
                            className="btn-action-primary"
                            disabled
                            style={{ background: "#059669" }}
                          >
                            ✅ Đã check-in (+50 GP)
                          </button>
                        ) : isCheckinTimeWindow ? (
                          <button
                            type="button"
                            className="btn-action-primary btn-checkin-gold"
                            data-testid="btn-open-checkin"
                            onClick={() => setIsCheckinOpen(true)}
                          >
                            🎯 Check-in GPS nhận +50 GP
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-action-primary"
                            disabled
                            title="Check-in mở trước giờ bắt đầu 1 tiếng đến 3 tiếng sau giờ bắt đầu"
                          >
                            ⏳ Chưa tới khung giờ Check-in
                          </button>
                        )}
                      </div>
                    )}

                    {/* 2. Nút Tham gia / Hủy tham gia */}
                    {event.status === "APPROVED" && (
                      <button
                        type="button"
                        className={`btn-action-primary ${event.is_joined ? "btn-cancel" : ""}`}
                        data-testid="btn-toggle-join"
                        disabled={loadingAction || (!event.is_joined && isFull)}
                        onClick={handleToggleJoin}
                        style={{
                          background: event.is_joined ? "#ef4444" : undefined,
                        }}
                      >
                        {event.is_joined
                          ? "Hủy tham gia sự kiện"
                          : isFull
                          ? "Sự kiện đã đủ số người tham gia"
                          : `Đăng ký tham gia (${event.current_participants}/${event.max_participants})`}
                      </button>
                    )}

                    {/* 3. Nút Quan tâm */}
                    <button
                      type="button"
                      className={`btn-action-secondary ${event.is_interested ? "active" : ""}`}
                      data-testid="btn-toggle-interest"
                      disabled={loadingAction}
                      onClick={handleToggleInterest}
                    >
                      {event.is_interested
                        ? `❤️ Đã quan tâm (${event.interested_count})`
                        : `🤍 Quan tâm (${event.interested_count})`}
                    </button>

                    {/* 4. Nút Hủy sự kiện (Người tạo) */}
                    {isCreator && event.status !== "CANCELLED" && (
                      <button
                        type="button"
                        className="btn-action-secondary"
                        style={{ color: "#ef4444", borderColor: "#fecaca" }}
                        onClick={handleCancelEvent}
                        disabled={loadingAction}
                      >
                        Hủy sự kiện này
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Check-in GPS (Màn 4/4) */}
      <EventCheckinModal
        event={event}
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        onCheckinSuccess={handleCheckinSuccess}
      />
    </>
  );
};
