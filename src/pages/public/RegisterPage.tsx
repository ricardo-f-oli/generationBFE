import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Input, Select, TextArea } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { registerCreator } from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import styles from './PublicPages.module.css';

const TAG_OPTIONS = ['Elevated', 'Clean girl', 'Sporty', 'Editorial', 'Lifestyle', 'Comedy', 'Educational'];

/**
 * Requirement #20: the two-step creator self-registration.
 *
 * Every field is now sent to and stored by the backend — tags, bio, portfolio, follower band and
 * the consent flag were all silently discarded before (Q-F23 / Q-I5).
 */
export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    instagram: '',
    platform: 'Instagram',
    niche: '',
    email: '',
    tiktok: '',
    youtube: '',
    followerBand: '10K-50K',
    er: '',
    bio: '',
    portfolio: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      registerCreator({
        fullName: form.fullName,
        instagram: form.instagram,
        platform: form.platform.toUpperCase(),
        niche: form.niche,
        email: form.email,
        tiktok: form.tiktok || undefined,
        youtube: form.youtube || undefined,
        followerBand: form.followerBand,
        er: form.er || undefined,
        tags,
        bio: form.bio || undefined,
        portfolio: form.portfolio || undefined,
        consentGiven: consent,
      }),
    onError: (e) =>
      setError(
        e instanceof ApiError ? e.message : 'Something went wrong. Please try again shortly.',
      ),
  });

  const firstName = form.fullName.trim().split(' ')[0] || 'there';
  const canContinue = consent && form.fullName && form.email && form.instagram;

  return (
    <div className={styles.landing}>
      <div className={styles.landingInner}>
        <header className={styles.landingHeader}>
          <span className={styles.mark}>b.</span>
          <Link to="/join" className={styles.backLink}>
            ← back
          </Link>
        </header>

        {mutation.isSuccess ? (
          <div className={styles.confirmation}>
            <h1 className={styles.display}>thanks, {firstName}.</h1>
            <div className={styles.rule} />
            <p className={styles.lede} style={{ marginBottom: 0 }}>
              We&rsquo;ll review your profile and be in touch soon.
            </p>
          </div>
        ) : (
          <>
            <h1 className={styles.display}>join the b. creator community.</h1>
            <p className={styles.lede}>
              Tell us a little about yourself and we&rsquo;ll be in touch.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.form}>
              <p className={styles.stepLabel}>Step {step} of 2</p>

              {step === 1 ? (
                <>
                  <Input label="Full name" value={form.fullName} onChange={set('fullName')} required />
                  <Input
                    label="Instagram handle"
                    value={form.instagram}
                    onChange={set('instagram')}
                    placeholder="yourhandle"
                    required
                  />
                  <Select label="Primary platform" value={form.platform} onChange={set('platform')}>
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>YouTube</option>
                  </Select>
                  <Input label="Niche" value={form.niche} onChange={set('niche')} placeholder="Beauty" />
                  <Input label="Email address" type="email" value={form.email} onChange={set('email')} required />

                  <label className={styles.consentRow}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      I agree to B. The Agency storing my details in line with their{' '}
                      <button
                        type="button"
                        className={styles.backLink}
                        style={{ textTransform: 'none', letterSpacing: 0 }}
                        onClick={() => setPrivacyOpen(true)}
                      >
                        privacy policy
                      </button>
                      .
                    </span>
                  </label>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={!canContinue}
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  <Input label="TikTok handle (optional)" value={form.tiktok} onChange={set('tiktok')} />
                  <Input label="YouTube channel (optional)" value={form.youtube} onChange={set('youtube')} />
                  <Select label="Follower range" value={form.followerBand} onChange={set('followerBand')}>
                    <option>Under 10K</option>
                    <option>10K-50K</option>
                    <option>50K-100K</option>
                    <option>100K-250K</option>
                    <option>250K+</option>
                  </Select>
                  <Input label="Engagement rate %" value={form.er} onChange={set('er')} placeholder="4.2" />

                  <div>
                    <p className={styles.stepLabel} style={{ marginBottom: 'var(--space-3)' }}>
                      Content style
                    </p>
                    <div className={styles.tagGrid}>
                      {TAG_OPTIONS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`${styles.tagChip} ${tags.includes(tag) ? styles.tagChipActive : ''}`}
                          onClick={() =>
                            setTags((prev) =>
                              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                            )
                          }
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <TextArea label="Brief bio" value={form.bio} onChange={set('bio')} rows={3} />
                  <Input label="Portfolio link" value={form.portfolio} onChange={set('portfolio')} />

                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate()}
                    >
                      {mutation.isPending ? 'Submitting…' : 'Submit your profile'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {privacyOpen && (
        <Modal title="Privacy policy" onClose={() => setPrivacyOpen(false)}>
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-normal)' }}>
            B. The Agency stores your details to manage creator partnerships and campaign
            communications. We record when and how you gave consent, along with the version of this
            policy you accepted.
          </p>
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-normal)' }}>
            Your data is never shared with third parties without your consent. You can unsubscribe
            from any email we send, and you may request erasure at any time — we will anonymise your
            record and keep only enough information to make sure you are not contacted again.
          </p>
        </Modal>
      )}
    </div>
  );
};
