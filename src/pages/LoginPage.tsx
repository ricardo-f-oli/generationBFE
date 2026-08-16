import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ApiError } from '../services/apiClient';
import styles from './AuthPages.module.css';

/** Q-F12: the product language is English. */
export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier || !password) {
      setError('Enter your email or username and your password.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      // Q-B10: the backend deliberately returns the same message for a wrong password and a
      // disabled account, and a distinct one for lockout.
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>generation b.</h1>
          <p className={styles.tagline}>Creator &amp; campaign management</p>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email or username"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@btheagency.com"
            autoComplete="username"
            required
          />

          <div>
            <div className={styles.passwordLabelRow}>
              <span className={styles.inlineLabel}>Password</span>
              <Link to="/forgot-password" className={styles.inlineLink}>
                Forgot password?
              </Link>
            </div>
            <div className={styles.passwordWrap}>
              <input
                className={styles.passwordInput}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                aria-label="Password"
                required
              />
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className={styles.footnote}>
          Demo login: <strong>admin@generationb.dev</strong> / <strong>Password123!</strong>
        </p>
      </div>
    </div>
  );
};
