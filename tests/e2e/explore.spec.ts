import { type Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

const exploreTracks = [
  {
    spotify_track_id: 'explore-one',
    rank: 1,
    name: 'Map Light',
    artist: 'Atlas Room',
    album: 'Open Road',
    release_year: 2026,
    duration_ms: 180000,
    cover_url: null,
    energy: 0.77,
    danceability: 0.7,
    valence: 0.66,
    acousticness: 0.12,
    speechiness: 0.03,
  },
  {
    spotify_track_id: 'explore-two',
    rank: 2,
    name: 'Quiet Exit',
    artist: 'Signal Fade',
    album: 'Open Road',
    release_year: 2025,
    duration_ms: 201000,
    cover_url: null,
    energy: 0.44,
    danceability: 0.4,
    valence: 0.36,
    acousticness: 0.62,
    speechiness: 0.02,
  },
];

async function seedExplore(page: Page, tracks = exploreTracks) {
  await seedAuthenticatedSession(page, {
    tables: { top_tracks: tracks, swipes: [] },
    rpcResults: { get_explore_batch: { data: [] } },
    trackLikedEvents: true,
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Explore' }).click();
}

test('explore swipes persist', async ({ page }) => {
  await seedExplore(page);
  await expect(page.locator('#panel-explore .sift-card-copy h3').filter({ hasText: 'Map Light' })).toBeVisible();

  await page.locator('#panel-explore .sift-card-actions button[aria-label="Like"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.some(
          (call) =>
            call.name === 'record_swipe_and_update_taste' &&
            call.params.p_song_id === 'explore-one' &&
            call.params.p_source === 'EXPLORE' &&
            call.params.p_direction === 'YES'
        )
      )
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_LIKED_EVENTS__?.some(
          (event) => event.kind === 'added' && event.song.id === 'explore-one' && event.source === 'EXPLORE'
        )
      )
    )
    .toBe(true);

  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.some(
          (call) =>
            call.name === 'record_swipe_and_update_taste' &&
            call.params.p_song_id === 'explore-two' &&
            call.params.p_source === 'EXPLORE' &&
            call.params.p_direction === 'NO'
        )
      )
    )
    .toBe(true);
});

test('explore has empty state when no recommended songs', async ({ page }) => {
  await seedExplore(page, []);

  await expect(page.getByText('No more songs to explore!')).toBeVisible();
});
