import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import EcoMap from '../EcoMap';
import { describe, it, expect, vi } from 'vitest';

// Mock react-map-gl/maplibre to prevent WebGL errors in JSDOM
vi.mock('react-map-gl/maplibre', () => ({
  default: ({ children }: any) => <div data-testid="mock-map">{children}</div>,
  NavigationControl: () => <div data-testid="nav-control" />,
  FullscreenControl: () => <div data-testid="fs-control" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Source: ({ children }: any) => <div data-testid="source">{children}</div>,
  Layer: () => <div data-testid="layer" />,
}));

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('EcoMap', () => {
  it('renders without crashing', () => {
    render(<EcoMap />);
    // Check if the search input renders
    const searchInput = screen.getByPlaceholderText(/Tìm số nhà, hẻm, quán ăn/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('renders the mocked map wrapper', () => {
    render(<EcoMap />);
    const mapWrapper = screen.getByTestId('mock-map');
    expect(mapWrapper).toBeInTheDocument();
  });
});
