import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedSession(page);
  await stubCommonApiRoutes(page);
});

test('authenticated users skip login', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#login-page')).toBeHidden();
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pranay Boreddy profile' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Connect Spotify/i }).first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Discover' })).toHaveAttribute('aria-selected', 'true');
});

test('tab switching works with click and arrow keys', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('tab', { name: 'View Profile' }).click();
  await expect(page.getByRole('tab', { name: 'View Profile' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Connect Spotify to see your profile')).toBeVisible();

  await page.getByRole('tab', { name: 'View Profile' }).press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Liked Songs' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Liked Songs' })).toBeVisible();

  await page.getByRole('tab', { name: 'Liked Songs' }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'View Profile' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Connect Spotify to see your profile')).toBeVisible();
});
