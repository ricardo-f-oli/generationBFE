import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared setup for the end-to-end journeys.
 *
 * Signing in goes through the real login form rather than injecting a token, because the
 * session handling — token storage, the refresh path, the redirect on expiry — is part of what
 * these tests exist to cover.
 */
export const DEMO = {
  admin: 'admin@generationb.dev',
  director: 'director@generationb.dev',
  accountManager: 'am@generationb.dev',
  password: 'Password123!',
};

export async function signIn(page: Page, email = DEMO.admin) {
  await page.goto('/login');
  await page.getByLabel(/email or username/i).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(DEMO.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/** A page that is already signed in as the given role. */
export const test = base.extend<{ adminPage: Page; directorPage: Page }>({
  adminPage: async ({ page }, use) => {
    await signIn(page, DEMO.admin);
    await use(page);
  },
  directorPage: async ({ page }, use) => {
    await signIn(page, DEMO.director);
    await use(page);
  },
});

export { expect };
