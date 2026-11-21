import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PenaltyLookupContainer } from '../PenaltyLookupContainer';

describe('Feature STT 11: Tra cứu quy định xử phạt (Mock/Stub)', () => {
  it('renders stub container without crashing', () => {
    render(<PenaltyLookupContainer />);
    expect(screen.getByTestId('penalty-lookup-container')).toBeInTheDocument();
    expect(screen.getByText(/STT 11: Tra cứu quy định xử phạt/i)).toBeInTheDocument();
  });
});
