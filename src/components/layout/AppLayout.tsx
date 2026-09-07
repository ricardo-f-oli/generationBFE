import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useIsMobileNav } from '../../hooks/useMediaQuery';
import { isSectionActive, NAV_ITEMS, type NavItem } from './navConfig';
import type { Role } from '../../types';
import styles from './AppLayout.module.css';

/**
 * Q-A9: the layout no longer takes a `children` prop. It renders the router's Outlet directly,
 * so nested routes work and page-level context is actually delivered.
 *
 * Requirement #38: on a phone the navigation is a modal drawer, on a desktop it is a static
 * landmark. Those are genuinely different things — one traps focus, locks the page behind it and
 * announces itself as a dialog; the other must do none of that — so the markup switches rather
 * than the styling. The previous version translated one `<nav>` off-screen, which left every
 * link in the tab order and reachable by a screen reader while the drawer looked closed.
 *
 * Radix supplies the parts that are easy to get subtly wrong: focus trap and restore, scroll
 * lock, Escape, `aria-modal`, and an inert background. It ships no styles, so the design system
 * is untouched.
 */

/** The nav list itself. Identical in both presentations — only the wrapper differs. */
const NavList: React.FC<{
  items: NavItem[];
  role: Role | undefined;
  pathname: string;
  expanded: Record<string, boolean>;
  onToggleSection: (path: string) => void;
  /** Set on mobile so following a link closes the drawer. */
  onNavigate?: () => void;
}> = ({ items, role, pathname, expanded, onToggleSection, onNavigate }) => (
  <div className={styles.nav}>
    {items.map((item) => {
      const sectionActive = isSectionActive(item, pathname);
      const isOpen = expanded[item.path] ?? sectionActive;

      if (!item.children) {
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${styles.navGroupHeader} ${isActive ? styles.navGroupHeaderActive : ''}`
            }
          >
            <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        );
      }

      return (
        <div key={item.path}>
          <button
            type="button"
            className={`${styles.navGroupHeader} ${
              sectionActive ? styles.navGroupHeaderActive : ''
            }`}
            onClick={() => onToggleSection(item.path)}
            aria-expanded={isOpen}
            aria-controls={`nav-${item.label}`}
          >
            <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            <span
              className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
              aria-hidden="true"
            >
              ▶
            </span>
          </button>

          {isOpen && (
            <div className={styles.navChildren} id={`nav-${item.label}`}>
              {item.children
                .filter((child) => !child.roles || (role && child.roles.includes(role)))
                .map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `${styles.navChild} ${isActive ? styles.navChildActive : ''}`
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

/** Logo, nav and footer — the drawer and the sidebar both wrap exactly this. */
const SidebarBody: React.FC<{
  items: NavItem[];
  role: Role | undefined;
  pathname: string;
  expanded: Record<string, boolean>;
  onToggleSection: (path: string) => void;
  onNavigate?: () => void;
  onLogoClick: () => void;
}> = ({ onLogoClick, onNavigate, ...rest }) => (
  <>
    <button
      type="button"
      className={styles.logo}
      onClick={() => {
        onLogoClick();
        onNavigate?.();
      }}
    >
      generation b.
    </button>

    <NavList {...rest} onNavigate={onNavigate} />

    <div className={styles.sidebarFooter}>
      <Link to="/register" className={styles.signupLink} onClick={onNavigate}>
        Creator sign-up ↗
      </Link>
    </div>
  </>
);

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobileNav = useIsMobileNav();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
    [user],
  );

  // Sections auto-expand when you are inside them; the user can still toggle.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const active = visibleItems.find((item) => isSectionActive(item, location.pathname));
    if (active?.children) {
      setExpanded((prev) => ({ ...prev, [active.path]: true }));
    }
    // Belt and braces: links close the drawer themselves, but a redirect that changes the route
    // without a click — an expired session, a programmatic navigate — must close it too.
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, visibleItems]);

  // Leaving the drawer mounted after a rotation to landscape would trap focus in a panel the
  // user can no longer see.
  useEffect(() => {
    if (!isMobileNav) setMobileOpen(false);
  }, [isMobileNav]);

  const toggleSection = (path: string) =>
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const bodyProps = {
    items: visibleItems,
    role: user?.role,
    pathname: location.pathname,
    expanded,
    onToggleSection: toggleSection,
    onLogoClick: () => navigate('/dashboard'),
  };

  return (
    <div className={styles.container}>
      {/* Desktop: a plain landmark, always visible, never modal. */}
      {!isMobileNav && (
        <nav className={styles.sidebar} aria-label="Main navigation">
          <SidebarBody {...bodyProps} />
        </nav>
      )}

      <div className={styles.mainContainer}>
        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            {isMobileNav && (
              <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className={styles.menuToggle}
                    aria-label="Toggle navigation"
                  >
                    ☰
                  </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                  <Dialog.Overlay className={styles.backdrop} />
                  <Dialog.Content
                    className={styles.drawer}
                    aria-label="Main navigation"
                    // Radix would otherwise focus the first element, which is the logo button;
                    // the panel itself is the better landing point for a screen reader.
                    onOpenAutoFocus={(event) => {
                      event.preventDefault();
                      (event.currentTarget as HTMLElement).focus();
                    }}
                    tabIndex={-1}
                  >
                    <Dialog.Title className={styles.srOnly}>Navigation</Dialog.Title>
                    <Dialog.Description className={styles.srOnly}>
                      Sections of the Generation B workspace.
                    </Dialog.Description>
                    <SidebarBody {...bodyProps} onNavigate={() => setMobileOpen(false)} />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            )}

            {/* Q-F11: the fake brand switcher is gone. A user belongs to one brand (Q-C13). */}
            <div className={styles.brandBadge}>
              <span>Workspace</span>
              <span className={styles.brandName}>B. The Agency</span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.userButton}
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <Avatar name={user?.name || user?.email || 'User'} size={32} />
              <span className={styles.userMeta}>
                <span className={styles.userName}>{user?.name ?? user?.email}</span>
                <span className={styles.userRole}>
                  {user?.role?.replace(/_/g, ' ').toLowerCase()}
                </span>
              </span>
            </button>

            {userMenuOpen && (
              <div className={styles.userMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.userMenuItem}
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className={styles.contentOutlet}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
