import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled }) => {
  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: '40px',
    height: '22px',
  };

  const sliderStyle: React.CSSProperties = {
    position: 'absolute',
    cursor: disabled ? 'not-allowed' : 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: checked ? 'var(--color-red)' : 'var(--color-grey)',
    border: '1px solid var(--border-default)',
    borderRadius: '22px',
    transition: 'background-color 200ms ease',
  };

  const knobStyle: React.CSSProperties = {
    position: 'absolute',
    content: '""',
    height: '14px',
    width: '14px',
    left: checked ? '21px' : '3px',
    bottom: '3px',
    backgroundColor: checked ? 'var(--color-white)' : 'var(--color-black)',
    borderRadius: '50%',
    transition: 'left 200ms ease, background-color 200ms ease',
  };

  return (
    <label style={wrapperStyle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span style={sliderStyle}>
        <span style={knobStyle} />
      </span>
    </label>
  );
};
