import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import styles from './AuthPages.module.css';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await forgotPassword(email);
    } catch {
      // The backend answers identically whether or not the address exists, so the UI does too.
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>Reset your password</h1>
          <p className={styles.tagline}>Generation B</p>
        </div>

        {submitted ? (
          <>
            <div className={styles.success}>
              If that email is registered, we have sent a reset link. It expires in 30 minutes.
            </div>
            <div className={styles.backRow}>
              <Link to="/login" className={styles.inlineLink}>
                ← Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Registered email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@btheagency.com"
              autoComplete="email"
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
            <div className={styles.backRow}>
              <Link to="/login" className={styles.inlineLink}>
                ← Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
