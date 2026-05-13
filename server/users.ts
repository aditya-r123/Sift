import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  passwordSalt?: string;
  passwordHash?: string;
  googleId?: string;
  createdAt: string;
};

type UserStore = {
  users: StoredUser[];
};

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const storePath = path.join(dataDir, "users.json");

let storePromise: Promise<UserStore> | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

async function loadStore(): Promise<UserStore> {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  if (!existsSync(storePath)) {
    const empty: UserStore = { users: [] };
    await writeFile(storePath, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
  const raw = await readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as UserStore;
  if (!Array.isArray(parsed.users)) {
    return { users: [] };
  }
  return parsed;
}

async function getStore(): Promise<UserStore> {
  if (!storePromise) {
    storePromise = loadStore();
  }
  return storePromise;
}

async function saveStore(store: UserStore): Promise<void> {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  storePromise = Promise.resolve(store);
}

function publicUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export async function createEmailUser(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ user: ReturnType<typeof publicUser> }> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (!isValidPassword(input.password)) {
    throw new Error("Password must be at least 8 characters.");
  }

  const store = await getStore();
  if (store.users.some((user) => user.email === email)) {
    throw new Error("An account with this email already exists.");
  }

  const salt = randomBytes(16).toString("hex");
  const user: StoredUser = {
    id: randomBytes(16).toString("hex"),
    email,
    displayName: input.displayName?.trim() || email.split("@")[0] || "Sift user",
    passwordSalt: salt,
    passwordHash: hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await saveStore(store);
  return { user: publicUser(user) };
}

export async function verifyEmailUser(email: string, password: string): Promise<{ user: ReturnType<typeof publicUser> }> {
  const normalized = normalizeEmail(email);
  const store = await getStore();
  const user = store.users.find((entry) => entry.email === normalized);
  if (!user?.passwordSalt || !user.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const derived = hashPassword(password, user.passwordSalt);
  const matches =
    derived.length === user.passwordHash.length &&
    timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(user.passwordHash, "hex"));
  if (!matches) {
    throw new Error("Invalid email or password.");
  }

  return { user: publicUser(user) };
}

export async function findOrCreateGoogleUser(input: {
  googleId: string;
  email: string;
  displayName: string;
}): Promise<{ user: ReturnType<typeof publicUser> }> {
  const email = normalizeEmail(input.email);
  const store = await getStore();
  let user =
    store.users.find((entry) => entry.googleId === input.googleId) ||
    store.users.find((entry) => entry.email === email);

  if (!user) {
    user = {
      id: randomBytes(16).toString("hex"),
      email,
      displayName: input.displayName.trim() || email.split("@")[0] || "Sift user",
      googleId: input.googleId,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    await saveStore(store);
    return { user: publicUser(user) };
  }

  let changed = false;
  if (!user.googleId) {
    user.googleId = input.googleId;
    changed = true;
  }
  if (input.displayName.trim() && user.displayName !== input.displayName.trim()) {
    user.displayName = input.displayName.trim();
    changed = true;
  }
  if (changed) {
    await saveStore(store);
  }

  return { user: publicUser(user) };
}
