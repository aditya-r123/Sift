import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  FeedSource,
  RecordedSwipe,
  RecordSwipeRequest,
  SwipeDirection,
} from "../../shared/src/contracts.js";
import { getMongoDb } from "./mongo.js";

type SwipeStore = {
  swipes: RecordedSwipe[];
};

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const storePath = path.join(dataDir, "swipes.json");

const swipeDirections = new Set<SwipeDirection>(["YES", "NO"]);
const feedSources = new Set<FeedSource>(["DISCOVER", "EXPLORE"]);

let storePromise: Promise<SwipeStore> | null = null;

export function isSwipeDirection(value: unknown): value is SwipeDirection {
  return typeof value === "string" && swipeDirections.has(value as SwipeDirection);
}

export function isFeedSource(value: unknown): value is FeedSource {
  return typeof value === "string" && feedSources.has(value as FeedSource);
}

async function loadStore(): Promise<SwipeStore> {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  if (!existsSync(storePath)) {
    const empty: SwipeStore = { swipes: [] };
    await writeFile(storePath, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
  const raw = await readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as SwipeStore;
  return Array.isArray(parsed.swipes) ? parsed : { swipes: [] };
}

async function getStore(): Promise<SwipeStore> {
  if (!storePromise) {
    storePromise = loadStore();
  }
  return storePromise;
}

async function saveStore(store: SwipeStore): Promise<void> {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  storePromise = Promise.resolve(store);
}

async function appendFileSwipe(swipe: RecordedSwipe): Promise<void> {
  const store = await getStore();
  store.swipes.push(swipe);
  await saveStore(store);
}

export async function recordSwipe(
  userId: string,
  input: RecordSwipeRequest
): Promise<RecordedSwipe> {
  const swipe: RecordedSwipe = {
    id: randomBytes(16).toString("hex"),
    userId,
    cardId: input.cardId,
    spotifyTrackId: input.spotifyTrackId,
    source: input.source,
    direction: input.direction,
    title: input.title,
    artist: input.artist,
    createdAt: new Date().toISOString(),
  };

  const db = await getMongoDb();
  if (db) {
    await db.collection<RecordedSwipe>("swipes").insertOne(swipe);
  } else {
    await appendFileSwipe(swipe);
  }

  return swipe;
}
