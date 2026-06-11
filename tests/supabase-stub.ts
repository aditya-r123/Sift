import type { Session, SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __SIFT_TEST_SUPABASE_SESSION__?: Session | null;
    __SIFT_TEST_SUPABASE_TABLES__?: Record<string, Array<Record<string, unknown>>>;
    __SIFT_TEST_SUPABASE_RPC_CALLS__?: Array<{ name: string; params: Record<string, unknown> }>;
    __SIFT_TEST_SUPABASE_RPC_RESULTS__?: Record<string, { data?: unknown; error?: { message: string } | null }>;
    __SIFT_TEST_SUPABASE_RPC_DELAY_MS__?: number;
    __SIFT_TEST_SUPABASE_EXPLORE_AXIS__?: string;
    __SIFT_TEST_LIKED_EVENTS__?: unknown[];
  }
}

type FeatureKey = "energy" | "danceability" | "valence" | "acousticness" | "speechiness";

const FEATURE_KEYS: FeatureKey[] = ["energy", "danceability", "valence", "acousticness", "speechiness"];
const FEATURE_WEIGHTS: Record<FeatureKey, number> = {
  energy: 0.35,
  danceability: 0.25,
  valence: 0.2,
  acousticness: 0.15,
  speechiness: 0.05,
};

function getTestHost(): Window | null {
  if (typeof window !== "undefined") return window;
  const host = globalThis as unknown as Window;
  if (
    host.__SIFT_TEST_SUPABASE_TABLES__ ||
    host.__SIFT_TEST_SUPABASE_SESSION__ ||
    host.__SIFT_TEST_SUPABASE_RPC_CALLS__
  ) {
    return host;
  }
  return null;
}

function createNoopQuery(tableName: string) {
  let operation: "select" | "delete" | "insert" | "update" = "select";
  let rows = [...(getTestHost()?.__SIFT_TEST_SUPABASE_TABLES__?.[tableName] ?? [])];
  let mutationPayload: Record<string, unknown> | null = null;
  const tableRows = () => getTestHost()?.__SIFT_TEST_SUPABASE_TABLES__?.[tableName] ?? [];
  const resolve = () => {
    if (operation === "delete") {
      const host = getTestHost();
      if (host?.__SIFT_TEST_SUPABASE_TABLES__) {
        host.__SIFT_TEST_SUPABASE_TABLES__[tableName] = tableRows().filter((row) => !rows.includes(row));
      }
      return Promise.resolve({ data: [], error: null });
    }
    if (operation === "update" && mutationPayload) {
      for (const row of rows) Object.assign(row, mutationPayload);
      return Promise.resolve({ data: rows, error: null });
    }
    return Promise.resolve({ data: rows, error: null });
  };
  const query = {
    select: () => query,
    order: (column: string, options?: { ascending?: boolean }) => {
      rows = [...rows].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const direction = options?.ascending === false ? -1 : 1;
        return String(av).localeCompare(String(bv)) * direction;
      });
      return query;
    },
    limit: (count: number) => {
      rows = rows.slice(0, count);
      return resolve();
    },
    eq: (column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] === value);
      return query;
    },
    neq: (column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] !== value);
      return query;
    },
    // [GenAI Use] Prompt: "Implement filtering imitating that of Supabase's ilike filter for the supabase test stub."
    // [GenAI Use] LLM Response Start
    ilike: (column: string, pattern: string) => {
      const needle = pattern.replace(/^%|%$/g, "").replace(/\\([%_\\])/g, "$1").toLowerCase();
      rows = rows.filter((row) => String(row[column] ?? "").toLowerCase().includes(needle));
      return query;
    },
    // [GenAI Use] LLM Response End
    // [GenAI Use] Reflection: I verified that the replacement pattern makes sense and that it matches the logic of Supabase's ilike functionality.
    or: (expression: string) => {
      const clauses = expression.split(",").map((part) => {
        const [column, operator, ...valueParts] = part.split(".");
        return { column, operator, value: valueParts.join(".") };
      });
      rows = rows.filter((row) =>
        clauses.some(({ column, operator, value }) => column && operator === "eq" && String(row[column]) === value)
      );
      return query;
    },
    in: (column: string, values: unknown[]) => {
      rows = rows.filter((row) => values.includes(row[column]));
      return Promise.resolve({ data: rows, error: null });
    },
    insert: (payload: Record<string, unknown>) => {
      operation = "insert";
      const inserted = {
        id: `test-${tableName}-${tableRows().length + 1}`,
        status: "pending",
        ...payload,
      };
      const host = getTestHost();
      if (host) {
        host.__SIFT_TEST_SUPABASE_TABLES__ ??= {};
        host.__SIFT_TEST_SUPABASE_TABLES__[tableName] ??= [];
        host.__SIFT_TEST_SUPABASE_TABLES__[tableName].unshift(inserted);
      }
      rows = [inserted];
      return query;
    },
    update: (payload: Record<string, unknown>) => {
      operation = "update";
      mutationPayload = payload;
      return query;
    },
    delete: () => {
      operation = "delete";
      return query;
    },
    single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (
      onfulfilled?: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
      onrejected?: (reason?: unknown) => unknown
    ) => resolve().then(onfulfilled, onrejected),
  };
  return query;
}

