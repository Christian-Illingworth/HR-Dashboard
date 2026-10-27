import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { SampleDashboardClient } from '../src/data/SampleDashboardClient';
import type { DashboardClient } from '../src/data/DashboardClient';

const never: DashboardClient = {
  getDashboard: () => new Promise(() => undefined),
  requestRefresh: () => new Promise(() => undefined),
};
const failing: DashboardClient = {
  getDashboard: async () => ({ kind: 'unavailable' }),
  requestRefresh: async () => ({ kind: 'unavailable' }),
};

describe('App shell', () => {
  it('shows a loading state in every section, not blanks or zeros', () => {
    render(<App client={never} noAccessContact="" />);
    expect(screen.getAllByText('Loading')).toHaveLength(6);
  });

  it('labels mock data on the view and shows every section', async () => {
    render(<App client={new SampleDashboardClient()} noAccessContact="" />);
    expect(await screen.findByText('Mock data.')).toBeInTheDocument();
    for (const title of ['Headline numbers', 'Annual leave', 'Sickness', 'Absence by type', 'Staff attrition', "Who's off in Sales"]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('shows an error with a retry when the data can’t be loaded, in every section', async () => {
    render(<App client={failing} noAccessContact="" />);
    await waitFor(() => expect(screen.getByText(/couldn.t load its data/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getAllByText('This section could not be loaded.')).toHaveLength(6);
  });
});
