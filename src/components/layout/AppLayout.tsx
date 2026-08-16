import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { isSectionActive, NAV_ITEMS } from './navConfig';
import styles from './AppLayout.module.css';

/**
 * Q-A9: the layout no longer takes a `children` prop. It renders the router's Outlet directly,
 * so nested routes work and page-level context is actually delivered.
 */
export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, visibleItems]);

  const toggleSection = (path: string) =>
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.container}>
      {mobileOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <nav
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}
        aria-label="Main navigation"
      >
        <button type="button" className={styles.logo} onClick={() => navigate('/dashboard')}>
          generation b.
        </button>

        <div className={styles.nav}>
          {visibleItems.map((item) => {
            const sectionActive = isSectionActive(item, location.pathname);
            const isOpen = expanded[item.path] ?? sectionActive;

            if (!item.children) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
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
                  onClick={() => toggleSection(item.path)}
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
                      .filter((child) => !child.roles || (user && child.roles.includes(user.role)))
                      .map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
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

        <div className={styles.sidebarFooter}>
          <Link to="/register" className={styles.signupLink}>
            Creator sign-up ↗
          </Link>
        </div>
      </nav>

      <div className={styles.mainContainer}>
        <header className={styles.topHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
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
