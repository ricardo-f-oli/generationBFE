import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Requirement #38: the app has to work on a phone.
 *
 * "Responsive" is easy to claim and easy to get wrong, so this asserts the two failures that
 * actually make a page unusable rather than eyeballing screenshots:
 *
 *   1. The body scrolls sideways. A page you have to pan horizontally to read is broken, and it
 *      is almost always one wide element — a table, a grid with a fixed minimum, a long unbroken
 *      string — rather than the layout as a whole.
 *   2. Controls are too small to hit. The WCAG 2.2 target-size minimum is 24px; Apple and
 *      Google both say 44px. We check 44 for primary controls because a mis-tap on "Approve"
 *      matters more than a tidy layout.
 *
 * Runs against the `mobile` project in playwright.config.ts (iPhone 13 viewport, touch enabled).
 */

/** Every authenticated route worth checking. */
const ROUTES = [
  ['Dashboard', '/dashboard'],
  ['Creator database', '/creators'],
  ['Discover', '/creators/discovery'],
  ['Matching', '/creators/matching'],
  ['Shortlists', '/creators/shortlists'],
  ['Registrations', '/creators/registrations'],
  ['Tags & attributes', '/creators/taxonomy'],
  ['Campaigns', '/campaigns'],
  ['Board', '/campaigns/board'],
  ['Brief builder', '/campaigns/brief'],
  ['Clause library', '/campaigns/clauses'],
  ['Outreach', '/outreach'],
  ['Templates', '/outreach/templates'],
  ['Follow-ups', '/outreach/follow-ups'],
  ['Coverage log', '/coverage'],
  ['Digest settings', '/coverage/digest'],
  ['Gifting', '/gifting'],
  ['Dispatches', '/gifting/dispatches'],
  ['Waitlist', '/marketing/waitlist'],
  ['Reports', '/reporting'],
  ['Insight chasing', '/reporting/insights'],
  ['Campaign KPIs', '/reporting/kpi'],
  ['Users & roles', '/settings'],
  ['GDPR & data', '/settings/gdpr'],
  ['Audit log', '/settings/audit'],
] as const;

/** Public routes, which a creator reaches on a phone far more often than a desktop. */
const PUBLIC_ROUTES = [
  ['Login', '/login'],
  ['Register', '/register'],
  ['Waitlist landing', '/join'],
] as const;

/**
 * Names the element causing a sideways scroll, so a failure says "the coverage table is 780px"
 * rather than "something overflowed".
 */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    // 1px of slack: sub-pixel rounding on borders is not a bug.
    if (document.documentElement.scrollWidth <= docWidth + 1) {
      return null;
    }
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.right <= docWidth + 1) return;
      // Only report the element itself, not every ancestor that contains it.
      if (el.parentElement && el.parentElement.getBoundingClientRect().right > docWidth + 1) return;
      const id = `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}`;
      offenders.push(`${id} (right edge ${Math.round(rect.right)}px of ${docWidth}px)`);
    });
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: docWidth,
      offenders: offenders.slice(0, 5),
    };
  });
}

/**
 * Visible controls smaller than the minimum that applies to them.
 *
 * Two thresholds, because two different standards apply:
 *
 *   * Buttons and form controls: 44px. Apple's and Google's figure, roughly a fingertip. A
 *     mis-tap here fires an action — "Remove", "Approve" — so the stricter rule is the right one.
 *   * Links: 24px, the WCAG 2.2 AA minimum (2.5.8). The same spec exempts links whose target is
 *     inline text, which is why a creator handle inside a table cell is not held to 44px: it
 *     cannot be, without doubling the height of every row.
 */
async function smallTouchTargets(page: Page) {
  return page.evaluate(() => {
    const BUTTON_MIN = 44;
    const LINK_MIN = 24;
    const results: string[] = [];
    const selector = 'button, a[href], input[type="checkbox"], input[type="radio"], select';

    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return;

      const isLink = el.tagName === 'A';
      // A link inside running text is part of a sentence, not a control.
      if (isLink && el.closest('p')) return;

      const min = isLink ? LINK_MIN : BUTTON_MIN;
      if (rect.height < min || (!isLink && rect.width < min)) {
        const label =
          (el.textContent ?? '').trim().slice(0, 30) || el.getAttribute('aria-label') || el.tagName;
        results.push(
          `"${label}" ${Math.round(rect.width)}x${Math.round(rect.height)} (min ${min})`,
        );
      }
    });
    return results.slice(0, 8);
  });
}

test.describe('Mobile layout', () => {
  for (const [name, path] of PUBLIC_ROUTES) {
    test(`${name} does not scroll sideways`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await horizontalOverflow(page), `${name} (${path})`).toBeNull();
    });
  }

  for (const [name, path] of ROUTES) {
    test(`${name} does not scroll sideways`, async ({ adminPage }) => {
      await adminPage.goto(path);
      // Data screens settle after their queries resolve; without this the check races the
      // skeleton and passes on an empty page.
      await adminPage.waitForLoadState('networkidle');
      expect(await horizontalOverflow(adminPage), `${name} (${path})`).toBeNull();
    });
  }
});

test.describe('Mobile navigation', () => {
  test('the sidebar is reachable, traps focus, and closes on Escape', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');

    // Off-canvas by default at this width.
    const sidebar = adminPage.getByRole('dialog', { name: /navigation/i });
    await expect(sidebar).toBeHidden();

    await adminPage.getByRole('button', { name: /toggle navigation|open navigation/i }).click();
    await expect(sidebar).toBeVisible();

    // Focus must be inside the drawer, or a screen reader user is still on the page behind it.
    const focusInside = await adminPage.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog ? dialog.contains(document.activeElement) : false;
    });
    expect(focusInside).toBe(true);

    // The page behind must not scroll while the drawer is open.
    const bodyLocked = await adminPage.evaluate(
      () => getComputedStyle(document.body).overflow === 'hidden'
        || document.body.hasAttribute('data-scroll-locked'),
    );
    expect(bodyLocked).toBe(true);

    await adminPage.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
  });

  test('following a nav link closes the drawer', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await adminPage.getByRole('button', { name: /toggle navigation|open navigation/i }).click();

    const sidebar = adminPage.getByRole('dialog', { name: /navigation/i });
    await expect(sidebar).toBeVisible();

    // "Coverage log" is a child link, and its section is collapsed until you are inside it.
    await sidebar.getByRole('button', { name: /^Coverage/ }).click();
    await sidebar.getByRole('link', { name: 'Coverage log' }).click();
    await expect(adminPage).toHaveURL(/\/coverage/);
    // Leaving it open over the page you just navigated to is the classic drawer bug.
    await expect(sidebar).toBeHidden();
  });
});

test.describe('Touch targets', () => {
  // A representative spread rather than every route: the rule is enforced by shared components,
  // so a violation shows up on the first screen that uses the offending one.
  for (const [name, path] of [
    ['Dashboard', '/dashboard'],
    ['Creator database', '/creators'],
    ['Coverage log', '/coverage'],
    ['Login', '/login'],
  ] as const) {
    test(`${name} controls are large enough to tap`, async ({ adminPage }) => {
      await adminPage.goto(path);
      await adminPage.waitForLoadState('networkidle');
      expect(await smallTouchTargets(adminPage), `${name} (${path})`).toEqual([]);
    });
  }
});
