import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ApiError } from '../services/apiClient';
import styles from './AuthPages.module.css';

/** Q-B9: the policy is 12 characters minimum, enforced server-side and mirrored here. */
const MIN_PASSWORD_LENGTH = 12;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setError('This reset link is missing its token. Request a new one.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'That link has expired. Request a new one.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>Choose a new password</h1>
          <p className={styles.tagline}>Generation B</p>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {success ? (
          <>
            <div className={styles.success}>
              Password updated. Taking you to the sign-in page…
            </div>
            <div className={styles.backRow}>
              <Link to="/login" className={styles.inlineLink}>
                Go to sign in →
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters. A memorable passphrase works well.`}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
            <div className={styles.backRow}>
              <Link to="/login" className={styles.inlineLink}>
                ← Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
