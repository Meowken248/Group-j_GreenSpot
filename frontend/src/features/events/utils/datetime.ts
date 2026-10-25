import type { GreenEvent } from "../types/event.types";

/** Số giờ check-in mở trước giờ bắt đầu (đặc tả Trang 176). */
export const CHECKIN_OPEN_BEFORE_MS = 60 * 60 * 1000;
/** Số giờ check-in còn mở sau giờ bắt đầu. */
export const CHECKIN_CLOSE_AFTER_MS = 3 * 60 * 60 * 1000;
/** Thời gian tối thiểu trước giờ bắt đầu khi tạo/chỉnh sửa sự kiện. */
export const MIN_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Chuyển Date -> chuỗi cho <input type="datetime-local"> theo GIỜ ĐỊA PHƯƠNG.
 * Sửa lỗi cũ: dùng toISOString() khiến giá trị bị lệch múi giờ (UTC+7),
 * hiển thị sớm hơn 7 giờ so với giờ người dùng chọn.
 */
export const toLocalInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;

/** Chuỗi datetime-local (giờ địa phương) -> ISO UTC để gửi backend. */
export const localInputToIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** ISO -> chuỗi datetime-local theo giờ địa phương (dùng khi mở form chỉnh sửa). */
export const isoToLocalInput = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : toLocalInputValue(date);
};

/** Định dạng ngày giờ đầy đủ tiếng Việt. */
export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Định dạng ngày giờ ngắn dùng trên card. */
export const formatShortDateTime = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Thời điểm kết thúc hiệu lực của sự kiện (end_time hoặc start + 3h). */
export const getEventEndTime = (event: Pick<GreenEvent, "start_time" | "end_time">): number => {
  if (event.end_time) return new Date(event.end_time).getTime();
  return new Date(event.start_time).getTime() + CHECKIN_CLOSE_AFTER_MS;
};

/** Sự kiện đã kết thúc chưa (dùng cho nhãn và chặn tương tác phía UI). */
export const isEventEnded = (
  event: Pick<GreenEvent, "start_time" | "end_time" | "is_ended">,
  now: number = Date.now()
): boolean => {
  if (typeof event.is_ended === "boolean") return event.is_ended;
  return getEventEndTime(event) <= now;
};

/** Khoảng thời gian mở check-in của sự kiện. */
export const getCheckinWindow = (event: Pick<GreenEvent, "start_time" | "end_time">) => {
  const start = new Date(event.start_time).getTime();
  return {
    openAt: start - CHECKIN_OPEN_BEFORE_MS,
    closeAt: start + CHECKIN_CLOSE_AFTER_MS,
  };
};

export type CheckinWindowState = "before" | "open" | "closed";

export const getCheckinWindowState = (
  event: Pick<GreenEvent, "start_time" | "end_time">,
  now: number = Date.now()
): CheckinWindowState => {
  const { openAt, closeAt } = getCheckinWindow(event);
  if (now < openAt) return "before";
  if (now > closeAt) return "closed";
  return "open";
};

/** Nhãn trạng thái hiển thị trên card (theo thứ tự ưu tiên nghiệp vụ). */
export const getEventStatusLabelKey = (
  event: Pick<GreenEvent, "status" | "start_time" | "end_time" | "is_ended" | "current_participants" | "max_participants">
): "STATUS_PENDING" | "STATUS_REJECTED" | "STATUS_CANCELLED" | "STATUS_ENDED" | "STATUS_FULL" | "STATUS_ONGOING" | "STATUS_APPROVED" => {
  if (event.status === "PENDING") return "STATUS_PENDING";
  if (event.status === "REJECTED") return "STATUS_REJECTED";
  if (event.status === "CANCELLED") return "STATUS_CANCELLED";
  if (isEventEnded(event)) return "STATUS_ENDED";
  if (new Date(event.start_time).getTime() <= Date.now()) return "STATUS_ONGOING";
  if (event.current_participants >= event.max_participants) return "STATUS_FULL";
  return "STATUS_APPROVED";
};

/** Chuyển hướng relative URL của backend thành URL tuyệt đối để hiển thị ảnh. */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const base = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};
