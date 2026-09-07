import { test, expect } from './fixtures';

/**
 * Requirement #53 end to end: a report cannot reach a client without a director's sign-off.
 *
 * This is the journey worth testing at this level because it crosses everything — two different
 * user roles, a state machine in the backend, an HTTP status the frontend has to interpret, and
 * a UI that must offer different actions to different people. No lower-level test covers that
 * combination.
 */
test.describe('Report sign-off gate', () => {
  test('an account manager cannot approve their own report; a director can', async ({
    page,
    browser,
  }) => {
    // --- the account manager drafts and submits -----------------------------
    await page.goto('/login');
    await page.getByLabel(/email or username/i).fill('am@generationb.dev');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/reporting');
    await page.getByRole('button', { name: /new report/i }).click();

    await page.getByLabel(/period start/i).fill('2026-01-01');
    await page.getByRole('button', { name: /create and generate/i }).click();

    // The list refreshes with the new draft at the top.
    const draft = page.getByRole('link', { name: /monthly seeding/i }).first();
    await expect(draft).toBeVisible();
    await draft.click();

    // Assert on what the state lets you do, not on a label — "Draft" also appears in the
    // status filter and on other rows, and a brittle selector is a flaky test.
    const submit = page.getByRole('button', { name: /submit for sign-off/i });
    await expect(submit).toBeVisible();
    await submit.click();

    // An account manager sees the explanation, not an approve button.
    await expect(page.getByText(/only a director or admin can sign this off/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^approve$/i })).toHaveCount(0);

    const reportUrl = page.url();

    // --- the director approves ---------------------------------------------
    const directorContext = await browser.newContext();
    const directorPage = await directorContext.newPage();

    await directorPage.goto('/login');
    await directorPage.getByLabel(/email or username/i).fill('director@generationb.dev');
    await directorPage.getByLabel('Password', { exact: true }).fill('Password123!');
    await directorPage.getByRole('button', { name: /sign in/i }).click();
    await expect(directorPage).toHaveURL(/\/dashboard/);

    await directorPage.goto(reportUrl);
    await expect(directorPage.getByRole('button', { name: /^approve$/i })).toBeVisible();
    await directorPage.getByRole('button', { name: /^approve$/i }).click();

    // Only once approved does sending become possible.
    await expect(directorPage.getByRole('button', { name: /mark as sent to client/i })).toBeVisible();

    await directorContext.close();
  });

  test('unmeasurable metrics are explained, never shown as zero', async ({ adminPage }) => {
    await adminPage.goto('/reporting');
    await adminPage.getByRole('link', { name: /seeding|wrap/i }).first().click();

    // The single most important piece of copy in the product.
    await expect(adminPage.getByText(/no connected data source supplies impressions/i)).toBeVisible();
    await expect(adminPage.getByText(/what this report cannot tell you/i)).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('every top-level section loads without an error state', async ({ adminPage }) => {
    const sections = [
      '/creators',
      '/campaigns',
      '/coverage',
      '/gifting',
      '/reporting',
      '/outreach/follow-ups',
      '/settings/audit',
    ];

    for (const path of sections) {
      await adminPage.goto(path);
      // The error banner is the thing that must not appear.
      await expect(adminPage.getByText(/could not load this data/i)).toHaveCount(0);
      await expect(adminPage.locator('h1')).toBeVisible();
    }
  });
});
