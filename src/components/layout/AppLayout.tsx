import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
  const [activeBrand, setActiveBrand] = useState('All Brands');
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '▤' },
    { label: 'Creators', path: '/creators', icon: '◈' },
    { label: 'Campaigns', path: '/campaigns', icon: '▥' },
    { label: 'Coverage', path: '/coverage', icon: '▦' },
    { label: 'Outreach', path: '/outreach', icon: '➤' },
    { label: 'Gifting', path: '/gifting', icon: '◫' },
    { label: 'Reporting', path: '/reporting', icon: '▧' },
    { label: 'Settings', path: '/settings', icon: '⚙' },
  ];

  const brandOptions = ['All Brands', 'Mediheal', 'Katie Loxton', 'Joma'];

  const isCampaignSubscreen =
    location.pathname.startsWith('/campaigns') ||
    location.pathname.startsWith('/shortlist') ||
    location.pathname.startsWith('/brief');

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div onClick={() => navigate('/dashboard')} className={styles.logo}>
          generation b.
        </div>

        {navItems.map((item) => {
          const isActive =
            location.pathname.startsWith(item.path) ||
            (item.path === '/campaigns' && isCampaignSubscreen);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span>{item.icon}</span>
              <span className={styles.navItemLabel}>{item.label}</span>
            </NavLink>
          );
        })}

        <div onClick={() => navigate('/register')} className={styles.signupLink}>
          Creator sign-up (public) ↗
        </div>
      </div>

      {/* Main Container */}
      <div className={styles.mainContainer}>
        {/* Top Header */}
        <div className={styles.topHeader}>
          {/* Brand Switcher */}
          <div className={styles.brandSwitcherWrapper}>
            <div onClick={() => setBrandMenuOpen(!brandMenuOpen)} className={styles.brandSwitcherButton}>
              <span>{activeBrand}</span>
              <span>▾</span>
            </div>

            {brandMenuOpen && (
              <div className={styles.brandDropdown}>
                {brandOptions.map((brand) => (
                  <div
                    key={brand}
                    onClick={() => {
                      setActiveBrand(brand);
                      setBrandMenuOpen(false);
                    }}
                    className={styles.brandDropdownItem}
                  >
                    {brand}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User & Notifications */}
          <div className={styles.headerActions}>
            <div className={styles.notificationButton}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <Avatar name="Team Lead" size={36} />
          </div>
        </div>

        {/* Content Outlet */}
        <div className={styles.contentOutlet}>
          <Outlet context={{ activeBrand }} />
        </div>
      </div>
    </div>
  );
};
