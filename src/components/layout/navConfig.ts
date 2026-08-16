import type { Role } from '../../types';

/**
 * Sidebar structure: parents with their "sons" nested underneath, as requested.
 * A parent with no children behaves as a plain link.
 */
export interface NavChild {
  label: string;
  path: string;
  /** When set, only these roles see the item (Q-F17). */
  roles?: Role[];
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  children?: NavChild[];
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: '▤',
  },
  {
    label: 'Creators',
    path: '/creators',
    icon: '◈',
    children: [
      { label: 'Database', path: '/creators' },
      { label: 'Matching', path: '/creators/matching' },
      { label: 'Shortlists', path: '/creators/shortlists' },
      { label: 'Registrations', path: '/creators/registrations' },
      { label: 'Tags & attributes', path: '/creators/taxonomy' },
    ],
  },
  {
    label: 'Campaigns',
    path: '/campaigns',
    icon: '▥',
    children: [
      { label: 'All campaigns', path: '/campaigns' },
      { label: 'Board', path: '/campaigns/board' },
      { label: 'Brief builder', path: '/campaigns/brief' },
      { label: 'Clause library', path: '/campaigns/clauses' },
    ],
  },
  {
    label: 'Outreach',
    path: '/outreach',
    icon: '➤',
    children: [
      { label: 'Composer', path: '/outreach' },
      { label: 'Templates', path: '/outreach/templates' },
    ],
  },
  {
    label: 'Coverage',
    path: '/coverage',
    icon: '▦',
    children: [
      { label: 'Coverage log', path: '/coverage' },
      { label: 'Digest settings', path: '/coverage/digest' },
    ],
  },
  {
    label: 'Gifting',
    path: '/gifting',
    icon: '◫',
    children: [
      { label: 'Logistics', path: '/gifting' },
      { label: 'Dispatches', path: '/gifting/dispatches' },
    ],
  },
  {
    label: 'Marketing',
    path: '/marketing',
    icon: '◇',
    children: [{ label: 'Waitlist', path: '/marketing/waitlist' }],
  },
  {
    label: 'Reporting',
    path: '/reporting',
    icon: '▧',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: '⚙',
    roles: ['ADMIN'],
    children: [
      { label: 'Users & roles', path: '/settings' },
      { label: 'GDPR & data', path: '/settings/gdpr' },
      { label: 'Audit log', path: '/settings/audit' },
    ],
  },
];

/** True when `pathname` is inside this nav item's section. */
export function isSectionActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.path) return true;
  if (pathname.startsWith(item.path + '/')) return true;
  return (item.children ?? []).some((child) => pathname === child.path);
}
