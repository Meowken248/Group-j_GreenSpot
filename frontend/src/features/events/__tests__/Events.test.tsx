import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventsList } from "../components/EventsList";
import { CreateEventModal } from "../components/CreateEventModal";
import { EventDetailModal } from "../components/EventDetailModal";
import { EventCheckinModal } from "../components/EventCheckinModal";
import { eventService } from "../services/eventService";
import type { GreenEvent, CheckinResponse } from "../types/event.types";

vi.mock("../services/eventService");

// Mock Leaflet để tránh lỗi DOM trong môi trường Vitest / jsdom
vi.mock("leaflet", () => {
  const markerObj = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    on: vi.fn(),
    setLatLng: vi.fn(),
    getLatLng: vi.fn(() => ({ lat: 10.7735, lng: 106.7068 })),
  };
  const circleObj = {
    addTo: vi.fn().mockReturnThis(),
    setLatLng: vi.fn(),
  };
  const polylineObj = {
    addTo: vi.fn().mockReturnThis(),
    setLatLngs: vi.fn(),
  };

  const mapObj = {
    setView: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
  };

  return {
    default: {
      map: vi.fn(() => mapObj),
      tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
      marker: vi.fn(() => markerObj),
      circle: vi.fn(() => circleObj),
      circleMarker: vi.fn(() => markerObj),
      polyline: vi.fn(() => polylineObj),
    },
  };
});

const mockSampleEvent: GreenEvent = {
  event_id: "ev-123456",
  title: "Chủ Nhật Xanh Ra Quân Làm Sạch Bến Bạch Đằng",
  description: "Chiến dịch thu gom rác thải nhựa và làm sạch bờ kè công viên.",
  cover_image_url: "https://example.com/cover.jpg",
  start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
  end_time: new Date(Date.now() + 86400000 * 2 + 10800000).toISOString(),
  latitude: 10.7735,
  longitude: 106.7068,
  address: "Công viên Bến Bạch Đằng, Tôn Đức Thắng, Quận 1",
  district: "Quận 1",
  max_participants: 100,
  current_participants: 25,
  interested_count: 42,
  creator_id: "user-creator-1",
  creator_name: "Huỳnh Anh Tú",
  creator_avatar: null,
  status: "APPROVED",
  reject_reason: null,
  checkin_radius_meters: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_joined: false,
  is_interested: false,
  is_checked_in: false,
  participants_preview: [
    {
      user_id: "user-creator-1",
      full_name: "Huỳnh Anh Tú",
      avatar_url: null,
      joined_at: new Date().toISOString(),
      is_creator: true,
    },
  ],
};

describe("Feature 21: Sự kiện và chiến dịch Chủ Nhật Xanh (Frontend Test Suite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Màn 1/4: Render danh sách sự kiện và bộ lọc
  it("TC-01: Hiển thị danh sách sự kiện Chủ Nhật Xanh và các bộ lọc", async () => {
    vi.mocked(eventService.getEvents).mockResolvedValue({
      items: [mockSampleEvent],
      total: 1,
      page: 1,
      page_size: 12,
    });

    render(
      <EventsList
        isLoggedIn={true}
        currentUserId="user-demo-1"
        onOpenLogin={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: /Sự kiện Chủ Nhật Xanh/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("Chủ Nhật Xanh Ra Quân Làm Sạch Bến Bạch Đằng")
      ).toBeInTheDocument();
      expect(screen.getByText(/25\/100 người/i)).toBeInTheDocument();
      expect(screen.getByText(/42 quan tâm/i)).toBeInTheDocument();
    });
  });

  // 2. Màn 2/4: Form Tạo sự kiện mới
  it("TC-02: Mở modal Tạo sự kiện mới và kiểm tra các trường bắt buộc", async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <CreateEventModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(
      screen.getByText(/Tổ chức Sự kiện Chủ Nhật Xanh mới/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("input-event-title")).toBeInTheDocument();
    expect(screen.getByTestId("input-event-start-time")).toBeInTheDocument();
    expect(screen.getByTestId("select-event-district")).toBeInTheDocument();
    expect(screen.getByTestId("input-event-max-participants")).toBeInTheDocument();
    expect(screen.getByTestId("textarea-event-desc")).toBeInTheDocument();
  });

  // 3. Màn 3/4: Chi tiết sự kiện & Tương tác Quan tâm / Tham gia
  it("TC-03: Chi tiết sự kiện và bấm nút Quan tâm", async () => {
    const handleUpdate = vi.fn();
    vi.mocked(eventService.toggleInterest).mockResolvedValue({
      is_interested: true,
      interested_count: 43,
      message: "Đã lưu vào danh sách quan tâm",
    });

    render(
      <EventDetailModal
        event={mockSampleEvent}
        isOpen={true}
        onClose={vi.fn()}
        isLoggedIn={true}
        currentUserId="user-demo-1"
        onOpenLogin={vi.fn()}
        onEventUpdated={handleUpdate}
      />
    );

    expect(
      screen.getByText(/Chi tiết Sự kiện Chủ Nhật Xanh/i)
    ).toBeInTheDocument();

    const btnInterest = screen.getByTestId("btn-toggle-interest");
    fireEvent.click(btnInterest);

    await waitFor(() => {
      expect(eventService.toggleInterest).toHaveBeenCalledWith(
        mockSampleEvent.event_id
      );
      expect(handleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_interested: true, interested_count: 43 })
      );
    });
  });

  // 4. Màn 3/4: Bấm nút Đăng ký tham gia
  it("TC-04: Bấm nút Đăng ký tham gia sự kiện", async () => {
    const handleUpdate = vi.fn();
    vi.mocked(eventService.toggleJoin).mockResolvedValue({
      is_joined: true,
      current_participants: 26,
      message: "Đăng ký tham gia thành công!",
    });

    render(
      <EventDetailModal
        event={mockSampleEvent}
        isOpen={true}
        onClose={vi.fn()}
        isLoggedIn={true}
        currentUserId="user-demo-1"
        onOpenLogin={vi.fn()}
        onEventUpdated={handleUpdate}
      />
    );

    const btnJoin = screen.getByTestId("btn-toggle-join");
    fireEvent.click(btnJoin);

    await waitFor(() => {
      expect(eventService.toggleJoin).toHaveBeenCalledWith(
        mockSampleEvent.event_id
      );
      expect(handleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_joined: true, current_participants: 26 })
      );
    });
  });

  // 5. Màn 4/4: Check-in GPS tại hiện trường và nhận +50 GP
  it("TC-05: Modal Check-in GPS hiển thị thông tin và popup thành công +50 GP", async () => {
    const handleCheckinSuccess = vi.fn();
    const eventJoined: GreenEvent = {
      ...mockSampleEvent,
      is_joined: true,
    };

    const mockCheckinRes: CheckinResponse = {
      success: true,
      message: "Check-in thành công! Bạn đã nhận được +50 Điểm Xanh.",
      event_id: eventJoined.event_id,
      checkin_time: new Date().toISOString(),
      distance_meters: 25.4,
      accuracy_meters: 10.0,
      points_awarded: 50,
      total_green_points: 150,
    };

    vi.mocked(eventService.checkinEvent).mockResolvedValue(mockCheckinRes);

    render(
      <EventCheckinModal
        event={eventJoined}
        isOpen={true}
        onClose={vi.fn()}
        onCheckinSuccess={handleCheckinSuccess}
      />
    );

    expect(screen.getByText(/Check-in GPS tại hiện trường/i)).toBeInTheDocument();
    expect(screen.getByTestId("checkin-map")).toBeInTheDocument();
  });
});