function tableRows(host: Window, tableName: string) {
  host.__SIFT_TEST_SUPABASE_TABLES__ ??= {};
  host.__SIFT_TEST_SUPABASE_TABLES__[tableName] ??= [];
  return host.__SIFT_TEST_SUPABASE_TABLES__[tableName];
}

function currentUserId(host: Window): string | null {
  return host.__SIFT_TEST_SUPABASE_SESSION__?.user?.id ?? null;
}

function featureValue(row: Record<string, unknown>, key: FeatureKey): number {
  const value = row[key];
  return typeof value === "number" ? value : Number(value);
}

function profileFor(host: Window, userId: string) {
  return tableRows(host, "taste_profiles").find((row) => row.user_id === userId);
}

function ensureProfile(host: Window, userId: string) {
  const existing = profileFor(host, userId);
  if (existing) return existing;

  const profile = {
    user_id: userId,
    energy: 0.5,
    danceability: 0.5,
    valence: 0.5,
    acousticness: 0.5,
    speechiness: 0.5,
    swipe_count: 0,
  };
  tableRows(host, "taste_profiles").push(profile);
  return profile;
}

function newWeight(current: unknown, songFeature: unknown, alpha: number) {
  return (1 - alpha) * Number(current) + alpha * Number(songFeature);
}

function weightedDistanceSquared(profile: Record<string, unknown>, track: Record<string, unknown>) {
  return FEATURE_KEYS.reduce((sum, key) => {
    const trackValue = featureValue(track, key);
    if (!Number.isFinite(trackValue)) return Number.POSITIVE_INFINITY;
    const diff = Number(profile[key] ?? 0.5) - trackValue;
    return sum + FEATURE_WEIGHTS[key] * diff ** 2;
  }, 0);
}

function topMatchAxis(profile: Record<string, unknown>, track: Record<string, unknown>) {
  let bestAxis: FeatureKey = "energy";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const key of FEATURE_KEYS) {
    const trackValue = featureValue(track, key);
    const diff = Number(profile[key] ?? 0.5) - trackValue;
    const distance = Number.isFinite(trackValue) ? FEATURE_WEIGHTS[key] * diff ** 2 : Number.POSITIVE_INFINITY;
    if (distance < bestDistance) {
      bestAxis = key;
      bestDistance = distance;
    }
  }
  return bestAxis;
}

function recommendationRow(
  track: Record<string, unknown>,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return {
    spotify_track_id: track.spotify_track_id,
    name: track.name,
    artist: track.artist,
    energy: track.energy,
    danceability: track.danceability,
    valence: track.valence,
    acousticness: track.acousticness,
    speechiness: track.speechiness,
    ...extra,
  };
}

