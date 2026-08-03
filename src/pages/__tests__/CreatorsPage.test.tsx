import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatorsPage } from '../CreatorsPage';

function renderCreatorsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/creators']}>
        <CreatorsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CreatorsPage', () => {
  it('renders the loading state before data resolves', () => {
    renderCreatorsPage();
    expect(screen.getByText(/loading creator database/i)).toBeInTheDocument();
  });

  it('renders the creator database heading and a creator once loaded', async () => {
    renderCreatorsPage();
    expect(await screen.findByText('creator database')).toBeInTheDocument();
    expect(await screen.findByText('@sophiabeauty')).toBeInTheDocument();
  });

  // TODO: add unit tests for search filtering narrowing the creator grid by handle/location/niche/tags.
  // TODO: add unit tests for toggling "Add to shortlist" updating the shortlist count link.
  // TODO: add unit tests for dismissing an active filter chip removing it from the list.
  // TODO: add unit tests for platform badges rendering only for platforms the creator has.
});
