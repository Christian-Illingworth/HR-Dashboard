// T122 (FR-005, US2): someone outside the access group sees who to contact, and nothing else.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import type { DashboardClient } from '../src/data/DashboardClient';

const client = (kind: 'forbidden' | 'unauthenticated'): DashboardClient => ({
  getDashboard: vi.fn(async () => ({ kind })),
  requestRefresh: vi.fn(async () => ({ kind: 'forbidden' as const })),
});

describe('no access', () => {
  it('says the user has no access and who to contact, with no sections and no more requests', async () => {
    const c = client('forbidden');
    render(<App client={c} noAccessContact="Ask the HR team (hr@example.test) for access." />);
    expect(await screen.findByRole('heading', { name: "You don't have access to the HR Dashboard" })).toBeInTheDocument();
    expect(screen.getByText(/limited to HR and Senior Leadership/)).toBeInTheDocument();
    expect(screen.getByText('Ask the HR team (hr@example.test) for access.')).toBeInTheDocument();
    // The only region is the no-access card itself: no dashboard section is rendered.
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'))).toEqual(['hrd-no-access-title']);
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
    expect(c.getDashboard).toHaveBeenCalledTimes(1);
  });

  it('explains a sign-in problem differently', async () => {
    render(<App client={client('unauthenticated')} noAccessContact="Ask the HR team." />);
    expect(await screen.findByRole('heading', { name: "We couldn't confirm who you are" })).toBeInTheDocument();
    expect(screen.getByText(/Refresh the page/)).toBeInTheDocument();
  });

  it('still shows a sensible message when no contact is configured', async () => {
    render(<App client={client('forbidden')} noAccessContact="" />);
    expect(await screen.findByText(/contact your HR team/)).toBeInTheDocument();
  });
});
