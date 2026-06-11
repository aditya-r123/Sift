import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

const catalogTrack = {
  spotify_track_id: 'catalog-one',
  rank: 1,
  name: 'Fallback Anthem',
  artist: 'Safety Net',
  album: 'Backup Plan',
  release_year: 2026,
  duration_ms: 195000,
  cover_url: null,
  energy: 0.6,
  danceability: 0.55,
  valence: 0.5,
  acousticness: 0.3,
  speechiness: 0.05,
};

test('Discover falls back to the catalog when get_discover_batch errors', async ({ page }) => {
  await seedAuthenticatedSession(page, {
    tables: { top_tracks: [catalogTrack], swipes: [] },
    rpcResults: { get_discover_batch: { error: { message: 'discover rpc boom' } } },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');

  await expect(
    page.locator('#panel-discover .sift-card-copy h3').filter({ hasText: 'Fallback Anthem' })
  ).toBeVisible();
});

test('Explore falls back to the catalog when get_explore_batch errors', async ({ page }) => {
  await seedAuthenticatedSession(page, {
    tables: { top_tracks: [catalogTrack], swipes: [] },
    rpcResults: { get_explore_batch: { error: { message: 'explore rpc boom' } } },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Explore' }).click();

  await expect(
    page.locator('#panel-explore .sift-card-copy h3').filter({ hasText: 'Fallback Anthem' })
  ).toBeVisible();
});

test('Explore shows an empty state when the batch and catalog are both empty', async ({ page }) => {
  await seedAuthenticatedSession(page, {
    tables: { top_tracks: [], swipes: [] },
    rpcResults: { get_explore_batch: { data: [] } },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Explore' }).click();

  await expect(page.getByText('No more songs to explore!')).toBeVisible();
});

test('Discover stays usable when the batch and catalog are both empty', async ({ page }) => {
  await seedAuthenticatedSession(page, {
    tables: { top_tracks: [], swipes: [] },
    rpcResults: { get_discover_batch: { data: [] } },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');

  await expect(page.locator('#panel-discover h1')).toHaveText('Discover');
  await expect(page.locator('#panel-discover .sift-card-copy h3')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Explore' }).click();
  await expect(page.locator('#panel-explore')).toBeVisible();
});
