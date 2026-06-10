import { expect, test } from '@playwright/test';

import {
  formatDuration,
  loadCardCoverMedia,
  loadGeneratedSongs,
  loadTrackPreview,
  mergeSongMedia,
  tagsForTrack,
} from '../../src/trackCards';
import type { Song } from '../../src/types';

type TopTrackFixture = {
  spotify_track_id: string;
  rank: number;
  name: string;
  artist: string;
  album: string;
  release_year: number | null;
  duration_ms: number | null;
  cover_url: string | null;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  acousticness: number | null;
  speechiness: number | null;
};

function makeTrack(overrides: Partial<TopTrackFixture> = {}): TopTrackFixture {
  return {
    spotify_track_id: 'track-default',
    rank: 99,
    name: 'Fixture Track',
    artist: 'Fixture Artist',
    album: 'Fixture Album',
    release_year: 2024,
    duration_ms: 180000,
    cover_url: null,
    energy: null,
    danceability: null,
    valence: null,
    acousticness: null,
    speechiness: null,
    ...overrides,
  };
}

// [GenAI Use] Prompt: "The trackCards unit tests need a reusable baseline Song fixture for testing mergeSongMedia. Ensure all of the proper fields of a song are included."
// [GenAI Use] LLM Response Start
const baseSong: Song = {
  id: 'track-1',
  title: 'Original Title',
  artist: 'Original Artist',
  album: 'Original Album',
  releaseYear: 2024,
  durationMs: 90_000,
  features: { energy: 0.4, danceability: 0.7 },
  tags: ['Discover'],
  color: '#14b8a6',
  coverImage: 'original.jpg',
  previewUrl: 'original.mp3',
};
// [GenAI Use] LLM Response End
// [GenAI Use] Reflection: I checked that this fixture covers all of the fields that are required by Song, and thus works with mergeSongMedia.

test.describe('track card formatting', () => {
  test('formats duration boundaries and absent values', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(1_000)).toBe('0:01');
    expect(formatDuration(59_500)).toBe('1:00');
    expect(formatDuration(185_000)).toBe('3:05');
  });

  test('merges media with more metadata without any loss', () => {
    const merged = mergeSongMedia(baseSong, {
      title: 'Updated Title',
      artist: 'Artist A; Artist B',
      album: 'Updated Album',
      releaseYear: 2025,
      durationMs: 123_000,
      coverImage: 'updated.jpg',
      previewUrl: 'updated.mp3',
    });

    expect(merged).toMatchObject({
      title: 'Updated Title',
      artist: 'Artist A, Artist B',
      album: 'Updated Album',
      releaseYear: 2025,
      durationMs: 123_000,
      tags: ['Discover'],
      color: '#14b8a6',
      coverImage: 'updated.jpg',
      previewUrl: 'updated.mp3',
    });
    expect(merged.features).toBe(baseSong.features);
  });

  test('mergeSongMedia avoids overwriting existing metadata with empty/null fields', () => {
    expect(mergeSongMedia(baseSong, undefined)).toBe(baseSong);

    const merged = mergeSongMedia(baseSong, {
      title: '',
      artist: '',
      album: '',
      releaseYear: null,
      durationMs: null,
      coverImage: '',
      previewUrl: '',
    });

    expect(merged.title).toBe(baseSong.title);
    expect(merged.artist).toBe(baseSong.artist);
    expect(merged.album).toBe(baseSong.album);
    expect(merged.releaseYear).toBe(baseSong.releaseYear);
    expect(merged.durationMs).toBe(baseSong.durationMs);
    expect(merged.coverImage).toBe(baseSong.coverImage);
    expect(merged.previewUrl).toBe(baseSong.previewUrl);
  });
});

