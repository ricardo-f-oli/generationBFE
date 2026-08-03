import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { registerCreator } from '../services/creatorService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Dialog } from '../components/common/Dialog';
import styles from './RegisterPage.module.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 Form State
  const [fullName, setFullName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [niche, setNiche] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);

  // Step 2 Form State
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [followerBand, setFollowerBand] = useState('10K–50K');
  const [er, setEr] = useState('');
  const [tags, setTags] = useState<Record<string, boolean>>({});
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState('');

  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const tagList = ['Elevated', 'Clean girl', 'Sporty', 'Editorial', 'Lifestyle', 'Comedy', 'Educational'];

  const registerMutation = useMutation({
    mutationFn: registerCreator,
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const toggleTag = (t: string) => {
    setTags((prev) => ({ ...prev, [t]: !prev[t] }));
  };

  const handleNextStep = () => {
    if (!consent || !fullName || !email) return;
    setStep(2);
  };

  const handleSubmitProfile = () => {
    const selectedTagNames = Object.keys(tags).filter((k) => tags[k]);
    registerMutation.mutate({
      fullName,
      instagram,
      platform,
      niche,
      email,
      tiktok,
      youtube,
      followerBand,
      er,
      tags: selectedTagNames,
      bio,
      portfolio,
      consentGiven: consent,
    });
  };

  const firstName = fullName.trim().split(' ')[0] || 'there';

  return (
    <div className={styles.page}>
      <div className={styles.formWrapper}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.logo}>b.</div>
          <div onClick={() => navigate('/dashboard')} className={styles.backLink}>
            ← back to generation b.
          </div>
        </div>

        {!submitted ? (
          <>
            <div className={styles.heading}>join the b. creator community.</div>
            <div className={styles.subheading}>Tell us a little about yourself and we'll be in touch.</div>

            <div className={styles.stepLabel}>Step {step} of 2</div>

            {/* Step 1 */}
            {step === 1 && (
              <div className={styles.stepForm}>
                <Input
                  label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  label="Instagram handle"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />

                <label className={styles.fieldLabel}>
                  <span className={styles.fieldLabelText}>Primary platform</span>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>YouTube</option>
                  </select>
                </label>

                <Input
                  label="Niche / location"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <div className={styles.consentRow}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className={styles.consentCheckbox}
                  />
                  <span className={styles.consentText}>
                    I agree to B. The Agency storing my details in line with their{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPrivacyModalOpen(true);
                      }}
                    >
                      privacy policy
                    </a>
                    .
                  </span>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  disabled={!consent || !fullName || !email}
                  onClick={handleNextStep}
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className={styles.stepForm}>
                <Input
                  label="TikTok handle (optional)"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                />
                <Input
                  label="YouTube channel (optional)"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                />

                <label className={styles.fieldLabel}>
                  <span className={styles.fieldLabelText}>Follower count range</span>
                  <select
                    value={followerBand}
                    onChange={(e) => setFollowerBand(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option>Under 10K</option>
                    <option>10K–50K</option>
                    <option>50K–100K</option>
                    <option>100K–250K</option>
                    <option>250K+</option>
                  </select>
                </label>

                <Input
                  label="Engagement rate %"
                  value={er}
                  onChange={(e) => setEr(e.target.value)}
                />

                {/* Content Style Tags */}
                <div className={styles.tagsSection}>
                  <span className={styles.fieldLabelText}>Content style tags</span>
                  <div className={styles.tagsList}>
                    {tagList.map((t) => {
                      const active = tags[t];
                      return (
                        <div
                          key={t}
                          onClick={() => toggleTag(t)}
                          className={`${styles.tagChip} ${active ? styles.tagChipActive : ''}`}
                        >
                          {t}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <label className={styles.fieldLabel}>
                  <span className={styles.fieldLabelText}>Brief bio</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className={styles.bioTextarea}
                  />
                </label>

                <Input
                  label="Portfolio link"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                />

                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSubmitProfile}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? 'Submitting...' : 'Submit your profile'}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Confirmation Screen */
          <div className={styles.confirmationScreen}>
            <div className={styles.confirmationTitle}>thanks, {firstName}.</div>
            <div className={styles.confirmationDivider} />
            <div className={styles.confirmationText}>We'll review your profile and be in touch soon.</div>
          </div>
        )}
      </div>

      {/* Privacy Policy Modal */}
      {privacyModalOpen && (
        <div onClick={() => setPrivacyModalOpen(false)} className={styles.modalOverlay}>
          <Dialog title="Privacy policy" onClose={() => setPrivacyModalOpen(false)}>
            <div className={styles.modalBodyText}>
              B. The Agency stores your details to manage creator partnerships and campaign communications. Your data is never shared with third parties without consent, and you may request erasure at any time.
            </div>
          </Dialog>
        </div>
      )}
    </div>
  );
};