function handleRecordSwipeAndUpdateTaste(host: Window, params: Record<string, unknown>) {
  const userId = currentUserId(host);
  if (!userId) return { data: [], error: { message: "Not authenticated" } };

  const songId = String(params.p_song_id ?? "");
  const source = String(params.p_source ?? "");
  const direction = String(params.p_direction ?? "");
  const alpha = params.p_alpha == null ? 0.1 : Number(params.p_alpha);

  const track = tableRows(host, "top_tracks").find((row) => row.spotify_track_id === songId);
  if (!track) return { data: [], error: { message: `Song ${songId} not found` } };

  if (!["DISCOVER", "EXPLORE"].includes(source)) {
    return { data: [], error: { message: `p_source must be DISCOVER or EXPLORE, got ${source}` } };
  }
  if (!["YES", "NO"].includes(direction)) {
    return { data: [], error: { message: `p_direction must be YES or NO, got ${direction}` } };
  }

  const swipes = tableRows(host, "swipes");
  const existingSwipe = swipes.find((row) => row.user_id === userId && row.song_id === songId);
  const recorded = !existingSwipe;
  let profile = profileFor(host, userId);
  let updated = false;

  if (recorded) {
    swipes.push({
      id: `test-swipe-${swipes.length + 1}`,
      user_id: userId,
      song_id: songId,
      source,
      direction,
      swiped_at: new Date().toISOString(),
    });
  }

  if (recorded && direction === "YES") {
    profile = ensureProfile(host, userId);
    for (const key of FEATURE_KEYS) {
      profile[key] = newWeight(profile[key], track[key], alpha);
    }
    profile.swipe_count = Number(profile.swipe_count ?? 0) + 1;
    profile.updated_at = new Date().toISOString();
    updated = true;
  }

  return {
    data: [
      {
        out_recorded: recorded,
        out_profile_updated: updated,
        out_song_id: songId,
        out_source: source,
        out_direction: direction,
        out_energy: profile?.energy ?? null,
        out_danceability: profile?.danceability ?? null,
        out_valence: profile?.valence ?? null,
        out_acousticness: profile?.acousticness ?? null,
        out_speechiness: profile?.speechiness ?? null,
        out_swipe_count: profile?.swipe_count ?? null,
      },
    ],
    error: null,
  };
}

function handleGetDiscoverBatch(host: Window, params: Record<string, unknown>) {
  const userId = String(params.p_user_id ?? "");
  const limit = Number(params.p_limit ?? 5);
  const profile =
    profileFor(host, userId) ?? {
      energy: 0.5,
      danceability: 0.5,
      valence: 0.5,
      acousticness: 0.5,
      speechiness: 0.5,
    };
  const tracks = tableRows(host, "top_tracks");
  const swipes = tableRows(host, "swipes");
  const friends = tableRows(host, "friends");
  const profiles = tableRows(host, "profiles");

  const acceptedFriendIds = new Set(
    friends
      .filter(
        (row) =>
          row.status === "accepted" &&
          (row.requester_id === userId || row.addressee_id === userId)
      )
      .map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id))
  );
  const userHasSwiped = (songId: unknown) => swipes.some((row) => row.user_id === userId && row.song_id === songId);

  const friendPick = swipes
    .filter(
      (row) =>
        row.direction === "YES" &&
        acceptedFriendIds.has(row.user_id) &&
        !userHasSwiped(row.song_id) &&
        tracks.some((track) => track.spotify_track_id === row.song_id)
    )
    .sort((a, b) => String(b.swiped_at ?? "").localeCompare(String(a.swiped_at ?? "")))[0];
  const friendTrack = friendPick
    ? tracks.find((track) => track.spotify_track_id === friendPick.song_id)
    : undefined;

  const candidates = tracks
    .filter((track) => !userHasSwiped(track.spotify_track_id))
    .filter((track) => !friendTrack || track.spotify_track_id !== friendTrack.spotify_track_id)
    .map((track) => ({
      track,
      d2: weightedDistanceSquared(profile, track),
      topAxis: topMatchAxis(profile, track),
    }))
    .sort((a, b) => a.d2 - b.d2);

  const friendSlot = friendTrack ? 1 : 0;
  const wildcardSlot = candidates.length >= 10 ? 1 : 0;
  const exploitCount = Math.max(limit - friendSlot - wildcardSlot, 0);
  const exploit = candidates.slice(0, exploitCount).map(({ track, topAxis }) =>
    recommendationRow(track, {
      match_type: "exploit",
      top_match_axis: topAxis,
      recommended_by: null,
    })
  );

  const wildcardCandidate =
    wildcardSlot === 1
      ? candidates.slice(Math.min(exploitCount, Math.max(0, Math.min(49, Math.floor(candidates.length / 4) - 1))))[0]
      : undefined;
  const wildcard = wildcardCandidate
    ? [
        recommendationRow(wildcardCandidate.track, {
          match_type: "wildcard",
          top_match_axis: wildcardCandidate.topAxis,
          recommended_by: null,
        }),
      ]
    : [];

  const friendRows = friendTrack
    ? [
        recommendationRow(friendTrack, {
          match_type: "friend_like",
          top_match_axis: null,
          recommended_by:
            profiles.find((row) => row.id === friendPick?.user_id)?.display_name ?? null,
        }),
      ]
    : [];

  return { data: [...exploit, ...wildcard, ...friendRows].slice(0, limit), error: null };
}

