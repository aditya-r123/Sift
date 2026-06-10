import { expect, test } from '@playwright/test';

test('unauthenticated users see sign in / sign up page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Sign in to Sift' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeHidden();

  await page.getByRole('tab', { name: 'Sign up' }).click();
  await expect(page.getByRole('tab', { name: 'Sign up' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  await expect(page.getByLabel('Name')).toBeVisible();

  await page.getByRole('tab', { name: 'Sign in' }).click();
  const signInPanel = page.locator('#auth-panel-signin');
  await signInPanel.getByLabel('Email').fill('person@example.com');
  await signInPanel.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
});
