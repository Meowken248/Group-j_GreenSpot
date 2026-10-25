import React, { useState, useEffect, useCallback } from "react";
import type { GreenEvent } from "../types/event.types";
import { HCM_DISTRICTS } from "../types/event.types";
import { eventService } from "../services/eventService";
import { CreateEventModal } from "./CreateEventModal";
import { EventDetailModal } from "./EventDetailModal";
import "../styles/Events.scss";

interface EventsListProps {
  isLoggedIn: boolean;
  currentUserId?: string;
  onOpenLogin: () => void;
}

export const EventsList: React.FC<EventsListProps> = ({
  isLoggedIn,
  currentUserId,
  onOpenLogin,
}) => {
  const [events, setEvents] = useState<GreenEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bộ lọc
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("all");
  const [timeFilter, setTimeFilter] = useState("upcoming");
  const [myEvents, setMyEvents] = useState(false);
  const [page, setPage] = useState(1);
  const [_total, setTotal] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GreenEvent | null>(null);

  // Tải danh sách sự kiện
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await eventService.getEvents({
        district: district === "all" ? undefined : district,
        time_filter: timeFilter,
        search: search.trim() || undefined,
        my_events: myEvents,
        page,
        page_size: 12,
      });
      setEvents(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setErrorMessage("Không thể tải danh sách sự kiện. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [district, timeFilter, search, myEvents, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenCreate = () => {
    if (!isLoggedIn) {
      onOpenLogin();
      return;
    }
    setIsCreateOpen(true);
  };

  const handleEventCreated = (_newEv: GreenEvent) => {
    setMyEvents(true);
    fetchEvents();
  };

  const handleEventUpdated = (updatedEv: GreenEvent) => {
    setSelectedEvent(updatedEv);
    setEvents((prev) =>
      prev.map((e) => (e.event_id === updatedEv.event_id ? updatedEv : e))
    );
  };

  return (
    <div className="events-feature-container" data-testid="events-feature-container">
      {/* 1. Header Toolbar */}
      <div className="events-header-toolbar">
        <div className="toolbar-title-group">
          <span className="badge-tag">CHIẾN DỊCH VÌ CỘNG ĐỒNG</span>
          <h1>Sự kiện Chủ Nhật Xanh</h1>
          <p>
            Chung tay hành động vì một TP. Hồ Chí Minh xanh - sạch - văn minh & nhận điểm thưởng Green Passport
          </p>
        </div>

        <div className="toolbar-actions-group">
          {isLoggedIn && (
            <button
              type="button"
              className={`btn-my-events-toggle ${myEvents ? "active" : ""}`}
              data-testid="btn-toggle-my-events"
              onClick={() => {
                setMyEvents(!myEvents);
                setPage(1);
              }}
            >
              {myEvents ? "Tất cả sự kiện" : "📌 Sự kiện của tôi"}
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

      {/* 2. Filter Bar */}
      <div className="events-filter-bar">
        {/* Tìm kiếm */}
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            data-testid="input-search-events"
            placeholder="Tìm theo tên sự kiện hoặc địa điểm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Lọc quận huyện */}
        <div className="district-filter-wrapper">
          <select
            data-testid="select-filter-district"
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Toàn TP. Hồ Chí Minh</option>
            {HCM_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc thời gian */}
        <div className="time-filter-pills">
          <button
            type="button"
            className={`pill-btn ${timeFilter === "upcoming" ? "active" : ""}`}
            onClick={() => {
              setTimeFilter("upcoming");
              setPage(1);
            }}
          >
            Sắp diễn ra
          </button>
          <button
            type="button"
            className={`pill-btn ${timeFilter === "this_week" ? "active" : ""}`}
            onClick={() => {
              setTimeFilter("this_week");
              setPage(1);
            }}
          >
            Tuần này
          </button>
          <button
            type="button"
            className={`pill-btn ${timeFilter === "past" ? "active" : ""}`}
            onClick={() => {
              setTimeFilter("past");
              setPage(1);
            }}
          >
            Đã kết thúc
          </button>
          <button
            type="button"
            className={`pill-btn ${timeFilter === "all" ? "active" : ""}`}
            onClick={() => {
              setTimeFilter("all");
              setPage(1);
            }}
          >
            Tất cả
          </button>
        </div>
      </div>

      {/* 3. Danh sách sự kiện */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
          🌱 Đang tải danh sách sự kiện Chủ Nhật Xanh…
        </div>
      ) : errorMessage ? (
        <div
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            padding: "1.25rem",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          {errorMessage}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-events-placeholder" data-testid="empty-events-placeholder">
          <div className="empty-icon">🌿</div>
          <h3>Không tìm thấy sự kiện nào phù hợp</h3>
          <p>Hãy thử thay đổi quận/huyện hoặc từ khóa tìm kiếm bên trên.</p>
        </div>
      ) : (
        <div className="events-grid" data-testid="events-grid">
          {events.map((ev) => {
            const isFull = ev.current_participants >= ev.max_participants;
            const progressPercent = Math.min(
              100,
              Math.round((ev.current_participants / ev.max_participants) * 100)
            );

            return (
              <div
                key={ev.event_id}
                className="event-card"
                data-testid={`event-card-${ev.event_id}`}
                onClick={() => setSelectedEvent(ev)}
              >
                {/* Ảnh bìa & Tag */}
                <div className="card-media">
                  <img src={ev.cover_image_url} alt={ev.title} loading="lazy" />
                  <span className={`status-badge status-${ev.status}`}>
                    {ev.status === "APPROVED"
                      ? isFull
                        ? "Đã đủ người"
                        : "Sắp diễn ra"
                      : ev.status === "PENDING"
                      ? "Chờ duyệt"
                      : ev.status === "REJECTED"
                      ? "Từ chối"
                      : "Đã hủy"}
                  </span>
                  <span className="district-tag">📍 {ev.district}</span>
                </div>

                {/* Nội dung tóm tắt */}
                <div className="card-content">
                  <div className="event-time-row">
                    <span>
                      📅{" "}
                      {new Date(ev.start_time).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <h3 className="event-title">{ev.title}</h3>
                  <div className="event-address">{ev.address}</div>

                  {/* Tiến độ người tham gia */}
                  <div className="card-progress-section">
                    <div className="progress-labels">
                      <span>Đã đăng ký</span>
                      <span className="count-strong">
                        {ev.current_participants}/{ev.max_participants} người
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer card */}
                  <div className="card-footer-actions">
                    <div className="interested-meta">
                      <span>❤️</span>
                      <span>{ev.interested_count} quan tâm</span>
                    </div>
                    <button
                      type="button"
                      className="btn-card-detail"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                      }}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal Tạo sự kiện mới (Màn 2/4) */}
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleEventCreated}
      />

      {/* 5. Modal Chi tiết sự kiện & Tương tác (Màn 3/4 & 4/4) */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          onOpenLogin={onOpenLogin}
          onEventUpdated={handleEventUpdated}
        />
      )}
    </div>
  );
};
