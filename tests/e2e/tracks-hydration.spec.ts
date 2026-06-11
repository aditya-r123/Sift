import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

const COVER_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const uncoveredTrack = {
  spotify_track_id: 'hydrate-one',
  rank: 1,
  name: 'Cover Pending',
  artist: 'Lazy Loader',
  album: 'Streamed In',
  release_year: 2026,
  duration_ms: 200000,
  cover_url: null,
  energy: 0.6,
  danceability: 0.55,
  valence: 0.5,
  acousticness: 0.3,
  speechiness: 0.05,
};

test('card cover art is hydrated from /api/tracks', async ({ page }) => {
  await seedAuthenticatedSession(page, {
    tables: { top_tracks: [uncoveredTrack], swipes: [] },
    rpcResults: { get_discover_batch: { data: [] } },
  });
  await stubCommonApiRoutes(page);

  const requestedIds: string[] = [];
  await page.route('**/api/tracks?**', async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('ids') ?? '';
    requestedIds.push(...ids.split(',').filter(Boolean));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        tracks: [
          {
            id: 'hydrate-one',
            coverImage: COVER_DATA_URI,
            album: 'Streamed In',
            releaseYear: 2026,
            durationMs: 200000,
          },
        ],
      }),
    });
  });

  await page.goto('/');

  await expect(
    page.locator('#panel-discover .sift-card-copy h3').filter({ hasText: 'Cover Pending' })
  ).toBeVisible();

  const cover = page.locator('#panel-discover img.sift-cover-image');
  await expect(cover).toBeVisible();
  await expect(cover).toHaveAttribute('src', COVER_DATA_URI);
  await expect(cover).toHaveAttribute('alt', 'Cover Pending cover');

  expect(requestedIds).toContain('hydrate-one');
});
