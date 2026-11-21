import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PenaltyReportsDashboard } from '../components/PenaltyReportsDashboard';

describe('Feature STT 11: Thống kê biên bản vi phạm (Mock/Stub)', () => {
  it('renders stub dashboard without crashing', () => {
    render(<PenaltyReportsDashboard />);
    expect(screen.getByTestId('penalty-reports-dashboard')).toBeInTheDocument();
  });
});
