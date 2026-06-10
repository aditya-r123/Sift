import { type Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { countSwipeRpcs, seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

const discoverTracks = [
  {
    spotify_track_id: 'discover-one',
    rank: 1,
    name: 'First Signal',
    artist: 'Nova Lane',
    album: 'Test Patterns',
    release_year: 2026,
    duration_ms: 190000,
    cover_url: null,
    energy: 0.81,
    danceability: 0.72,
    valence: 0.62,
    acousticness: 0.1,
    speechiness: 0.05,
  },
  {
    spotify_track_id: 'discover-two',
    rank: 2,
    name: 'Second Pass',
    artist: 'Echo Unit',
    album: 'Test Patterns',
    release_year: 2025,
    duration_ms: 210000,
    cover_url: null,
    energy: 0.32,
    danceability: 0.46,
    valence: 0.4,
    acousticness: 0.58,
    speechiness: 0.03,
  },
  {
    spotify_track_id: 'discover-three',
    rank: 3,
    name: 'Third Door',
    artist: 'Pulse Map',
    album: 'Test Patterns',
    release_year: 2024,
    duration_ms: 170000,
    cover_url: null,
    energy: 0.66,
    danceability: 0.64,
    valence: 0.7,
    acousticness: 0.16,
    speechiness: 0.13,
  },
];

type DiscoverSeedOptions = {
  tracks?: typeof discoverTracks;
  rpcDelayMs?: number;
};

async function seedDiscover(page: Page, options: DiscoverSeedOptions = {}) {
  const tracks = options.tracks ?? discoverTracks;

  await seedAuthenticatedSession(page, {
    tables: { top_tracks: tracks, swipes: [] },
    rpcResults: { get_discover_batch: { data: [] } },
    rpcDelayMs: options.rpcDelayMs,
    trackLikedEvents: true,
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  // wait for first song to be visible
  await expect(page.locator('#panel-discover .sift-card-copy h3').filter({ hasText: 'First Signal' })).toBeVisible();
}

test('discover like and pass buttons persist swipe decisions', async ({ page }) => {
  await seedDiscover(page);

  await page.locator('#panel-discover .sift-card-actions button[aria-label="Like"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.some(
          (call) =>
            call.name === 'record_swipe_and_update_taste' &&
            call.params.p_song_id === 'discover-one' &&
            call.params.p_source === 'DISCOVER' &&
            call.params.p_direction === 'YES'
        )
      )
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_LIKED_EVENTS__?.some(
          (event) => event.kind === 'added' && event.song.id === 'discover-one' && event.source === 'DISCOVER'
        )
      )
    )
    .toBe(true);

  await page.locator('#panel-discover .sift-card-actions button[aria-label="Pass"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.some(
          (call) =>
            call.name === 'record_swipe_and_update_taste' &&
            call.params.p_song_id === 'discover-two' &&
            call.params.p_source === 'DISCOVER' &&
            call.params.p_direction === 'NO'
        )
      )
    )
    .toBe(true);
});

test('discover arrow keys mirror like and pass swipes', async ({ page }) => {
  await seedDiscover(page);

  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.some(
          (call) => call.params.p_song_id === 'discover-one' && call.params.p_direction === 'YES'
        )
      )
    )
    .toBe(true);

  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.some(
          (call) => call.params.p_song_id === 'discover-two' && call.params.p_direction === 'NO'
        )
      )
    )
    .toBe(true);
});
