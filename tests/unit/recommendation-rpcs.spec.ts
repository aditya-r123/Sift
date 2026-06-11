import { expect, test } from '@playwright/test';
import type { Session } from '@supabase/supabase-js';

import { recordSwipeAndUpdateTaste } from '../../src/recommendations.js';
import { loadDiscoverRecommendationSongs, loadExploreRecommendationSongs } from '../../src/trackCards.js';
import type { Song } from '../../src/types.js';

const TEST_USER_ID = 'user-1';

type FeatureKey = 'energy' | 'danceability' | 'valence' | 'acousticness' | 'speechiness';

const FEATURE_KEYS: FeatureKey[] = ['energy', 'danceability', 'valence', 'acousticness', 'speechiness'];

type TopTrackFixture = {
  spotify_track_id: string;
  rank: number;
  name: string;
  artist: string;
  album: string;
  release_year: number | null;
  duration_ms: number | null;
  cover_url: string | null;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  speechiness: number;
};

type TasteProfileFixture = {
  user_id: string;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  speechiness: number;
  swipe_count: number;
};

type SeedOptions = {
  topTracks: TopTrackFixture[];
  tasteProfiles?: TasteProfileFixture[];
  swipes?: Array<Record<string, unknown>>;
  friends?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  exploreAxis?: FeatureKey;
};

// [GenAI Use] Prompt: "Create compact recommendation RPC fixtures that include full top_tracks rows and neutral taste
// profile defaults, so tests can focus on ranking and swipe/taste behavior instead of repetitive setup."
// [GenAI Use] LLM Response Start
function makeTrack(overrides: Partial<TopTrackFixture> = {}): TopTrackFixture {
  return {
    spotify_track_id: 'track-default',
    rank: 100,
    name: 'Fixture Track',
    artist: 'Fixture Artist',
    album: 'Fixture Album',
    release_year: 2026,
    duration_ms: 180_000,
    cover_url: null,
    energy: 0.5,
    danceability: 0.5,
    valence: 0.5,
    acousticness: 0.5,
    speechiness: 0.5,
    ...overrides,
  };
}

function makeTasteProfile(overrides: Partial<TasteProfileFixture> = {}): TasteProfileFixture {
  return {
    user_id: TEST_USER_ID,
    energy: 0.5,
    danceability: 0.5,
    valence: 0.5,
    acousticness: 0.5,
    speechiness: 0.5,
    swipe_count: 0,
    ...overrides,
  };
}
// [GenAI Use] LLM Response End
// [GenAI Use] Reflection: The fixtures match the columns used by the recommendation SQL and by trackCards.ts.

test.describe.configure({ mode: 'serial' });

test.afterEach(() => {
  const host = globalThis as unknown as Window;
  Reflect.deleteProperty(host, '__SIFT_TEST_SUPABASE_SESSION__');
  Reflect.deleteProperty(host, '__SIFT_TEST_SUPABASE_TABLES__');
  Reflect.deleteProperty(host, '__SIFT_TEST_SUPABASE_RPC_CALLS__');
  Reflect.deleteProperty(host, '__SIFT_TEST_SUPABASE_RPC_RESULTS__');
  Reflect.deleteProperty(host, '__SIFT_TEST_SUPABASE_EXPLORE_AXIS__');
});

function seedRecommendationState(options: SeedOptions) {
  const host = globalThis as unknown as Window;
  const session: Session = {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: TEST_USER_ID,
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
      email: 'person@example.com',
      user_metadata: {},
    },
  };

  host.__SIFT_TEST_SUPABASE_SESSION__ = session;
  host.__SIFT_TEST_SUPABASE_TABLES__ = {
    top_tracks: options.topTracks,
    taste_profiles: options.tasteProfiles ?? [],
    swipes: options.swipes ?? [],
    friends: options.friends ?? [],
    profiles: options.profiles ?? [],
  };
  host.__SIFT_TEST_SUPABASE_RPC_CALLS__ = [];
  if (options.exploreAxis) host.__SIFT_TEST_SUPABASE_EXPLORE_AXIS__ = options.exploreAxis;
}

function tableRows(tableName: string): Array<Record<string, unknown>> {
  const host = globalThis as unknown as Window;
  return host.__SIFT_TEST_SUPABASE_TABLES__?.[tableName] ?? [];
}

