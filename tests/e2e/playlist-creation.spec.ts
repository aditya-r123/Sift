import { type Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { likedRows, likedTopTracks } from './fixtures/liked-songs';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

async function openLikedSongs(page: Page) {
  await seedAuthenticatedSession(page, {
    tables: { swipes: likedRows, top_tracks: likedTopTracks },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Liked Songs' }).click();
  await expect(page.getByRole('button', { name: 'Make playlist' })).toBeEnabled();
}

test('creating a Spotify playlist shows success and a link', async ({ page }) => {
  await openLikedSongs(page);

  let sentTrackIds: unknown = null;
  await page.route('**/api/liked-songs-playlist', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    sentTrackIds = (route.request().postDataJSON() as { trackIds?: unknown }).trackIds;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        playlistId: 'pl-123',
        playlistUrl: 'https://open.spotify.com/playlist/pl-123',
        trackCount: 3,
        addedTrackCount: 3,
      }),
    });
  });

  await page.getByRole('button', { name: 'Make playlist' }).click();

  await expect(page.getByText('Created Spotify playlist with 3 songs.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Spotify playlist' })).toBeVisible();

  expect(Array.isArray(sentTrackIds)).toBe(true);
  expect((sentTrackIds as string[]).length).toBe(3);
});

test('a 401 from playlist creation surfaces a Reconnect Spotify prompt', async ({ page }) => {
  await openLikedSongs(page);

  await page.route('**/api/liked-songs-playlist', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Reconnect Spotify so Sift can request permission to create private playlists.',
        reconnectSpotify: true,
      }),
    });
  });

  await page.getByRole('button', { name: 'Make playlist' }).click();

  await expect(
    page.getByText('Reconnect Spotify so Sift can request permission to create private playlists.')
  ).toBeVisible();
  const reconnect = page.getByRole('link', { name: 'Reconnect Spotify' });
  await expect(reconnect).toBeVisible();
  await expect(reconnect).toHaveAttribute('href', '/auth/login');
});

test('a failed playlist creation surfaces the error message', async ({ page }) => {
  await openLikedSongs(page);

  await page.route('**/api/liked-songs-playlist', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Spotify did not return a playlist id.' }),
    });
  });

  await page.getByRole('button', { name: 'Make playlist' }).click();

  await expect(page.getByText('Spotify did not return a playlist id.')).toBeVisible();
});
