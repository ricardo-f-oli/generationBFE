import React, { useId } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/** Q-F14: a real checkbox with an associated label, so it is keyboard operable. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled }) => {
  const id = useId();

  return (
    <label className={styles.wrapper} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles.native}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={`${styles.track} ${checked ? styles.trackOn : ''}`} aria-hidden="true">
        <span className={`${styles.knob} ${checked ? styles.knobOn : ''}`} />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
};
