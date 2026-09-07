import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query from React.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the effect version renders once
 * with the wrong answer before correcting itself, which on this app means the navigation mounts
 * as a desktop sidebar and then swaps to a drawer. That flash is visible on a slow phone.
 *
 * Layout should stay in CSS wherever it can — this is for the cases where the *markup* has to
 * differ, not just its styling. The navigation is the real one: on a phone it must be a modal
 * dialog that traps focus and locks scrolling, and on a desktop it must be a plain landmark that
 * does neither. No amount of CSS turns one into the other.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    // Server snapshot. Nothing prerenders this app today, but returning false keeps the hook
    // safe if anything ever does: desktop is the layout that degrades more gracefully.
    () => false,
  );
}

/**
 * The one breakpoint the navigation switches on, kept here so the value cannot drift from the
 * `max-width: 900px` block in AppLayout.module.css.
 */
export const MOBILE_NAV_QUERY = '(max-width: 900px)';

export function useIsMobileNav(): boolean {
  return useMediaQuery(MOBILE_NAV_QUERY);
}
