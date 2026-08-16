import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import styles from './Toast.module.css';

type ToastTone = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

/** Q-F16: mutations previously succeeded or failed with no feedback at all. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const push = useCallback((tone: ToastTone, text: string) => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, tone, text }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 5000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push('success', text),
      error: (text) => push('error', text),
      info: (text) => push('info', text),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`${styles.toast} ${styles[message.tone]}`}>
            {message.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
