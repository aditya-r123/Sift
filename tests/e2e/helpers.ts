import type { Session } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

export const TEST_USER = {
  id: 'user-1',
  email: 'pranay@example.com',
  display_name: 'Pranay Boreddy',
} as const;

export type SeedTables = Record<string, Array<Record<string, unknown>>>;

export type SeedOptions = {
  tables?: SeedTables;
  rpcResults?: Record<string, { data?: unknown; error?: { message: string } | null }>;
  rpcDelayMs?: number;
  trackLikedEvents?: boolean;
};

export async function seedAuthenticatedSession(page: Page, options: SeedOptions = {}) {
  const { tables, rpcResults, rpcDelayMs, trackLikedEvents = false } = options;

  await page.addInitScript(
    ({ user, seededTables, seededRpcResults, delayMs, listenForLiked }) => {
      const session: Session = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: user.id,
          app_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00.000Z',
          email: user.email,
          user_metadata: { display_name: user.display_name },
        },
      };
      window.__SIFT_TEST_SUPABASE_SESSION__ = session;
      window.__SIFT_TEST_SUPABASE_RPC_CALLS__ = [];
      if (seededTables) window.__SIFT_TEST_SUPABASE_TABLES__ = seededTables;
      if (seededRpcResults) window.__SIFT_TEST_SUPABASE_RPC_RESULTS__ = seededRpcResults;
      if (delayMs) window.__SIFT_TEST_SUPABASE_RPC_DELAY_MS__ = delayMs;
      if (listenForLiked) {
        window.__SIFT_TEST_LIKED_EVENTS__ = [];
        window.addEventListener('sift:liked-change', (event) => {
          window.__SIFT_TEST_LIKED_EVENTS__.push((event as CustomEvent).detail);
        });
      }
    },
    {
      user: TEST_USER,
      seededTables: tables,
      seededRpcResults: rpcResults,
      delayMs: rpcDelayMs,
      listenForLiked: trackLikedEvents,
    }
  );
}

export async function stubCommonApiRoutes(page: Page, options: { spotifyConnected?: boolean } = {}) {
  const { spotifyConnected = false } = options;

  await page.route('**/api/auth-status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, spotifyConnected }),
    });
  });

  await page.route('**/api/tracks?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ tracks: [] }),
    });
  });
}

export async function countSwipeRpcs(page: Page, songId: string, source?: string) {
  return page.evaluate(
    ({ id, feed }) =>
      window.__SIFT_TEST_SUPABASE_RPC_CALLS__?.filter(
        (call) =>
          call.name === 'record_swipe_and_update_taste' &&
          call.params.p_song_id === id &&
          (feed ? call.params.p_source === feed : true)
      ).length ?? 0,
    { id: songId, feed: source }
  );
}
