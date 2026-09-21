import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChangePasswordPage } from './ChangePasswordPage';
import type { User } from '../types';

/**
 * The rule this file exists to protect: the forced path cannot be satisfied by typing the
 * seeded password back in.
 *
 * The server rejects that too, but catching it here saves a round trip that would revoke the
 * session's tokens on the way to a failure. The mismatch check is the same story — both are
 * the errors people actually make on this screen.
 */

const changePassword = vi.fn();
const authState: { user: User | null; isLoading: boolean } = {
  user: { id: 'u1', email: 'admin@generationb.dev', name: 'Admin', role: 'ADMIN', brandId: 'b1' },
  isLoading: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ ...authState, changePassword }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ChangePasswordPage />
    </MemoryRouter>,
  );

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    changePassword.mockReset();
    changePassword.mockResolvedValue(undefined);
    authState.user = {
      id: 'u1', email: 'admin@generationb.dev', name: 'Admin', role: 'ADMIN', brandId: 'b1',
    };
  });

  it('explains why it is being shown when the change is forced', () => {
    authState.user = { ...authState.user!, mustChangePassword: true };
    renderPage();

    expect(screen.getByText(/still on the password it was set up with/i)).toBeInTheDocument();
    // No escape hatch while it is required.
    expect(screen.queryByRole('button', { name: /back to dashboard/i })).not.toBeInTheDocument();
  });

  it('refuses to submit the current password as the new one', async () => {
    authState.user = { ...authState.user!, mustChangePassword: true };
    renderPage();

    await userEvent.type(screen.getByLabelText(/current password/i), 'Password123!');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/must be different/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('refuses a mismatched confirmation', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/current password/i), 'Password123!');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'correct-horse-battery');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'correct-horse-bettery');
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('submits a valid change', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/current password/i), 'Password123!');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'correct-horse-battery');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'correct-horse-battery');
    await userEvent.click(screen.getByRole('button', { name: /save new password/i }));

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith('Password123!', 'correct-horse-battery'),
    );
  });
});
