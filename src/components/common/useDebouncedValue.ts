import { useEffect, useState } from 'react';

/**
 * Delays a value until the user stops changing it.
 *
 * Used by search boxes so typing "sophiabeauty" fires one request rather than twelve.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