test.describe('track card media loading', () => {
  test.afterEach(() => {
    Reflect.deleteProperty(globalThis, 'fetch');
  });

  test('loads preview only when track is present', async () => {
    globalThis.fetch = async (input) =>
      new Response(
        JSON.stringify({
          // [GenAI Use] Prompt: "Create a realistic API payload of tracks that includes an id and previewUrl for each track."
          // [GenAI Use] LLM Response Start
          tracks: [
            { id: 'other-track', previewUrl: 'https://cdn.example/other.mp3' },
            { id: 'track-1', previewUrl: 'https://cdn.example/track-1.mp3' },
          ],
          // [GenAI Use] LLM Response End
          // [GenAI Use] Reflection: I verified that the tracks API payload covers all of the fields that are required for loadTrackPreview.
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    await expect(loadTrackPreview('track-1')).resolves.toBe('https://cdn.example/track-1.mp3');
    await expect(loadTrackPreview('missing-track')).resolves.toBeUndefined();
  });

  test('if preview loading fails, undefined is returned', async () => {
    globalThis.fetch = async () => new Response('{}', { status: 503 });

    await expect(loadTrackPreview('track-1')).resolves.toBeUndefined();

    globalThis.fetch = async () => {
      throw new Error('network down');
    };
    await expect(loadTrackPreview('track-1')).resolves.toBeUndefined();
  });

  test('loads map ids from successful responses to cover images', async () => {
    const requestedUrls: string[] = [];
    globalThis.fetch = async (input) => {
      requestedUrls.push(String(input));
      return new Response(
        JSON.stringify({
          tracks: [
            { id: 'track-a', coverImage: 'a.jpg' },
            { id: 'track-b', coverImage: 'b.jpg' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const media = await loadCardCoverMedia(['track-a', 'track-b']);

    expect(requestedUrls).toEqual(['/api/tracks?ids=track-a%2Ctrack-b']);
    expect(media.get('track-a')?.coverImage).toBe('a.jpg');
    expect(media.get('track-b')?.coverImage).toBe('b.jpg');
  });
});

test.describe('track tag derivation', () => {
  test('crossing score thresholds assigns tags', () => {
    expect(
      tagsForTrack(
        makeTrack({
          rank: 12,
          energy: 0.81,
          danceability: 0.72,
          valence: 0.7,
          acousticness: 0.1,
          speechiness: 0.14,
        })
      )
    ).toEqual(['Popular', 'Energy', 'Danceability', 'Upbeat', 'Produced', 'Vocal']);
  });

  test('if no thresholds match, fallback to Discover tag', () => {
    expect(
      tagsForTrack(
        makeTrack({
          rank: 80,
          energy: 0.2,
          danceability: 0.3,
          valence: 0.4,
          acousticness: 0.5,
          speechiness: 0.05,
        })
      )
    ).toEqual(['Discover']);
  });
});

test.describe('loadGeneratedSongs', () => {
  test.afterEach(() => {
    Reflect.deleteProperty(globalThis, '__SIFT_TEST_SUPABASE_TABLES__');
  });

  test('converts top_tracks rows into songs with derived tags', async () => {
    (globalThis as Window).__SIFT_TEST_SUPABASE_TABLES__ = {
      top_tracks: [
        makeTrack({
          spotify_track_id: 'high-energy',
          rank: 3,
          name: 'High Energy',
          energy: 0.9,
          danceability: 0.75,
          acousticness: 0.05,
        }),
        makeTrack({
          spotify_track_id: 'plain-track',
          rank: 80,
          name: 'Plain Track',
        }),
      ],
    };

    const songs = await loadGeneratedSongs();

    expect(songs).toHaveLength(2);
    expect(songs[0]).toMatchObject({
      id: 'high-energy',
      title: 'High Energy',
    });
    expect(songs[0].tags).toEqual(expect.arrayContaining(['Popular', 'Energy', 'Danceability', 'Produced']));
    expect(songs[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(songs[1]).toMatchObject({
      id: 'plain-track',
      title: 'Plain Track',
      tags: ['Discover'],
    });
  });

  test('returns no songs when top_tracks is empty', async () => {
    (globalThis as Window).__SIFT_TEST_SUPABASE_TABLES__ = { top_tracks: [] };

    await expect(loadGeneratedSongs()).resolves.toEqual([]);
  });

  test('limits the number of generated songs returned', async () => {
    (globalThis as Window).__SIFT_TEST_SUPABASE_TABLES__ = {
      top_tracks: [
        makeTrack({ spotify_track_id: 'one', rank: 1, name: 'One' }),
        makeTrack({ spotify_track_id: 'two', rank: 2, name: 'Two' }),
        makeTrack({ spotify_track_id: 'three', rank: 3, name: 'Three' }),
      ],
    };

    const songs = await loadGeneratedSongs(2);

    expect(songs).toHaveLength(2);
    expect(songs.map((song) => song.id)).toEqual(['one', 'two']);
  });
});
