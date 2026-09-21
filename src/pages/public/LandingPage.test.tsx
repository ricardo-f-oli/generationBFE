import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import type { User } from '../../types';

/**
 * The rule this file exists to protect: `/` offers exactly two ways in, and the creator one
 * goes to `/register`.
 *
 * This is the page the agency puts on a poster and in an Instagram bio. A refactor that renames
 * the route, points the CTA at `/join` (the waitlist, which is a different and much weaker
 * thing to ask a creator for), or hides the page behind the session check would pass a type
 * check and quietly turn off creator acquisition. So both destinations are asserted.
 */

const authState: { user: User | null; isLoading: boolean } = { user: null, isLoading: false };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

const renderLanding = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );

describe('LandingPage', () => {
  it('sends creators to the registration form, not the waitlist', () => {
    authState.user = null;
    authState.isLoading = false;
    renderLanding();

    expect(screen.getByRole('link', { name: /creator registration/i })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('offers the team a login', () => {
    authState.user = null;
    authState.isLoading = false;
    renderLanding();

    // Two of them — the header link and the CTA card — and both must reach the login.
    const links = screen.getAllByRole('link', { name: /team login/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/login'));
  });

  it('is visible without a session', () => {
    authState.user = null;
    authState.isLoading = false;
    renderLanding();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
