import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../DashboardPage';

function renderDashboardPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Outlet context={{ activeBrand: 'Test Brand' }} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  it('renders the loading state before data resolves', () => {
    renderDashboardPage();
    expect(screen.getByText(/loading dashboard overview/i)).toBeInTheDocument();
  });

  it('renders the dashboard heading and KPI data once loaded', async () => {
    renderDashboardPage();
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
    expect(await screen.findByText(/Test Brand/i)).toBeInTheDocument();
    expect(await screen.findByText('Active Campaigns')).toBeInTheDocument();
  });

  // TODO: add unit tests for navigating to a pending action's target screen on button click.
  // TODO: add unit tests for the activity feed rendering the correct number of entries.
  // TODO: add unit tests for the KPI grid rendering one card per tint variant.
  // TODO: add unit tests for query error/retry behavior once a real dashboard service exists.
});
