import { type Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { likedRows, likedTopTracks } from './fixtures/liked-songs';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

async function openLikedSongs(page: Page, swipes = likedRows) {
  await seedAuthenticatedSession(page, {
    tables: { swipes, top_tracks: likedTopTracks },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Liked Songs' }).click();
}

test('liked songs display newest first', async ({ page }) => {
  await openLikedSongs(page);

  await expect(page.getByText('3 right-swipes saved')).toBeVisible();
  await expect(page.getByText('3 songs')).toBeVisible();
  await expect(page.locator('.liked-card h3')).toHaveText(['Zero Hour', 'Amber Light', 'Cinder Road']);
});

test('liked songs can be searched, filtered, and sorted', async ({ page }) => {
  await openLikedSongs(page);
  const controls = page.locator('#panel-liked select');
  const artistSelect = controls.nth(0);
  const yearSelect = controls.nth(1);
  const sortSelect = controls.nth(2);

  await page.getByPlaceholder('Search songs, artists, albums, or years...').fill('Gamma');
  await expect(page.locator('.liked-card h3')).toHaveText(['Cinder Road']);
  await expect(page.getByText('1 of 3 songs')).toBeVisible();

  await page.getByPlaceholder('Search songs, artists, albums, or years...').fill('');
  await artistSelect.selectOption('Alpha Artist');
  await expect(page.locator('.liked-card h3')).toHaveText(['Amber Light']);

  await artistSelect.selectOption('all');
  await yearSelect.selectOption('2021');
  await expect(page.locator('.liked-card h3')).toHaveText(['Cinder Road']);

  await yearSelect.selectOption('all');
  await sortSelect.selectOption('song');
  await expect(page.locator('.liked-card h3')).toHaveText(['Amber Light', 'Cinder Road', 'Zero Hour']);
});

test('liked songs tab displays if empty or no match is visible', async ({ page }) => {
  await openLikedSongs(page, []);

  await expect(page.getByText('0 right-swipes saved')).toBeVisible();
  await expect(page.getByText('No right-swipes yet. Like songs in Discover or Explore to build this list.')).toBeVisible();

  await openLikedSongs(page, likedRows);
  await page.getByPlaceholder('Search songs, artists, albums, or years...').fill('not-present');
  await expect(page.getByText('No liked songs match your filters.')).toBeVisible();
});

test('liked songs can properly remove a song', async ({ page }) => {
  await openLikedSongs(page);

  await page.getByRole('button', { name: 'Remove Zero Hour from liked songs' }).click();

  await expect(page.getByText('Zero Hour was removed from Liked Songs and can show up again in Discover or Explore.')).toBeVisible();
  await expect(page.getByText('2 right-swipes saved')).toBeVisible();
  await expect(page.locator('.liked-card h3')).toHaveText(['Amber Light', 'Cinder Road']);
});
