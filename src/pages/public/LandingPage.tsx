import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/common/Spinner';
import { BrandMark } from '../../components/common/BrandMark';
import styles from './Landing.module.css';

/**
 * The public front door at `/`.
 *
 * Until now `/` sat inside ProtectedLayout and bounced anyone without a session to /login, so
 * there was no address to give a creator. This is that address: one screen, two ways in —
 * the team signs in, a creator applies.
 *
 * Signed-in staff never see it. Sending them to the marketing page every time they open the
 * bookmark would be a regression from the old index redirect, so the redirect is kept here.
 */
export const LandingPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner label="Loading" fullPage />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.mark}><BrandMark /></span>
        <Link to="/login" className={styles.headerLink}>
          Team login
        </Link>
      </header>

      <main className={styles.main}>
        <p className={styles.eyebrow}><BrandMark name="agency" /></p>

        <h1 className={styles.display}>
          <BrandMark name="product" />
          <br />
          <span className={styles.displayMuted}>creators and brands, managed properly.</span>
        </h1>

        <div className={styles.rule} />

        <p className={styles.lede}>
          The platform behind our campaigns with brands like Mediheal, Katie Loxton and Joma.
          Creators apply once and we match them to briefs that actually fit. No mailing list,
          no middlemen.
        </p>

        <div className={styles.ctas}>
          <Link to="/register" className={`${styles.cta} ${styles.ctaPrimary}`}>
            <span className={styles.ctaLabel}>Creator registration</span>
            <span className={styles.ctaSub}>
              Tell us about your work and we&rsquo;ll be in touch &rarr;
            </span>
          </Link>

          <Link to="/login" className={`${styles.cta} ${styles.ctaSecondary}`}>
            <span className={styles.ctaLabel}>Team login</span>
            <span className={styles.ctaSub}>For <BrandMark name="agency" /> staff &rarr;</span>
          </Link>
        </div>

        <p className={styles.footnote}>
          Already applied? We&rsquo;ll email you as soon as your application has been reviewed.
          Not ready to apply &mdash; <Link to="/join" className={styles.inlineLink}>join the
          waitlist</Link> instead.
        </p>
      </main>

      <footer className={styles.footer}>
        <span>&copy; {new Date().getFullYear()} <BrandMark name="agency" /></span>
        <Link to="/unsubscribe" className={styles.footerLink}>
          Email preferences
        </Link>
      </footer>
    </div>
  );
};