function handleGetExploreBatch(host: Window, params: Record<string, unknown>) {
  const userId = String(params.p_user_id ?? "");
  const limit = Number(params.p_limit ?? 5);
  const profile =
    profileFor(host, userId) ?? {
      energy: 0.5,
      danceability: 0.5,
      valence: 0.5,
      acousticness: 0.5,
      speechiness: 0.5,
    };
  const axis = (host.__SIFT_TEST_SUPABASE_EXPLORE_AXIS__ as FeatureKey | undefined) ?? "energy";
  const target = { ...profile, [axis]: 1 - Number(profile[axis] ?? 0.5) };
  const swipes = tableRows(host, "swipes");

  const candidates = tableRows(host, "top_tracks")
    .filter((track) => !swipes.some((swipe) => swipe.user_id === userId && swipe.song_id === track.spotify_track_id))
    .map((track) => ({
      track,
      d2: weightedDistanceSquared(target, track),
    }))
    .sort((a, b) => a.d2 - b.d2);

  return {
    data: candidates.slice(0, limit).map(({ track }) =>
      recommendationRow(track, {
        match_type: "opposite",
        inverted_axis: axis,
      })
    ),
    error: null,
  };
}
// [GenAI Use] Prompt: "Add test-only default behavior for recommendation RPCs so unit tests can exercise the
// same swipe/taste and recommendation contracts without connecting to a live Supabase database."
// [GenAI Use] LLM Response Start
function handleDefaultRpc(host: Window, name: string, params: Record<string, unknown>) {
  if (name === "record_swipe_and_update_taste") return handleRecordSwipeAndUpdateTaste(host, params);
  if (name === "get_discover_batch") return handleGetDiscoverBatch(host, params);
  if (name === "get_explore_batch") return handleGetExploreBatch(host, params);
  return { data: [], error: null };
}
  // [GenAI Use] LLM Response End
  // [GenAI Use] Reflection: The simulated RPCs mirror the SQL contracts used by the UI tests:
  // first-swipe-wins, YES-only taste updates, weighted Discover distance, friend_like, and Explore axis inversion.

export function createStubSupabaseClient(): SupabaseClient {
  const readSession = () => getTestHost()?.__SIFT_TEST_SUPABASE_SESSION__ ?? null;
  const callRpc = async (name: string, params: Record<string, unknown>) => {
    const host = getTestHost();
    if (host) {
      host.__SIFT_TEST_SUPABASE_RPC_CALLS__ ??= [];
      host.__SIFT_TEST_SUPABASE_RPC_CALLS__.push({ name, params });
      const delayMs = host.__SIFT_TEST_SUPABASE_RPC_DELAY_MS__ ?? 0;
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const result = host.__SIFT_TEST_SUPABASE_RPC_RESULTS__?.[name];
      if (result) return { data: result.data ?? [], error: result.error ?? null };
      return handleDefaultRpc(host, name, params);
    }
    return { data: [], error: null };
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: readSession() }, error: null }),
      onAuthStateChange: (callback: (_event: string, session: Session | null) => void) => {
        queueMicrotask(() => callback("INITIAL_SESSION", readSession()));
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
      signInWithPassword: async () => ({ data: { session: null }, error: { message: "Supabase is not configured." } }),
      signUp: async () => ({ data: { session: null }, error: { message: "Supabase is not configured." } }),
      signInWithOAuth: async () => ({ data: {}, error: { message: "Supabase is not configured." } }),
      signOut: async () => ({ error: null }),
    },
    from: (tableName: string) => createNoopQuery(tableName),
    rpc: callRpc,
    channel: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => undefined }),
      }),
    }),
    removeChannel: async () => ({ error: null }),
  } as unknown as SupabaseClient;
}
