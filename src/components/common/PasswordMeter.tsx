import React from 'react';
import styles from './PasswordMeter.module.css';

/**
 * The server's rule, mirrored. PasswordPolicy.MIN_LENGTH is the authority and rejects anything
 * shorter regardless of what this says; the API also publishes it at GET /api/auth/password-policy
 * if this ever needs to stop being a constant.
 */
export const MIN_PASSWORD_LENGTH = 12;

interface PasswordMeterProps {
  value: string;
  minLength?: number;
}

/**
 * How far a password is from being long enough, as a filling bar and a count.
 *
 * <p>Exists because the length rule was previously stated once, in static hint text, and then
 * never mentioned again — someone typing had no way to know whether they were at 6 characters
 * or 11 until the form rejected them on submit.
 *
 * <p>Colour is the fastest signal but never the only one: the bar carries a count and a worded
 * status beside it, so the same information survives a red-green colour deficiency, a
 * monochrome display, and a screen reader. The status is announced politely rather than
 * assertively, because it changes on every keystroke.
 */
export const PasswordMeter: React.FC<PasswordMeterProps> = ({
  value,
  minLength = MIN_PASSWORD_LENGTH,
}) => {
  const length = value.length;
  const met = length >= minLength;
  // Caps at 100: a 40-character passphrase is not 333% done.
  const percent = Math.min(100, Math.round((length / minLength) * 100));

  // Nothing typed yet — the field's own hint already states the rule, and an empty bar sitting
  // at 0% in red reads as an error the user has not had a chance to make.
  if (length === 0) {
    return null;
  }

  return (
    <div className={styles.meter}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={minLength}
        aria-valuenow={Math.min(length, minLength)}
        aria-label="Password length"
      >
        <div
          className={`${styles.fill} ${met ? styles.fillMet : styles.fillShort}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className={`${styles.status} ${met ? styles.statusMet : styles.statusShort}`} aria-live="polite">
        {met
          ? `${length} characters — long enough`
          : `${length} of ${minLength} characters — ${minLength - length} more`}
      </p>
    </div>
  );
};
