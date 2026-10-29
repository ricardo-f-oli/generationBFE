import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../components/common/Toast';
import { DiscoveryPage, formatFollowers, toSearchParams } from './DiscoveryPage';
import type { DiscoverySearchResult } from '../../types';

/**
 * Discovery spends a CreatorDB credit per search, so the rules worth guarding are: nothing is
 * searched until the button is pressed, empty filters are not sent, and a creator already on the
 * database is linked rather than offered as a duplicate.
 */

const fetchDiscoveryStatus = vi.fn();
const discoverCreators = vi.fn();
const createCreator = vi.fn();

vi.mock('../../services/creatorService', () => ({
  fetchDiscoveryStatus: () => fetchDiscoveryStatus(),
  discoverCreators: (params: unknown) => discoverCreators(params),
  createCreator: (input: unknown) => createCreator(input),
}));

const page = (overrides: Partial<DiscoverySearchResult> = {}): DiscoverySearchResult => ({
  results: [
    {
      platform: 'INSTAGRAM',
      handle: 'glowgirl',
      name: 'Glow Girl',
      followers: 48200,
      avatarUrl: null,
      profileUrl: 'https://www.instagram.com/glowgirl',
      existingCreatorId: null,
    },
    {
      platform: 'INSTAGRAM',
      handle: 'knownone',
      name: 'Known One',
      followers: 30100,
      avatarUrl: null,
      profileUrl: 'https://www.instagram.com/knownone',
      existingCreatorId: 'c-known',
    },
  ],
  totalResults: 2,
  hasNextPage: false,
  nextOffset: null,
  creditsAvailable: 9987,
  ...overrides,
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <MemoryRouter>
          <DiscoveryPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );

describe('toSearchParams', () => {
  it('leaves empty filters out and parses formatted numbers', () => {
    expect(
      toSearchParams({
        platform: 'TIKTOK',
        keywords: '  ',
        country: ' gb ',
        minFollowers: '10,000',
        maxFollowers: '',
      }),
    ).toEqual({
      platform: 'TIKTOK',
      keywords: undefined,
      country: 'GB',
      minFollowers: 10000,
      maxFollowers: undefined,
    });
  });

  it('ignores zero and nonsense follower counts', () => {
    const params = toSearchParams({
      platform: 'INSTAGRAM', keywords: '', country: '', minFollowers: '0', maxFollowers: 'lots',
    });
    expect(params.minFollowers).toBeUndefined();
    expect(params.maxFollowers).toBeUndefined();
  });
});

describe('formatFollowers', () => {
  it('formats counts and marks unknowns', () => {
    expect(formatFollowers(48200)).toBe('48,200');
    expect(formatFollowers(null)).toBe('—');
  });
});

describe('DiscoveryPage', () => {
  beforeEach(() => {
    fetchDiscoveryStatus.mockReset().mockResolvedValue({ available: true, creditsAvailable: 9988 });
    discoverCreators.mockReset().mockResolvedValue(page());
    createCreator.mockReset().mockResolvedValue({ id: 'c-new' });
  });

  it('explains what to set when CreatorDB is not configured', async () => {
    fetchDiscoveryStatus.mockResolvedValue({ available: false, creditsAvailable: null });
    renderPage();
    expect(await screen.findByText(/discovery is not configured/i)).toBeInTheDocument();
    expect(screen.getByText(/CREATORDB_API_KEY/)).toBeInTheDocument();
    expect(discoverCreators).not.toHaveBeenCalled();
  });

  it('does not search until asked, then sends the filters', async () => {
    renderPage();
    await screen.findByRole('form', { name: /discovery search/i });
    expect(discoverCreators).not.toHaveBeenCalled();
    expect(screen.getByText(/9,988 CreatorDB credits left/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/hashtags or keywords/i), 'skincare spf');
    await userEvent.type(screen.getByLabelText(/min followers/i), '10000');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => expect(discoverCreators).toHaveBeenCalledTimes(1));
    expect(discoverCreators).toHaveBeenCalledWith({
      platform: 'INSTAGRAM',
      keywords: 'skincare spf',
      country: 'GB',
      minFollowers: 10000,
      maxFollowers: undefined,
    });
    expect(await screen.findByText('Glow Girl')).toBeInTheDocument();
    expect(screen.getByText('48,200')).toBeInTheDocument();
    expect(screen.getByText(/9,987 CreatorDB credits left/)).toBeInTheDocument();
  });

  it('links creators already on the database instead of offering a duplicate', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^search$/i }));

    const knownRow = (await screen.findByText('Known One')).closest('tr')!;
    expect(within(knownRow).getByRole('link', { name: /on database/i })).toHaveAttribute('href', '/creators/c-known');
    expect(within(knownRow).queryByRole('button', { name: /add to database/i })).not.toBeInTheDocument();
  });

  it('adds a creator with their handle, platform and follower count', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^search$/i }));
    const row = (await screen.findByText('Glow Girl')).closest('tr')!;

    await userEvent.click(within(row).getByRole('button', { name: /add to database/i }));

    await waitFor(() =>
      expect(createCreator).toHaveBeenCalledWith({
        name: 'Glow Girl',
        handle: 'glowgirl',
        primaryPlatform: 'INSTAGRAM',
        tiktokHandle: undefined,
        youtubeHandle: undefined,
        followersCount: 48200,
      }),
    );
    expect(await within(row).findByRole('link', { name: /on database/i })).toHaveAttribute('href', '/creators/c-new');
  });

  it('a TikTok creator is added with the handle in the TikTok column too', async () => {
    discoverCreators.mockResolvedValue(
      page({
        results: [{
          platform: 'TIKTOK', handle: 'fitcheck', name: 'Fit', followers: 1000,
          avatarUrl: null, profileUrl: 'https://www.tiktok.com/@fitcheck', existingCreatorId: null,
        }],
      }),
    );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^search$/i }));
    await userEvent.click(await screen.findByRole('button', { name: /add to database/i }));

    await waitFor(() =>
      expect(createCreator).toHaveBeenCalledWith(expect.objectContaining({ primaryPlatform: 'TIKTOK', tiktokHandle: 'fitcheck' })),
    );
  });

  it('loads the next page on request and appends it', async () => {
    discoverCreators
      .mockResolvedValueOnce(page({ hasNextPage: true, nextOffset: 25, totalResults: 3 }))
      .mockResolvedValueOnce(
        page({
          results: [{
            platform: 'INSTAGRAM', handle: 'third', name: 'Third', followers: 20000,
            avatarUrl: null, profileUrl: 'https://www.instagram.com/third', existingCreatorId: null,
          }],
          totalResults: 3,
        }),
      );
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^search$/i }));
    await userEvent.click(await screen.findByRole('button', { name: /load more/i }));

    expect(await screen.findByText('Third')).toBeInTheDocument();
    expect(screen.getByText('Glow Girl')).toBeInTheDocument();
    expect(discoverCreators).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 }));
  });

  it('says so when nothing matches', async () => {
    discoverCreators.mockResolvedValue(page({ results: [], totalResults: 0 }));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^search$/i }));
    expect(await screen.findByText(/no creators match/i)).toBeInTheDocument();
  });
});
