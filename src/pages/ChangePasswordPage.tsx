import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';
import { MIN_PASSWORD_LENGTH, PasswordMeter } from '../components/common/PasswordMeter';
import { ApiError } from '../services/apiClient';
import styles from './AuthPages.module.css';

/**
 * Two jobs in one screen.
 *
 * The first is the handover wall: accounts seeded with a shared password are flagged
 * `mustChangePassword`, and the API refuses everything except this call until it is cleared.
 * That refusal is server-side, so this page is the way out of it rather than a formality.
 *
 * The second is the ordinary "change my password" screen, reachable any time. Keeping them the
 * same page means the forced path is one people have already used, not a special case that only
 * runs once and is therefore never tested.
 */
export const ChangePasswordPage: React.FC = () => {
  const { user, isLoading, changePassword } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <Spinner label="Checking your session" fullPage />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const required = user.mustChangePassword === true;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword) {
      setError('Fill in your current password and the new one.');
      return;
    }
    // Checked here as well as on the server: a mistyped confirmation is the one error worth
    // catching before it costs a round trip and revokes the session's tokens.
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current one.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await changePassword(currentPassword, newPassword);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not change your password. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>generation b.</h1>
          <p className={styles.tagline}>
            {required ? 'Choose your own password' : 'Change your password'}
          </p>
        </div>

        {required && (
          <div className={styles.success} role="status">
            This account is still on the password it was set up with. Choose your own to
            continue — nothing else is available until you do.
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Current password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters. A memorable passphrase is ideal.`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordMeter value={newPassword} />
          <Input
            label="Confirm new password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <label className={styles.inlineLabel}>
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />{' '}
            Show passwords
          </label>

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save new password'}
          </Button>
        </form>

        {!required && (
          <div className={styles.backRow}>
            <button
              type="button"
              className={styles.inlineLink}
              onClick={() => navigate('/dashboard')}
            >
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
