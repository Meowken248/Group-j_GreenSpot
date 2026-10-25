import React, { useCallback, useEffect, useRef, useState } from "react";
import type { GreenEvent } from "../types/event.types";
import { HCM_DISTRICTS } from "../types/event.types";
import { eventService } from "../services/eventService";
import { CreateEventModal } from "./CreateEventModal";
import { EventDetailModal } from "./EventDetailModal";
import { Toast } from "../../auth/components/Toast";
import type { ToastState } from "../../auth/types/auth.types";
import { EVENT_MESSAGES } from "../utils/eventMessages";
import {
  formatShortDateTime,
  getEventStatusLabelKey,
  isEventEnded,
  resolveMediaUrl,
} from "../utils/datetime";
import "../styles/Events.scss";

const PAGE_SIZE = 12;

interface EventsListProps {
  isLoggedIn: boolean;
  currentUserId?: string;
  canApprove?: boolean;
  onOpenLogin: () => void;
}

export const EventsList: React.FC<EventsListProps> = ({
  isLoggedIn,
  currentUserId,
  canApprove = false,
  onOpenLogin,
}) => {
  const [events, setEvents] = useState<GreenEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bộ lọc
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("all");
  const [timeFilter, setTimeFilter] = useState("upcoming");
  const [myEvents, setMyEvents] = useState(false);
  const [page, setPage] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GreenEvent | null>(null);

  // Duyệt sự kiện (Quản trị viên)
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<GreenEvent[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const buildParams = useCallback(
    (targetPage: number) => ({
      district: district === "all" ? undefined : district,
      time_filter: timeFilter,
      search: search.trim() || undefined,
      my_events: myEvents,
      page: targetPage,
      page_size: PAGE_SIZE,
    }),
    [district, timeFilter, search, myEvents]
  );

  // Tải danh sách: trang 1 thay thế, các trang sau nối thêm (infinite scroll)
  const fetchEvents = useCallback(
    async (targetPage: number) => {
      const currentRequest = ++requestIdRef.current;
      if (targetPage === 1) {
        setLoading(true);
        setErrorMessage(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await eventService.getEvents(buildParams(targetPage));
        if (currentRequest !== requestIdRef.current) return;
        setEvents((prev) => (targetPage === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPage(targetPage);
      } catch {
        if (currentRequest !== requestIdRef.current) return;
        setErrorMessage(EVENT_MESSAGES.LIST_LOAD_ERROR);
      } finally {
        if (currentRequest === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildParams]
  );

  // Reset về trang 1 mỗi khi bộ lọc thay đổi
  useEffect(() => {
    fetchEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, timeFilter, search, myEvents]);

  const hasMore = events.length < total;

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;
    const node = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchEvents(page + 1);
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchEvents]);

  const loadPendingEvents = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await eventService.getEvents({
        status: "PENDING",
        time_filter: "all",
        page: 1,
        page_size: 50,
      });
      setPendingEvents(res.items);
    } catch {
      showToast(EVENT_MESSAGES.LIST_LOAD_ERROR, "error");
    } finally {
      setPendingLoading(false);
    }
  }, [showToast]);

  const handleToggleAdminPanel = () => {
    const next = !isAdminPanelOpen;
    setIsAdminPanelOpen(next);
    if (next) loadPendingEvents();
  };

  const handleReview = async (eventId: string, status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !rejectReason.trim()) {
      showToast(EVENT_MESSAGES.ADMIN_REJECT_REASON_REQUIRED, "error");
      return;
    }
    setReviewingId(eventId);
    try {
      await eventService.reviewEvent(eventId, {
        status,
        reject_reason: status === "REJECTED" ? rejectReason.trim() : undefined,
      });
      showToast(
        status === "APPROVED"
          ? EVENT_MESSAGES.ADMIN_APPROVED_TOAST
          : EVENT_MESSAGES.ADMIN_REJECTED_TOAST
      );
      setPendingEvents((prev) => prev.filter((ev) => ev.event_id !== eventId));
      setRejectingId(null);
      setRejectReason("");
      fetchEvents(1);
    } catch {
      showToast(EVENT_MESSAGES.DETAIL_ACTION_ERROR, "error");
    } finally {
      setReviewingId(null);
    }
  };

  const handleOpenCreate = () => {
    if (!isLoggedIn) {
      showToast(EVENT_MESSAGES.LOGIN_REQUIRED_CREATE, "error");
      onOpenLogin();
      return;
    }
    setIsCreateOpen(true);
  };

  const handleEventCreated = () => {
    setMyEvents(true);
    setTimeFilter("all");
    showToast(EVENT_MESSAGES.CREATE_SUCCESS);
  };

  const handleEventUpdated = (updatedEv: GreenEvent) => {
    setSelectedEvent(updatedEv);
    setEvents((prev) => prev.map((e) => (e.event_id === updatedEv.event_id ? updatedEv : e)));
  };

  const handleQuickJoin = async (ev: GreenEvent) => {
    if (!isLoggedIn) {
      showToast(EVENT_MESSAGES.LOGIN_REQUIRED_INTERACT, "error");
      onOpenLogin();
      return;
    }
    try {
      const res = await eventService.toggleJoin(ev.event_id);
      const updated: GreenEvent = {
        ...ev,
        is_joined: res.is_joined,
        current_participants: res.current_participants,
      };
      setEvents((prev) => prev.map((e) => (e.event_id === ev.event_id ? updated : e)));
      showToast(
        res.is_joined ? EVENT_MESSAGES.DETAIL_JOIN_SUCCESS : EVENT_MESSAGES.DETAIL_LEAVE_SUCCESS
      );
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      showToast(typeof detail === "string" ? detail : EVENT_MESSAGES.DETAIL_ACTION_ERROR, "error");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setDistrict("all");
    setTimeFilter("upcoming");
    setMyEvents(false);
  };

  const renderStatusBadge = (ev: GreenEvent) => {
    const labelKey = getEventStatusLabelKey(ev);
    return <span className={`status-badge status-${ev.status}`}>{EVENT_MESSAGES[labelKey]}</span>;
  };

  return (
    <div className="events-feature-container" data-testid="events-feature-container">
      {/* 1. Header Toolbar */}
      <div className="events-header-toolbar">
        <div className="toolbar-title-group">
          <span className="badge-tag">CHIẾN DỊCH VÌ CỘNG ĐỒNG</span>
          <h1>Sự kiện Chủ Nhật Xanh</h1>
          <p>
            Chung tay hành động vì một TP. Hồ Chí Minh xanh - sạch - văn minh &amp; nhận điểm thưởng
            Green Passport
          </p>
        </div>

        <div className="toolbar-actions-group">
          {isLoggedIn && (
            <button
              type="button"
              className={`btn-my-events-toggle ${myEvents ? "active" : ""}`}
              data-testid="btn-toggle-my-events"
              onClick={() => setMyEvents((prev) => !prev)}
            >
              {myEvents ? "Tất cả sự kiện" : "📌 Sự kiện của tôi"}
            </button>
          )}

          {canApprove && (
            <button
              type="button"
              className={`btn-my-events-toggle ${isAdminPanelOpen ? "active" : ""}`}
              data-testid="btn-toggle-admin-panel"
              onClick={handleToggleAdminPanel}
            >
              🛡️ Duyệt sự kiện
            </button>
          )}

          <button
            type="button"
            className="btn-create-event"
            data-testid="btn-open-create-event"
            onClick={handleOpenCreate}
          >
            <span>➕</span>
            <span>Tạo sự kiện mới</span>
          </button>
        </div>
      </div>

      {/* 2. Admin duyệt sự kiện */}
      {canApprove && isAdminPanelOpen && (
        <section className="admin-approval-panel" data-testid="admin-approval-panel">
          <div className="admin-panel-header">
            <h2>{EVENT_MESSAGES.ADMIN_PANEL_TITLE}</h2>
            <button
              type="button"
              className="btn-my-events-toggle"
              onClick={() => loadPendingEvents()}
              disabled={pendingLoading}
            >
              {pendingLoading ? EVENT_MESSAGES.LIST_LOADING : EVENT_MESSAGES.LIST_RETRY}
            </button>
          </div>

          {pendingLoading ? (
            <p className="admin-panel-empty">{EVENT_MESSAGES.LIST_LOADING}</p>
          ) : pendingEvents.length === 0 ? (
            <p className="admin-panel-empty">{EVENT_MESSAGES.ADMIN_PANEL_EMPTY}</p>
          ) : (
            <ul className="admin-pending-list">
              {pendingEvents.map((ev) => (
                <li key={ev.event_id} className="admin-pending-item">
                  <div className="admin-pending-info">
                    <strong>{ev.title}</strong>
                    <span>
                      📍 {ev.district} · 🕒 {formatShortDateTime(ev.start_time)} · 👤{" "}
                      {ev.creator_name || "Người tổ chức"}
                    </span>
                  </div>
                  <div className="admin-pending-actions">
                    <button
                      type="button"
                      className="btn-admin-approve"
                      data-testid={`btn-approve-${ev.event_id}`}
                      disabled={reviewingId === ev.event_id}
                      onClick={() => handleReview(ev.event_id, "APPROVED")}
                    >
                      {EVENT_MESSAGES.ADMIN_APPROVE}
                    </button>
                    <button
                      type="button"
                      className="btn-admin-reject"
                      data-testid={`btn-reject-${ev.event_id}`}
                      disabled={reviewingId === ev.event_id}
                      onClick={() => {
                        setRejectingId(ev.event_id);
                        setRejectReason("");
                      }}
                    >
                      {EVENT_MESSAGES.ADMIN_REJECT}
                    </button>
                  </div>

                  {rejectingId === ev.event_id && (
                    <div className="admin-reject-form">
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={rejectReason}
                        placeholder="Nhập lý do từ chối (bắt buộc, tối đa 500 ký tự)"
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="admin-reject-actions">
                        <button
                          type="button"
                          className="btn-admin-reject"
                          disabled={reviewingId === ev.event_id}
                          onClick={() => handleReview(ev.event_id, "REJECTED")}
                        >
                          Gửi lý do &amp; từ chối
                        </button>
                        <button
                          type="button"
                          className="btn-my-events-toggle"
                          onClick={() => setRejectingId(null)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 3. Filter Bar */}
      <div className="events-filter-bar">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            data-testid="input-search-events"
            placeholder="Tìm theo tên sự kiện hoặc địa điểm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="district-filter-wrapper">
          <select
            data-testid="select-filter-district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="all">Toàn TP. Hồ Chí Minh</option>
            {HCM_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="time-filter-pills">
          {[
            { key: "upcoming", label: "Sắp diễn ra" },
            { key: "this_week", label: "Tuần này" },
            { key: "past", label: "Đã kết thúc" },
            { key: "all", label: "Tất cả" },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`pill-btn ${timeFilter === filter.key ? "active" : ""}`}
              onClick={() => setTimeFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Danh sách sự kiện */}
      {loading ? (
        <div className="events-loading-state" data-testid="events-loading">
          {EVENT_MESSAGES.LIST_LOADING}
        </div>
      ) : errorMessage ? (
        <div className="events-error-state" data-testid="events-error">
          <p>{errorMessage}</p>
          <button type="button" className="btn-create-event" onClick={() => fetchEvents(1)}>
            {EVENT_MESSAGES.LIST_RETRY}
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-events-placeholder" data-testid="empty-events-placeholder">
          <div className="empty-icon">🌿</div>
          <h3>{EVENT_MESSAGES.EMPTY_TITLE}</h3>
          <p>{EVENT_MESSAGES.EMPTY_DESCRIPTION}</p>
          <button type="button" className="btn-my-events-toggle" onClick={resetFilters}>
            {EVENT_MESSAGES.EMPTY_ACTION}
          </button>
        </div>
      ) : (
        <>
          <div className="events-grid" data-testid="events-grid">
            {events.map((ev) => {
              const isFull = ev.current_participants >= ev.max_participants;
              const ended = isEventEnded(ev);
              const progressPercent = Math.min(
                100,
                Math.round((ev.current_participants / Math.max(1, ev.max_participants)) * 100)
              );
              const canJoin = ev.status === "APPROVED" && !ended && !isFull && !ev.is_joined;

              return (
                <div
                  key={ev.event_id}
                  className={`event-card ${ended ? "event-card-ended" : ""}`}
                  data-testid={`event-card-${ev.event_id}`}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div className="card-media">
                    <img src={resolveMediaUrl(ev.cover_image_url)} alt={ev.title} loading="lazy" />
                    {renderStatusBadge(ev)}
                    <span className="district-tag">📍 {ev.district}</span>
                  </div>

                  <div className="card-content">
                    <div className="event-time-row">
                      <span>📅 {formatShortDateTime(ev.start_time)}</span>
                    </div>

                    <h3 className="event-title">{ev.title}</h3>
                    <div className="event-address">{ev.address}</div>

                    <div className="card-progress-section">
                      <div className="progress-labels">
                        <span>Đã đăng ký</span>
                        <span className="count-strong">
                          {ev.current_participants}/{ev.max_participants} người
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>

                    <div className="card-footer-actions">
                      <div className="interested-meta">
                        <span>❤️</span>
                        <span>
                          {ev.interested_count} {EVENT_MESSAGES.CARD_INTERESTED}
                        </span>
                      </div>
                      <div className="card-action-buttons">
                        {canJoin && (
                          <button
                            type="button"
                            className="btn-card-join"
                            data-testid={`btn-quick-join-${ev.event_id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickJoin(ev);
                            }}
                          >
                            {EVENT_MESSAGES.DETAIL_JOIN}
                          </button>
                        )}
                        {ev.is_joined && (
                          <span className="badge-joined">{EVENT_MESSAGES.CARD_JOINED}</span>
                        )}
                        <button
                          type="button"
                          className="btn-card-detail"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                        >
                          {EVENT_MESSAGES.CARD_DETAIL}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentinel cho infinite scroll */}
          <div ref={sentinelRef} className="events-scroll-sentinel" aria-hidden="true" />
          {loadingMore && (
            <div className="events-loading-more">{EVENT_MESSAGES.LIST_LOAD_MORE}</div>
          )}
          {!hasMore && events.length > 0 && (
            <div className="events-list-end">{EVENT_MESSAGES.LIST_END}</div>
          )}
        </>
      )}

      {/* 5. Modals */}
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleEventCreated}
      />

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          canApprove={canApprove}
          onOpenLogin={onOpenLogin}
          onEventUpdated={handleEventUpdated}
          onToast={showToast}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
};




