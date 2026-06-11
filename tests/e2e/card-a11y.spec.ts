import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

const COVER_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const cardTrack = {
  spotify_track_id: 'a11y-one',
  rank: 1,
  name: 'Accessible Anthem',
  artist: 'Aria Roles',
  album: 'Label Maker',
  release_year: 2026,
  duration_ms: 198000,
  cover_url: COVER_DATA_URI,
  energy: 0.8,
  danceability: 0.7,
  valence: 0.62,
  acousticness: 0.1,
  speechiness: 0.05,
};

async function openDiscoverCard(page: import('@playwright/test').Page) {
  await seedAuthenticatedSession(page, {
    tables: { top_tracks: [cardTrack], swipes: [] },
    rpcResults: { get_discover_batch: { data: [] } },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  await expect(
    page.locator('#panel-discover .sift-card-copy h3').filter({ hasText: 'Accessible Anthem' })
  ).toBeVisible();
}

test('card controls expose accessible names', async ({ page }) => {
  await openDiscoverCard(page);
  const card = page.locator('#panel-discover');

  await expect(card.getByRole('button', { name: 'Like' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Pass' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Play preview' })).toBeVisible();

  await expect(card.locator('img.sift-cover-image')).toHaveAttribute('alt', 'Accessible Anthem cover');
  await expect(card.locator('[aria-label="Audio profile"]')).toBeVisible();
});

test('card and its controls fit and work on a mobile viewport', async ({ page }) => {
  await openDiscoverCard(page);

  const frame = page.locator('#panel-discover .sift-deck-frame');
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);

  const like = page.locator('#panel-discover .sift-card-actions button[aria-label="Like"]');
  const pass = page.locator('#panel-discover .sift-card-actions button[aria-label="Pass"]');
  await like.scrollIntoViewIfNeeded();
  await expect(like).toBeInViewport();
  await expect(pass).toBeVisible();

  await like.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.some(
          (call) =>
            call.name === 'record_swipe_and_update_taste' &&
            call.params.p_song_id === 'a11y-one' &&
            call.params.p_direction === 'YES'
        )
      )
    )
    .toBe(true);
});
