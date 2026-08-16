import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { joinWaitlist } from '../../services/marketingService';
import { ApiError } from '../../services/apiClient';
import styles from './PublicPages.module.css';

/**
 * Requirement #48: the branded waitlist landing page. This did not exist in any form —
 * no page, no route, no design in the prototype.
 */
export const WaitlistLandingPage: React.FC = () => {
  const [form, setForm] = useState({
    email: '',
    name: '',
    handle: '',
    platform: 'INSTAGRAM',
    niche: '',
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      joinWaitlist({
        email: form.email,
        name: form.name || undefined,
        handle: form.handle || undefined,
        platform: form.platform,
        niche: form.niche || undefined,
        consentGiven: consent,
        source: 'LANDING_PAGE',
      }),
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.'),
  });

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className={styles.landing}>
      <div className={styles.landingInner}>
        <header className={styles.landingHeader}>
          <span className={styles.mark}>b.</span>
        </header>

        {mutation.isSuccess ? (
          <div className={styles.confirmation}>
            <h1 className={styles.display}>you&rsquo;re on the list.</h1>
            <div className={styles.rule} />
            <p className={styles.lede}>
              Thanks for signing up. We&rsquo;ll be in touch as soon as Generation B opens up to
              creators.
            </p>
          </div>
        ) : (
          <>
            <h1 className={styles.display}>
              join the b.<br />creator community.
            </h1>
            <p className={styles.lede}>
              We work with brands like Mediheal, Katie Loxton and Joma. Leave your details and
              we&rsquo;ll let you know the moment we open applications.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                if (!consent) {
                  setError('Please accept the privacy policy to continue.');
                  return;
                }
                mutation.mutate();
              }}
            >
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={set('email')}
                required
              />
              <Input label="Your name" value={form.name} onChange={set('name')} />
              <Input
                label="Main handle"
                value={form.handle}
                onChange={set('handle')}
                placeholder="yourhandle"
              />
              <Select label="Main platform" value={form.platform} onChange={set('platform')}>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="YOUTUBE">YouTube</option>
              </Select>
              <Input
                label="Niche"
                value={form.niche}
                onChange={set('niche')}
                placeholder="Beauty, fitness, food…"
              />

              <label className={styles.consentRow}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I agree to B. The Agency storing my details so they can contact me about creator
                  opportunities. I can ask to be removed at any time.
                </span>
              </label>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Joining…' : 'Join the waitlist'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