function rpcRows(result: { data: unknown }): Array<Record<string, unknown>> {
  return result.data as Array<Record<string, unknown>>;
}

function ema(current: number, songFeature: number, alpha = 0.1) {
  return (1 - alpha) * current + alpha * songFeature;
}

test('record_swipe_and_update_taste records a YES swipe and updates taste once', async () => {
  seedRecommendationState({
    topTracks: [
      makeTrack({
        spotify_track_id: 'liked-song',
        energy: 0.9,
        danceability: 0.7,
        valence: 0.2,
        acousticness: 0.1,
        speechiness: 0.4,
      }),
    ],
    tasteProfiles: [makeTasteProfile()],
  });

  const result = await recordSwipeAndUpdateTaste('liked-song', 'DISCOVER', 'right');

  expect(result.error).toBeNull();
  expect(rpcRows(result)[0]).toMatchObject({
    out_recorded: true,
    out_profile_updated: true,
    out_song_id: 'liked-song',
    out_source: 'DISCOVER',
    out_direction: 'YES',
    out_swipe_count: 1,
  });
  expect(tableRows('swipes')[0]).toMatchObject({
    user_id: TEST_USER_ID,
    song_id: 'liked-song',
    source: 'DISCOVER',
    direction: 'YES',
  });

  const profile = tableRows('taste_profiles')[0];
  expect(profile.energy).toBeCloseTo(0.54);
  expect(profile.danceability).toBeCloseTo(0.52);
  expect(profile.valence).toBeCloseTo(0.47);
  expect(profile.acousticness).toBeCloseTo(0.46);
  expect(profile.speechiness).toBeCloseTo(0.49);
});

test('multiple YES swipes fold into the taste profile with the EMA calculation', async () => {
  const first = makeTrack({
    spotify_track_id: 'first-like',
    energy: 0.9,
    danceability: 0.8,
    valence: 0.7,
    acousticness: 0.2,
    speechiness: 0.3,
  });
  const second = makeTrack({
    spotify_track_id: 'second-like',
    energy: 0.2,
    danceability: 0.3,
    valence: 0.4,
    acousticness: 0.9,
    speechiness: 0.7,
  });
  seedRecommendationState({ topTracks: [first, second] });

  await recordSwipeAndUpdateTaste('first-like', 'DISCOVER', 'right');
  await recordSwipeAndUpdateTaste('second-like', 'EXPLORE', 'right');

  const expected = Object.fromEntries(FEATURE_KEYS.map((key) => [key, 0.5])) as Record<FeatureKey, number>;
  for (const track of [first, second]) {
    for (const key of FEATURE_KEYS) expected[key] = ema(expected[key], track[key]);
  }

  const profile = tableRows('taste_profiles')[0];
  for (const key of FEATURE_KEYS) expect(profile[key]).toBeCloseTo(expected[key]);
  expect(profile.swipe_count).toBe(2);
  expect(tableRows('swipes').map((row) => row.song_id)).toEqual(['first-like', 'second-like']);
});

test('duplicate swipes keep the first decision and do not update taste twice', async () => {
  seedRecommendationState({
    topTracks: [
      makeTrack({
        spotify_track_id: 'duplicate-song',
        energy: 1,
        danceability: 1,
        valence: 1,
        acousticness: 0,
        speechiness: 0,
      }),
    ],
  });

  const first = await recordSwipeAndUpdateTaste('duplicate-song', 'DISCOVER', 'right');
  const duplicate = await recordSwipeAndUpdateTaste('duplicate-song', 'EXPLORE', 'left');

  expect(rpcRows(first)[0]).toMatchObject({ out_recorded: true, out_profile_updated: true });
  expect(rpcRows(duplicate)[0]).toMatchObject({ out_recorded: false, out_profile_updated: false });
  expect(tableRows('swipes')).toHaveLength(1);
  expect(tableRows('swipes')[0]).toMatchObject({
    song_id: 'duplicate-song',
    source: 'DISCOVER',
    direction: 'YES',
  });
  expect(tableRows('taste_profiles')[0].swipe_count).toBe(1);
});

