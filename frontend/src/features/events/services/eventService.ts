import axios from "axios";
import { AUTH_STORAGE_KEYS } from "../../auth/types/auth.types";
import type {
  GreenEvent,
  EventListResponse,
  CreateEventPayload,
  CheckinPayload,
  CheckinResponse,
  ParticipantItem,
} from "../types/event.types";

const API_BASE = "http://127.0.0.1:8000/api/v1/events";

const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const eventService = {
  async getEvents(params: {
    district?: string;
    time_filter?: string;
    search?: string;
    my_events?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<EventListResponse> {
    const res = await axios.get<EventListResponse>(API_BASE, {
      params,
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  async getEventDetail(eventId: string): Promise<GreenEvent> {
    const res = await axios.get<GreenEvent>(`${API_BASE}/${eventId}`, {
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  async getParticipants(eventId: string): Promise<ParticipantItem[]> {
    const res = await axios.get<ParticipantItem[]>(
      `${API_BASE}/${eventId}/participants`,
      {
        headers: getAuthHeaders(),
      }
    );
    return res.data;
  },

  async createEvent(payload: CreateEventPayload): Promise<GreenEvent> {
    const res = await axios.post<GreenEvent>(API_BASE, payload, {
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  async toggleInterest(
    eventId: string
  ): Promise<{ is_interested: boolean; interested_count: number; message: string }> {
    const res = await axios.post<{
      is_interested: boolean;
      interested_count: number;
      message: string;
    }>(`${API_BASE}/${eventId}/interest`, {}, { headers: getAuthHeaders() });
    return res.data;
  },

  async toggleJoin(
    eventId: string
  ): Promise<{ is_joined: boolean; current_participants: number; message: string }> {
    const res = await axios.post<{
      is_joined: boolean;
      current_participants: number;
      message: string;
    }>(`${API_BASE}/${eventId}/join`, {}, { headers: getAuthHeaders() });
    return res.data;
  },

  async checkinEvent(
    eventId: string,
    payload: CheckinPayload
  ): Promise<CheckinResponse> {
    const res = await axios.post<CheckinResponse>(
      `${API_BASE}/${eventId}/checkin`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return res.data;
  },

  async cancelEvent(
    eventId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await axios.patch<{ success: boolean; message: string }>(
      `${API_BASE}/${eventId}/cancel`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
    return res.data;
  },
};
