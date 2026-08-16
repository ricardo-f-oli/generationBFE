import React, { useId } from 'react';
import ui from './ui.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/** Q-F14: the label is linked to the input via htmlFor/id. */
export const Input: React.FC<InputProps> = ({ label, hint, error, id, ...props }) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = hint || error ? `${inputId}-hint` : undefined;

  return (
    <div className={ui.field}>
      {label && (
        <label className={ui.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={ui.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {(hint || error) && (
        <span
          id={describedBy}
          style={{
            fontSize: 'var(--fs-xs)',
            color: error ? 'var(--color-red)' : 'var(--text-muted)',
          }}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
};

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, hint, id, ...props }) => {
  const generatedId = useId();
  const areaId = id ?? generatedId;

  return (
    <div className={ui.field}>
      {label && (
        <label className={ui.label} htmlFor={areaId}>
          {label}
        </label>
      )}
      <textarea id={areaId} className={ui.textarea} {...props} />
      {hint && (
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{hint}</span>
      )}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={ui.field}>
      {label && (
        <label className={ui.label} htmlFor={selectId}>
          {label}
        </label>
      )}
      <select id={selectId} className={ui.select} {...props}>
        {children}
      </select>
    </div>
  );
};