test('get_discover_batch returns the closest un-swiped songs by weighted distance', async () => {
  seedRecommendationState({
    tasteProfiles: [
      makeTasteProfile({
        energy: 0.8,
        danceability: 0.7,
        valence: 0.5,
        acousticness: 0.2,
        speechiness: 0.1,
      }),
    ],
    topTracks: [
      makeTrack({
        spotify_track_id: 'closest',
        name: 'Closest Match',
        energy: 0.82,
        danceability: 0.69,
        valence: 0.51,
        acousticness: 0.21,
        speechiness: 0.11,
      }),
      makeTrack({
        spotify_track_id: 'second-closest',
        name: 'Second Closest',
        energy: 0.7,
        danceability: 0.6,
        valence: 0.5,
        acousticness: 0.25,
        speechiness: 0.1,
      }),
      makeTrack({
        spotify_track_id: 'far-away',
        name: 'Far Away',
        energy: 0.1,
        danceability: 0.1,
        valence: 0.9,
        acousticness: 0.9,
        speechiness: 0.9,
      }),
    ],
  });

  const songs: Song[] = await loadDiscoverRecommendationSongs(TEST_USER_ID, 2);

  expect(songs.map((song) => song.id)).toEqual(['closest', 'second-closest']);
  expect(songs[0].tags).toEqual(expect.arrayContaining(['Taste Match']));
  expect(songs.map((song) => song.id)).not.toContain('far-away');
});

test('get_discover_batch reserves a friend_like pick from accepted friend YES swipes', async () => {
  seedRecommendationState({
    tasteProfiles: [makeTasteProfile()],
    topTracks: [
      makeTrack({ spotify_track_id: 'friend-pick', name: 'Friend Pick', energy: 0.1 }),
      makeTrack({ spotify_track_id: 'regular-pick', name: 'Regular Pick', energy: 0.5 }),
    ],
    friends: [
      {
        id: 'friend-row',
        requester_id: TEST_USER_ID,
        addressee_id: 'friend-1',
        status: 'accepted',
      },
    ],
    profiles: [{ id: 'friend-1', display_name: 'Jalen Brunson' }],
    swipes: [
      {
        id: 'friend-swipe',
        user_id: 'friend-1',
        song_id: 'friend-pick',
        source: 'DISCOVER',
        direction: 'YES',
        // [GenAI Use] Prompt: "Add a swiped_at timestamp to the friend-swipe row."
        // [GenAI Use] LLM Response Start
        swiped_at: '2026-06-10T18:00:00.000Z',
        // [GenAI Use] LLM Response End
        // [GenAI Use] Reflection: The generated time stamp is complicated, so makes sense to use it here.
      },
    ],
  });

  const songs: Song[] = await loadDiscoverRecommendationSongs(TEST_USER_ID, 2);
  const friendSong = songs.find((song) => song.id === 'friend-pick');

  expect(friendSong).toBeDefined();
  expect(friendSong?.tags).toEqual(expect.arrayContaining(['Friend: Jalen Brunson']));
  expect(songs.map((song) => song.id)).toContain('regular-pick');
});

test('get_explore_batch ranks against the inverted taste axis and excludes seen songs', async () => {
  seedRecommendationState({
    exploreAxis: 'energy',
    tasteProfiles: [
      makeTasteProfile({
        energy: 0.9,
        danceability: 0.4,
        valence: 0.4,
        acousticness: 0.4,
        speechiness: 0.4,
      }),
    ],
    swipes: [
      {
        id: 'seen-swipe',
        user_id: TEST_USER_ID,
        song_id: 'seen-perfect-opposite',
        direction: 'NO',
        source: 'EXPLORE',
      },
    ],
    topTracks: [
      makeTrack({
        spotify_track_id: 'seen-perfect-opposite',
        energy: 0.1,
        danceability: 0.4,
        valence: 0.4,
        acousticness: 0.4,
        speechiness: 0.4,
      }),
      makeTrack({
        spotify_track_id: 'best-open-opposite',
        energy: 0.12,
        danceability: 0.41,
        valence: 0.39,
        acousticness: 0.4,
        speechiness: 0.4,
      }),
      makeTrack({
        spotify_track_id: 'same-energy',
        energy: 0.9,
        danceability: 0.4,
        valence: 0.4,
        acousticness: 0.4,
        speechiness: 0.4,
      }),
    ],
  });

  const songs: Song[] = await loadExploreRecommendationSongs(TEST_USER_ID, 1);

  expect(songs.map((song) => song.id)).toEqual(['best-open-opposite']);
  expect(songs[0].tags).toEqual(expect.arrayContaining(['Explore', 'Opposite Energy']));
});
