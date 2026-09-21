import { expect, test } from '@playwright/test';

/**
 * The rule this file exists to protect: the landing CTAs stay readable while the pointer is on
 * them.
 *
 * This is not hypothetical. `global.css` styles every anchor with `a:hover { color: #a80006 }`,
 * and at specificity (0,1,1) that beats any bare class. The first version of the landing card
 * set only a hover *background*, to that same #a80006 — so hovering the main call to action
 * painted red text onto an identical red ground and the label vanished. A unit test could not
 * see it: jsdom applies no CSS module, and the DOM was perfectly correct.
 *
 * So the assertion is on computed colour under a real hover, and it is a contrast ratio rather
 * than an equality check — "not literally identical" would still pass for #a80006 on #a90007.
 */

/** WCAG relative luminance. */
function luminance([r, g, b]: number[]): number {
  const c = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function parseRgb(value: string): number[] {
  const m = value.match(/\d+/g);
  if (!m) throw new Error(`Could not parse colour: ${value}`);
  return m.slice(0, 3).map(Number);
}

const CTAS = [
  ['Creator registration', 'Creator registration Tell us about your work and we’ll be in touch →'],
  ['Team login', 'Team login For B. The Agency staff →'],
] as const;

test.describe('Landing page call-to-action', () => {
  for (const [label, accessibleName] of CTAS) {
    test(`"${label}" stays legible on hover`, async ({ page }) => {
      await page.goto('/');
      // The page renders a spinner while the session check is in flight and then swaps the DOM.
      // Hovering before that settles puts the pointer on a node React is about to replace, and
      // the :hover state goes with it — the measurement then silently reads the resting colours
      // and the test passes on a broken page. Wait for it to stop moving first.
      await page.waitForLoadState('networkidle');

      const cta = page.getByRole('link', { name: accessibleName });
      await expect(cta).toBeVisible();

      await cta.hover();
      // The colour transition is 120ms; measuring immediately reads a half-blended value.
      await page.waitForTimeout(300);

      const { color, background } = await cta.evaluate((el) => {
        const s = getComputedStyle(el);
        return { color: s.color, background: s.backgroundColor };
      });

      const ratio = contrast(parseRgb(color), parseRgb(background));
      expect(
        ratio,
        `"${label}" hovered: text ${color} on ${background} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('the creator CTA leads to the registration form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /creator registration/i }).click();
    await expect(page).toHaveURL(/\/register$/);
  });
});
