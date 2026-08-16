import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { unsubscribe } from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import styles from './PublicPages.module.css';

/**
 * Requirement #21 / Q-I2: the unsubscribe link in every outreach email lands here.
 *
 * This page did not exist, and the opt-out endpoint required a login — so no creator could
 * ever action an unsubscribe. That was the most serious compliance gap in the review.
 */
export const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => unsubscribe(email, reason || undefined),
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.'),
  });

  return (
    <div className={styles.landing}>
      <div className={styles.landingInner}>
        <header className={styles.landingHeader}>
          <span className={styles.mark}>b.</span>
        </header>

        {mutation.isSuccess ? (
          <div className={styles.confirmation}>
            <h1 className={styles.display}>you&rsquo;re unsubscribed.</h1>
            <div className={styles.rule} />
            <p className={styles.lede} style={{ marginBottom: 0 }}>
              You have been removed from all future mailings, across every brand we work with.
              You will not hear from us again unless you get back in touch.
            </p>
          </div>
        ) : (
          <>
            <h1 className={styles.display}>unsubscribe.</h1>
            <p className={styles.lede}>
              Confirm your email address and we&rsquo;ll remove you from every mailing list we run —
              not just this one campaign.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                mutation.mutate();
              }}
            >
              <Input
                label="Your email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Not the right fit for me"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!email || mutation.isPending}
              >
                {mutation.isPending ? 'Processing…' : 'Unsubscribe me'}
              </Button>
              {searchParams.get('token') && (
                <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                  This request is linked to the email you received.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};
