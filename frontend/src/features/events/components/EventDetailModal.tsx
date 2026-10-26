import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GreenEvent, CheckinResponse, ParticipantItem } from "../types/event.types";
import { eventService } from "../services/eventService";
import { EventCheckinModal } from "./EventCheckinModal";
import { CreateEventModal } from "./CreateEventModal";
import { EVENT_MESSAGES } from "../utils/eventMessages";
import {
  formatDateTime,
  getCheckinWindowState,
  isEventEnded,
  isEventStarted,
  resolveMediaUrl,
} from "../utils/datetime";

interface EventDetailModalProps {
  event: GreenEvent;
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  currentUserId?: string;
  canApprove?: boolean;
  onOpenLogin: () => void;
  onEventUpdated: (updatedEvent: GreenEvent) => void;
  onToast?: (message: string, type?: "success" | "error") => void;
}

type DetailAction = "join" | "interest" | "cancel";

const createActionState = (): Record<DetailAction, boolean> => ({
  join: false,
  interest: false,
  cancel: false,
});

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  isLoggedIn,
  currentUserId,
  canApprove = false,
  onOpenLogin,
  onEventUpdated,
  onToast,
}) => {
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  // Mỗi nút có trạng thái chờ riêng: trước đây dùng chung 1 cờ `loadingAction`
  // khiến mọi nút bị disable (và trông như "bấm không ăn") khi một request đang chạy.
  const [pendingActions, setPendingActions] = useState<Record<DetailAction, boolean>>(
    createActionState
  );
  const pendingActionsRef = useRef<Record<DetailAction, boolean>>(createActionState());
  // Đếm số lần người dùng đã thao tác: dùng để bỏ qua phản hồi đồng bộ cũ
  // (tránh GET chậm trả về và ghi đè trạng thái vừa cập nhật).
  const mutationSeqRef = useRef(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [showParticipants, setShowParticipants] = useState(false);
  const [allParticipants, setAllParticipants] = useState<ParticipantItem[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Bản đồ vị trí điểm tập trung
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, { scrollWheelZoom: false }).setView(
      [event.latitude, event.longitude],
      15
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    L.marker([event.latitude, event.longitude]).addTo(map);
    L.circle([event.latitude, event.longitude], {
      radius: event.checkin_radius_meters || 100,
      color: "#10b981",
      fillColor: "#10b981",
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map);

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, event.latitude, event.longitude, event.checkin_radius_meters]);
  // Mỗi lần mở modal: tải lại dữ liệu mới nhất để các nút bấm không dựa trên
  // dữ liệu cũ (is_ended, is_joined, current_participants…) khiến bấm bị từ chối.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const seqAtStart = mutationSeqRef.current;
    const syncLatestEvent = async () => {
      try {
        const fresh = await eventService.getEventDetail(event.event_id);
        // Chỉ áp dụng khi người dùng chưa thao tác gì trong lúc chờ phản hồi
        if (!cancelled && fresh && mutationSeqRef.current === seqAtStart) {
          onEventUpdated(fresh);
        }
      } catch {
        // Im lặng: giữ dữ liệu từ danh sách nếu không tải được chi tiết
      }
    };
    syncLatestEvent();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, event.event_id]);

  // Đổi sang sự kiện khác thì xóa các trạng thái phụ của sự kiện trước
  useEffect(() => {
    setAllParticipants([]);
    setShowParticipants(false);
    setShowCancelConfirm(false);
    setShowRejectForm(false);
    setRejectReason("");
  }, [event.event_id]);



  if (!isOpen) return null;

  const ended = isEventEnded(event);
  const started = isEventStarted(event);
  const isFull = event.current_participants >= event.max_participants;
  const isCreator = Boolean(currentUserId && event.creator_id === currentUserId);
  const checkinWindowState = getCheckinWindowState(event);
  const canManage = isCreator || canApprove;

  const notify = (message: string, type: "success" | "error" = "success") => {
    if (onToast) onToast(message, type);
  };

  const requireLogin = (): boolean => {
    if (isLoggedIn) return false;
    notify(EVENT_MESSAGES.LOGIN_REQUIRED_INTERACT, "error");
    onOpenLogin();
    return true;
  };

  const runAction = async (action: DetailAction, task: () => Promise<void>) => {
    // Chặn double-click: nếu action đang chạy thì bỏ qua (tránh toggle join/leave 2 lần)
    if (pendingActionsRef.current[action]) return;
    pendingActionsRef.current[action] = true;
    mutationSeqRef.current += 1;
    setPendingActions((prev) => ({ ...prev, [action]: true }));
    try {
      await task();
    } finally {
      pendingActionsRef.current[action] = false;
      setPendingActions((prev) => ({ ...prev, [action]: false }));
    }
  };

  const handleToggleInterest = async () => {
    if (requireLogin()) return;
    if (ended || event.status !== "APPROVED") {
      notify(EVENT_MESSAGES.DETAIL_ENDED, "error");
      return;
    }
    await runAction("interest", async () => {
      try {
        const res = await eventService.toggleInterest(event.event_id);
        onEventUpdated({
          ...event,
          is_interested: res.is_interested,
          interested_count: res.interested_count,
        });
        notify(res.message);
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
          ?.detail;
        notify(typeof detail === "string" ? detail : EVENT_MESSAGES.DETAIL_ACTION_ERROR, "error");
      }
    });
  };

  const handleToggleJoin = async () => {
    if (requireLogin()) return;
    if (ended) {
      notify(EVENT_MESSAGES.DETAIL_ENDED, "error");
      return;
    }
    // Người tổ chức luôn là participant và backend không cho tự huỷ tham gia
    if (isCreator && event.is_joined) {
      notify(EVENT_MESSAGES.DETAIL_CREATOR_LEAVE_LOCKED, "error");
      return;
    }
    await runAction("join", async () => {
      try {
        const res = await eventService.toggleJoin(event.event_id);
        onEventUpdated({
          ...event,
          is_joined: res.is_joined,
          current_participants: res.current_participants,
        });
        notify(
          res.is_joined ? EVENT_MESSAGES.DETAIL_JOIN_SUCCESS : EVENT_MESSAGES.DETAIL_LEAVE_SUCCESS
        );
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
          ?.detail;
        notify(typeof detail === "string" ? detail : EVENT_MESSAGES.DETAIL_ACTION_ERROR, "error");
      }
    });
  };

  const handleCancelEvent = async () => {
    setShowCancelConfirm(false);
    await runAction("cancel", async () => {
      try {
        await eventService.cancelEvent(event.event_id);
        notify(EVENT_MESSAGES.DETAIL_CANCEL_SUCCESS);
        onEventUpdated({ ...event, status: "CANCELLED" });
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
          ?.detail;
        notify(typeof detail === "string" ? detail : EVENT_MESSAGES.DETAIL_ACTION_ERROR, "error");
      }
    });
  };

  const handleReview = async (status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !rejectReason.trim()) {
      notify(EVENT_MESSAGES.ADMIN_REJECT_REASON_REQUIRED, "error");
      return;
    }
    try {
      setReviewing(true);
      const updated = await eventService.reviewEvent(event.event_id, {
        status,
        reject_reason: status === "REJECTED" ? rejectReason.trim() : undefined,
      });
      onEventUpdated(updated);
      setShowRejectForm(false);
      setRejectReason("");
      notify(
        status === "APPROVED"
          ? EVENT_MESSAGES.ADMIN_APPROVED_TOAST
          : EVENT_MESSAGES.ADMIN_REJECTED_TOAST
      );
    } catch {
      notify(EVENT_MESSAGES.DETAIL_ACTION_ERROR, "error");
    } finally {
      setReviewing(false);
    }
  };

  const handleOpenParticipants = async () => {
    setShowParticipants(true);
    if (allParticipants.length > 0 || participantsLoading) return;
    setParticipantsLoading(true);
    try {
      const list = await eventService.getParticipants(event.event_id);
      setAllParticipants(list);
    } catch {
      notify(EVENT_MESSAGES.LIST_LOAD_ERROR, "error");
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleCheckinSuccess = (res: CheckinResponse) => {
    onEventUpdated({ ...event, is_checked_in: true });
    notify(res.message);
  };

  // Render qua portal ra document.body: tránh việc overlay `position: fixed` bị
  // neo/lệch hoặc cắt bởi các khối cha có transform/overflow (khiến vùng bấm của nút
  // không khớp với vị trí hiển thị).
  return createPortal(
    <>
      <div className="event-modal-overlay" data-testid="event-detail-modal-overlay">
        <div className="event-modal-box large" data-testid="event-detail-modal">
          <div className="modal-header">
            <div className="modal-title-wrap">
              <h2>{EVENT_MESSAGES.DETAIL_TITLE}</h2>
              <p className="modal-sub">Mã sự kiện: {event.event_id.slice(0, 8)}…</p>
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

          <div className="modal-body-scroll">
            <div className="event-detail-view">
              {/* Hero Banner */}
              <div className="detail-hero-banner">
                <img src={resolveMediaUrl(event.cover_image_url)} alt={event.title} />
                <div className="banner-overlay">
                  <h3 className="hero-title">{event.title}</h3>
                  <div className="hero-meta-row">
                    <span>📍 {event.district}</span>
                    <span>📅 {formatDateTime(event.start_time)}</span>
                  </div>
                </div>
              </div>

              {/* Cảnh báo trạng thái */}
              {event.status !== "APPROVED" && (
                <div className={`detail-status-note status-note-${event.status}`}>
                  {event.status === "PENDING" && <span>⏳ {EVENT_MESSAGES.DETAIL_STATUS_PENDING}</span>}
                  {event.status === "REJECTED" && (
                    <span>
                      ❌ {EVENT_MESSAGES.DETAIL_STATUS_REJECTED}{" "}
                      <strong>{event.reject_reason || "Không rõ lý do"}</strong>
                    </span>
                  )}
                  {event.status === "CANCELLED" && (
                    <span>🛑 {EVENT_MESSAGES.DETAIL_STATUS_CANCELLED}</span>
                  )}
                </div>
              )}

              {ended && event.status === "APPROVED" && (
                <div className="detail-ended-note">🏁 {EVENT_MESSAGES.DETAIL_ENDED}</div>
              )}

              <div className="detail-content-grid">
                <div className="detail-main-col">
                  <div className="section-block">
                    <h4>📋 Nội dung hoạt động &amp; Vật dụng cần mang theo</h4>
                    <div className="desc-text">{event.description}</div>
                  </div>

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
                              <img src={resolveMediaUrl(p.avatar_url)} alt={p.full_name} />
                            ) : (
                              <span>{p.full_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted-text">{EVENT_MESSAGES.DETAIL_PARTICIPANTS_EMPTY}</p>
                    )}
                    <button
                      type="button"
                      className="btn-link-participants"
                      data-testid="btn-view-all-participants"
                      onClick={handleOpenParticipants}
                    >
                      {EVENT_MESSAGES.DETAIL_VIEW_ALL_PARTICIPANTS}
                    </button>
                  </div>

                  <div className="section-block">
                    <h4>🗺️ {EVENT_MESSAGES.DETAIL_MAP_TITLE}</h4>
                    <div
                      ref={mapContainerRef}
                      className="detail-map-container"
                      data-testid="detail-map"
                    />
                  </div>
                </div>

                {/* Cột phải: Thông tin tổ chức & Nút bấm */}
                <div className="detail-side-col">
                  <div className="info-box-card">
                    <div className="info-row">
                      <span className="info-icon">👤</span>
                      <div className="info-text">
                        <div className="info-label">{EVENT_MESSAGES.DETAIL_ORGANIZER}</div>
                        <div className="info-val">{event.creator_name || "Quản trị viên"}</div>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-icon">📍</span>
                      <div className="info-text">
                        <div className="info-label">{EVENT_MESSAGES.DETAIL_LOCATION}</div>
                        <div className="info-val">{event.address}</div>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-icon">🕒</span>
                      <div className="info-text">
                        <div className="info-label">{EVENT_MESSAGES.DETAIL_TIME}</div>
                        <div className="info-val">
                          {formatDateTime(event.start_time)}
                          {event.end_time ? ` → ${formatDateTime(event.end_time)}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="info-icon">🎯</span>
                      <div className="info-text">
                        <div className="info-label">{EVENT_MESSAGES.DETAIL_RADIUS}</div>
                        <div className="info-val">
                          Trong vòng {event.checkin_radius_meters || 100}m quanh điểm ghim
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Khối duyệt sự kiện cho Quản trị viên */}
                  {canApprove && event.status === "PENDING" && (
                    <div className="admin-review-box" data-testid="detail-admin-review">
                      <h4>🛡️ Phê duyệt sự kiện</h4>
                      <div className="admin-review-actions">
                        <button
                          type="button"
                          className="btn-admin-approve"
                          disabled={reviewing}
                          onClick={() => handleReview("APPROVED")}
                        >
                          {EVENT_MESSAGES.ADMIN_APPROVE}
                        </button>
                        <button
                          type="button"
                          className="btn-admin-reject"
                          disabled={reviewing}
                          onClick={() => setShowRejectForm((prev) => !prev)}
                        >
                          {EVENT_MESSAGES.ADMIN_REJECT}
                        </button>
                      </div>
                      {showRejectForm && (
                        <div className="admin-reject-form">
                          <textarea
                            rows={3}
                            maxLength={500}
                            value={rejectReason}
                            placeholder="Nhập lý do từ chối (bắt buộc, tối đa 500 ký tự)"
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-admin-reject"
                            disabled={reviewing}
                            onClick={() => handleReview("REJECTED")}
                          >
                            Gửi lý do &amp; từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="action-buttons-stack">
                    {/* 1. Check-in GPS */}
                    {event.is_joined && event.status === "APPROVED" && (
                      <div>
                        {event.is_checked_in ? (
                          <button
                            type="button"
                            className="btn-action-primary btn-checkin-done"
                            disabled
                          >
                            ✅ {EVENT_MESSAGES.CHECKIN_DONE}
                          </button>
                        ) : ended ? (
                          <button type="button" className="btn-action-primary" disabled>
                            🏁 {EVENT_MESSAGES.CHECKIN_CLOSED}
                          </button>
                        ) : checkinWindowState === "open" ? (
                          <button
                            type="button"
                            className="btn-action-primary btn-checkin-gold"
                            data-testid="btn-open-checkin"
                            onClick={() => setIsCheckinOpen(true)}
                          >
                            🎯 {EVENT_MESSAGES.CHECKIN_OPEN}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-action-primary"
                            disabled
                            title={EVENT_MESSAGES.CHECKIN_WINDOW_HINT}
                          >
                            {checkinWindowState === "before"
                              ? `⏳ ${EVENT_MESSAGES.CHECKIN_EARLY}`
                              : `🏁 ${EVENT_MESSAGES.CHECKIN_CLOSED}`}
                          </button>
                        )}
                        <p className="field-hint">{EVENT_MESSAGES.CHECKIN_WINDOW_HINT}</p>
                      </div>
                    )}

                    {/* 2. Tham gia / Hủy tham gia */}
                    {event.status === "APPROVED" && isCreator && event.is_joined ? (
                      // Người tổ chức không thể tự huỷ tham gia (backend trả 400) nên
                      // hiển thị nhãn cố định thay vì nút bấm luôn thất bại.
                      <button
                        type="button"
                        className="btn-action-primary"
                        data-testid="btn-creator-joined"
                        disabled
                        title={EVENT_MESSAGES.DETAIL_CREATOR_LEAVE_LOCKED}
                      >
                        👑 {EVENT_MESSAGES.DETAIL_CREATOR_LEAVE_LOCKED}
                      </button>
                    ) : (
                      event.status === "APPROVED" && (
                        <button
                          type="button"
                          className={`btn-action-primary ${event.is_joined ? "btn-cancel" : ""}`}
                          data-testid="btn-toggle-join"
                          disabled={pendingActions.join || ended || (!event.is_joined && isFull)}
                          aria-busy={pendingActions.join}
                          onClick={handleToggleJoin}
                        >
                          {pendingActions.join
                            ? event.is_joined
                              ? EVENT_MESSAGES.DETAIL_LEAVING
                              : EVENT_MESSAGES.DETAIL_JOINING
                            : ended
                            ? EVENT_MESSAGES.DETAIL_ENDED
                            : event.is_joined
                            ? EVENT_MESSAGES.DETAIL_LEAVE
                            : isFull
                            ? EVENT_MESSAGES.DETAIL_FULL
                            : `${EVENT_MESSAGES.DETAIL_JOIN} (${event.current_participants}/${event.max_participants})`}
                        </button>
                      )
                    )}

                    {/* 3. Quan tâm */}
                    <button
                      type="button"
                      className={`btn-action-secondary ${event.is_interested ? "active" : ""}`}
                      data-testid="btn-toggle-interest"
                      disabled={pendingActions.interest || ended || event.status !== "APPROVED"}
                      aria-busy={pendingActions.interest}
                      onClick={handleToggleInterest}
                    >
                      {pendingActions.interest
                        ? `⏳ ${EVENT_MESSAGES.DETAIL_PROCESSING}`
                        : event.is_interested
                        ? `❤️ ${EVENT_MESSAGES.DETAIL_INTERESTED} (${event.interested_count})`
                        : `🤍 ${EVENT_MESSAGES.DETAIL_INTEREST} (${event.interested_count})`}
                    </button>

                    {/* 4. Chỉnh sửa / Hủy sự kiện cho người tổ chức */}
                    {canManage && event.status !== "CANCELLED" && !ended && !started && (
                      <button
                        type="button"
                        className="btn-action-secondary"
                        data-testid="btn-edit-event"
                        onClick={() => setIsEditOpen(true)}
                        disabled={pendingActions.cancel}
                      >
                        ✏️ {EVENT_MESSAGES.DETAIL_EDIT}
                      </button>
                    )}

                    {canManage && event.status !== "CANCELLED" && !ended && (
                      <button
                        type="button"
                        className="btn-action-secondary btn-danger-outline"
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={pendingActions.cancel}
                        aria-busy={pendingActions.cancel}
                      >
                        {pendingActions.cancel
                          ? EVENT_MESSAGES.DETAIL_CANCELLING
                          : EVENT_MESSAGES.DETAIL_CANCEL_EVENT}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal danh sách đầy đủ người tham gia */}
      {showParticipants && (
        <div
          className="event-modal-overlay"
          data-testid="participants-modal-overlay"
          onClick={() => setShowParticipants(false)}
        >
          <div className="participants-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h2>{EVENT_MESSAGES.DETAIL_PARTICIPANTS_TITLE}</h2>
                <p className="modal-sub">
                  {event.current_participants}/{event.max_participants} người đã đăng ký
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowParticipants(false)}
              >
                ×
              </button>
            </div>
            <div className="participants-modal-body">
              {participantsLoading ? (
                <p className="muted-text">{EVENT_MESSAGES.LIST_LOADING}</p>
              ) : allParticipants.length === 0 ? (
                <p className="muted-text">{EVENT_MESSAGES.DETAIL_PARTICIPANTS_EMPTY}</p>
              ) : (
                <ul className="participants-full-list">
                  {allParticipants.map((p) => (
                    <li key={p.user_id}>
                      <span className="participant-avatar-small">
                        {p.avatar_url ? (
                          <img src={resolveMediaUrl(p.avatar_url)} alt={p.full_name} />
                        ) : (
                          p.full_name.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="participant-name">{p.full_name}</span>
                      {p.is_creator && <span className="badge-joined">Người tổ chức</span>}
                      <span className="participant-joined-at">
                        {formatDateTime(p.joined_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Xác nhận hủy sự kiện */}
      {showCancelConfirm && (
        <div className="event-modal-overlay" data-testid="cancel-event-confirm">
          <div className="discard-confirm-box">
            <h3>{EVENT_MESSAGES.DETAIL_CANCEL_EVENT}</h3>
            <p>{EVENT_MESSAGES.DETAIL_CANCEL_CONFIRM}</p>
            <div className="discard-confirm-actions">
              <button
                type="button"
                className="btn-my-events-toggle"
                onClick={() => setShowCancelConfirm(false)}
              >
                {EVENT_MESSAGES.DISCARD_CANCEL}
              </button>
              <button
                type="button"
                className="btn-create-event btn-danger-solid"
                onClick={handleCancelEvent}
                disabled={pendingActions.cancel}
                aria-busy={pendingActions.cancel}
              >
                {pendingActions.cancel
                  ? EVENT_MESSAGES.DETAIL_CANCELLING
                  : EVENT_MESSAGES.DETAIL_CANCEL_EVENT}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa sự kiện (dùng lại CreateEventModal) */}
      <CreateEventModal
        isOpen={isEditOpen}
        event={event}
        onClose={() => setIsEditOpen(false)}
        onSuccess={(updated) => onEventUpdated(updated)}
        onToast={onToast}
      />


      {/* Modal Check-in GPS (Màn 4/4) */}
      <EventCheckinModal
        event={event}
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        onCheckinSuccess={handleCheckinSuccess}
        onToast={onToast}
      />
    </>,
    document.body
  );
};




