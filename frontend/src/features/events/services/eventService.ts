import api from "../../../api/client";
import type {
  GreenEvent,
  EventListResponse,
  CreateEventPayload,
  UpdateEventPayload,
  EventReviewPayload,
  EventCoverUploadResponse,
  CheckinPayload,
  CheckinResponse,
  ParticipantItem,
} from "../types/event.types";

const API_BASE = "/api/v1/events";

export interface EventQueryParams {
  district?: string;
  time_filter?: string;
  search?: string;
  my_events?: boolean;
  status?: string;
  page?: number;
  page_size?: number;
}

export const eventService = {
  async getEvents(params: EventQueryParams): Promise<EventListResponse> {
    // Dùng axios client dùng chung để có sẵn interceptor gắn token & silent refresh
    const res = await api.get<EventListResponse>(API_BASE, { params });
    return res.data;
  },

  async getEventDetail(eventId: string): Promise<GreenEvent> {
    const res = await api.get<GreenEvent>(`${API_BASE}/${eventId}`);
    return res.data;
  },

  async getParticipants(eventId: string): Promise<ParticipantItem[]> {
    const res = await api.get<ParticipantItem[]>(`${API_BASE}/${eventId}/participants`);
    return res.data;
  },

  async createEvent(payload: CreateEventPayload): Promise<GreenEvent> {
    const res = await api.post<GreenEvent>(API_BASE, payload);
    return res.data;
  },

  async updateEvent(eventId: string, payload: UpdateEventPayload): Promise<GreenEvent> {
    const res = await api.patch<GreenEvent>(`${API_BASE}/${eventId}`, payload);
    return res.data;
  },

  async uploadCover(file: File): Promise<EventCoverUploadResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<EventCoverUploadResponse>(`${API_BASE}/cover`, form);
    return res.data;
  },

  async reviewEvent(eventId: string, payload: EventReviewPayload): Promise<GreenEvent> {
    const res = await api.patch<GreenEvent>(`${API_BASE}/${eventId}/review`, payload);
    return res.data;
  },

  async toggleInterest(
    eventId: string
  ): Promise<{ is_interested: boolean; interested_count: number; message: string }> {
    const res = await api.post<{
      is_interested: boolean;
      interested_count: number;
      message: string;
    }>(`${API_BASE}/${eventId}/interest`);
    return res.data;
  },

  async toggleJoin(
    eventId: string
  ): Promise<{ is_joined: boolean; current_participants: number; message: string }> {
    const res = await api.post<{
      is_joined: boolean;
      current_participants: number;
      message: string;
    }>(`${API_BASE}/${eventId}/join`);
    return res.data;
  },

  async checkinEvent(eventId: string, payload: CheckinPayload): Promise<CheckinResponse> {
    const res = await api.post<CheckinResponse>(`${API_BASE}/${eventId}/checkin`, payload);
    return res.data;
  },

  async cancelEvent(
    eventId: string
  ): Promise<{ success: boolean; message: string; notified_count: number }> {
    const res = await api.patch<{ success: boolean; message: string; notified_count: number }>(
      `${API_BASE}/${eventId}/cancel`
    );
    return res.data;
  },
};
