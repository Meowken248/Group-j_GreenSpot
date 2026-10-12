import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Screen1Input } from '../components/Screen1Input';
import { Screen2Compare } from '../components/Screen2Compare';
import { Screen3Directions } from '../components/Screen3Directions';
import { Screen4EmergencyModal } from '../components/Screen4EmergencyModal';
import { DualRouteResponse } from '../types/navigation.types';

describe('Flood-Aware Navigation Routing (STT 41) UI Tests', () => {
  it('Màn 1/4: Hiển thị đầy đủ ô điểm đi, điểm đến, nút Vị trí hiện tại, và 4 loại phương tiện', () => {
    render(
      <Screen1Input
        origin={{ name: 'Chợ Bến Thành', latitude: 10.7725, longitude: 106.698 }}
        destination={{ name: 'Landmark 81', latitude: 10.7951, longitude: 106.7218 }}
        selectedVehicle="MOTORBIKE"
        onOriginChange={vi.fn()}
        onDestinationChange={vi.fn()}
        onVehicleChange={vi.fn()}
        validationError={null}
        gpsWarning={null}
        onClearErrors={vi.fn()}
        onGpsRequested={vi.fn()}
      />
    );

    expect(screen.getByText(/LỘ TRÌNH/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập địa chỉ xuất phát/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập địa chỉ đích cần đến/i)).toBeInTheDocument();
    expect(screen.getByText(/Vị trí hiện tại/i)).toBeInTheDocument();
    expect(screen.getByText('Xe máy')).toBeInTheDocument();
    expect(screen.getByText('Ô tô')).toBeInTheDocument();
    expect(screen.getByText('Xe đạp')).toBeInTheDocument();
    expect(screen.getByText('Xe ép rác chuyên dụng')).toBeInTheDocument();
  });

  it('Màn 1/4 Validation: Hiển thị thông báo khi để trống hoặc trùng nhau', () => {
    const { rerender } = render(
      <Screen1Input
        origin={{ name: '', latitude: 0, longitude: 0 }}
        destination={{ name: '', latitude: 0, longitude: 0 }}
        selectedVehicle="MOTORBIKE"
        onOriginChange={vi.fn()}
        onDestinationChange={vi.fn()}
        onVehicleChange={vi.fn()}
        validationError="Vui lòng nhập đầy đủ điểm đi và điểm đến"
        gpsWarning="Không thể lấy vị trí. Hãy bật định vị thiết bị"
        onClearErrors={vi.fn()}
        onGpsRequested={vi.fn()}
      />
    );

    expect(screen.getByText(/Vui lòng nhập đầy đủ điểm đi và điểm đến/i)).toBeInTheDocument();
    expect(screen.getByText(/Không thể lấy vị trí. Hãy bật định vị thiết bị/i)).toBeInTheDocument();

    rerender(
      <Screen1Input
        origin={{ name: 'Điểm A', latitude: 10.1, longitude: 106.1 }}
        destination={{ name: 'Điểm A', latitude: 10.1, longitude: 106.1 }}
        selectedVehicle="MOTORBIKE"
        onOriginChange={vi.fn()}
        onDestinationChange={vi.fn()}
        onVehicleChange={vi.fn()}
        validationError="Điểm đi và điểm đến không được trùng nhau"
        gpsWarning={null}
        onClearErrors={vi.fn()}
        onGpsRequested={vi.fn()}
      />
    );

    expect(screen.getByText(/Điểm đi và điểm đến không được trùng nhau/i)).toBeInTheDocument();
  });

  it('Màn 2/4: So sánh trực quan giữa Tuyến nhanh nhất và Tuyến an toàn nhất', () => {
    const mockPlan: DualRouteResponse = {
      origin: { name: 'A', latitude: 10.7, longitude: 106.6 },
      destination: { name: 'B', latitude: 10.8, longitude: 106.7 },
      vehicle_type: 'MOTORBIKE',
      vehicle_threshold_cm: 25,
      fastest_route: {
        route_id: 'R1',
        route_type: 'FASTEST',
        duration_minutes: 25,
        distance_km: 7.2,
        duration_formatted: '25 phút | 7.2 km',
        hazard_count: 2,
        max_depth_cm: 35,
        status: 'AVOID',
        coordinates: [],
        turn_steps: [],
        hazards_on_route: [
          {
            hazard_id: 'H1',
            street_name: 'Nguyễn Hữu Cảnh',
            latitude: 10.79,
            longitude: 106.71,
            predicted_depth_cm: 35,
            water_level_display: 'Mực nước: 0.35m',
            severity_level: 'SEVERE',
          },
        ],
        avoided_hazards: [],
      },
      safest_route: {
        route_id: 'R2',
        route_type: 'SAFEST',
        duration_minutes: 32,
        distance_km: 8.8,
        duration_formatted: '32 phút | 8.8 km',
        hazard_count: 0,
        max_depth_cm: 0,
        status: 'CLEAR',
        coordinates: [],
        turn_steps: [],
        hazards_on_route: [],
        avoided_hazards: [
          {
            hazard_id: 'H1',
            street_name: 'Nguyễn Hữu Cảnh',
            latitude: 10.79,
            longitude: 106.71,
            predicted_depth_cm: 35,
            water_level_display: 'Mực nước: 0.35m',
            severity_level: 'SEVERE',
          },
        ],
      },
      all_clear: false,
      all_flooded: false,
    };

    render(
      <Screen2Compare
        planData={mockPlan}
        selectedRouteType="SAFEST"
        onSelectRouteType={vi.fn()}
        isLoadingTide={false}
        onBackToInput={vi.fn()}
      />
    );

    expect(screen.getByText(/TUYẾN NHANH NHẤT/i)).toBeInTheDocument();
    expect(screen.getByText('25 phút | 7.2 km')).toBeInTheDocument();
    expect(screen.getByText(/Số điểm ngập: 2/i)).toBeInTheDocument();

    expect(screen.getByText(/TUYẾN AN TOÀN NHẤT/i)).toBeInTheDocument();
    expect(screen.getByText('32 phút | 8.8 km')).toBeInTheDocument();
    expect(screen.getByText(/Số điểm ngập: 0/i)).toBeInTheDocument();
  });

  it('Màn 3/4: Chi tiết từng bước rẽ và nút thao tác', () => {
    const mockRoute = {
      route_id: 'R2',
      route_type: 'SAFEST' as const,
      duration_minutes: 32,
      distance_km: 8.8,
      duration_formatted: '32 phút | 8.8 km',
      hazard_count: 0,
      max_depth_cm: 0,
      status: 'CLEAR' as const,
      coordinates: [] as [number, number][],
      turn_steps: [
        {
          step_number: 1,
          instruction: 'Đi thẳng 1.5km trên đường Điện Biên Phủ',
          distance_meters: 1500,
          duration_seconds: 180,
          street_name: 'Điện Biên Phủ',
          maneuver: 'straight',
        },
        {
          step_number: 2,
          instruction: 'Rẽ phải vào đường Đinh Tiên Hoàng để tránh ngập tại Xô Viết Nghệ Tĩnh',
          distance_meters: 800,
          duration_seconds: 120,
          street_name: 'Đinh Tiên Hoàng',
          maneuver: 'turn-right',
          avoid_reason: 'Tránh ngập sâu',
        },
      ],
      hazards_on_route: [],
      avoided_hazards: [
        {
          hazard_id: 'H2',
          street_name: 'Xô Viết Nghệ Tĩnh',
          latitude: 10.8,
          longitude: 106.71,
          predicted_depth_cm: 30,
          water_level_display: '',
          severity_level: 'SEVERE' as const,
        },
      ],
    };

    render(
      <Screen3Directions
        routePlan={mockRoute}
        isNavigating={false}
        onStartNavigation={vi.fn()}
        onShareRoute={vi.fn()}
        onSimulateOffRoute={vi.fn()}
        onBackToCompare={vi.fn()}
      />
    );

    expect(screen.getByText(/Đi thẳng 1.5km trên đường Điện Biên Phủ/i)).toBeInTheDocument();
    expect(screen.getByText(/Rẽ phải vào đường Đinh Tiên Hoàng để tránh ngập/i)).toBeInTheDocument();
    expect(screen.getByText(/Bắt đầu đi/i)).toBeInTheDocument();
    expect(screen.getByText(/Chia sẻ tuyến/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Xô Viết Nghệ Tĩnh/i).length).toBeGreaterThanOrEqual(1);
  });

  it('Màn 4/4: Popup cảnh báo khẩn cấp có nhãn POPUP, tiêu đề đỏ và các nút', () => {
    const onReroute = vi.fn();
    const onContinue = vi.fn();

    render(
      <Screen4EmergencyModal
        alertData={{
          has_hazard_ahead: true,
          distance_ahead_meters: 300,
          alert_title: 'CẢNH BÁO NGẬP',
          alert_message: 'Phía trước 300m có điểm ngập sâu',
          water_level_display: 'Mực nước: 0.45m - Nguy cơ chết máy cao',
          voice_announcement: 'Cảnh báo ngập',
          suggested_reroute_available: true,
        }}
        onReroute={onReroute}
        onContinue={onContinue}
      />
    );

    expect(screen.getByText('POPUP')).toBeInTheDocument();
    expect(screen.getByText('CẢNH BÁO NGẬP')).toBeInTheDocument();
    expect(screen.getByText(/Phía trước 300m có điểm ngập sâu/i)).toBeInTheDocument();
    expect(screen.getByText(/Mực nước: 0.45m - Nguy cơ chết máy cao/i)).toBeInTheDocument();

    const changeBtn = screen.getByRole('button', { name: /Đổi tuyến/i });
    const contBtn = screen.getByRole('button', { name: /Tiếp tục/i });

    fireEvent.click(changeBtn);
    expect(onReroute).toHaveBeenCalledTimes(1);

    fireEvent.click(contBtn);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
