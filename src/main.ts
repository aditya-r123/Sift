import { inject } from '@vercel/analytics';
import { createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.js';
import { setInitialTasteProfile, type TasteFeatures } from './recommendations.js';

if (!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
  inject();
}

const apiBase = "";

function mountReactPages() {
  const mounts: Array<[string, () => Promise<ComponentType | undefined>]> = [
    ["panel-discover", async () => (await import("./pages/Discover.js")).DiscoverPage],
    ["panel-explore", async () => (await import("./pages/Explore.js")).ExplorePage],
    ["panel-friends", async () => (await import("./pages/Friends.js")).ProfilePage],
    ["panel-liked", async () => (await import("./pages/LikedSongs.js")).LikedSongsPage],
  ];

  for (const [panelId, load] of mounts) {
    const panel = document.getElementById(panelId);
    if (!panel) continue;
    load()
      .then((Page) => {
        if (!Page) return;
        panel.innerHTML = "";
        createRoot(panel).render(createElement(Page));
      })
      .catch((e) => showError(String(e instanceof Error ? e.message : e)));
  }
}

function qs(sel: string): HTMLElement | null {
  return document.querySelector(sel);
}

function showError(msg: string | null | undefined) {
  const el = qs("#error-banner");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function replaceUrlWithoutHash() {
  const url = new URL(window.location.href);
  url.hash = "";
  if (url.pathname.startsWith("//")) url.pathname = "/";
  history.replaceState(null, "", url.toString());
}

function showLoginPage() {
  const login = qs("#login-page");
  const app = qs("#app-shell");
  if (login) login.hidden = false;
  if (app) app.hidden = true;
}

function showAppShell() {
  const login = qs("#login-page");
  const app = qs("#app-shell");
  if (login) login.hidden = true;
  if (app) app.hidden = false;
}

type AccountUser = {
  displayName?: string;
  email?: string;
};

function accountInitials(user: AccountUser): string {
  const fromName = String(user.displayName || "").trim();
  if (fromName) {
    const parts = fromName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return fromName.slice(0, 2).toUpperCase();
  }
  const fromEmail = String(user.email || "").trim();
  return fromEmail ? fromEmail.slice(0, 2).toUpperCase() : "?";
}

function accountLabel(user: AccountUser): string {
  const fromName = String(user.displayName || "").trim();
  if (fromName) return fromName;
  const fromEmail = String(user.email || "").trim();
  return fromEmail ? fromEmail.split("@")[0] || "Account" : "Account";
}

let accountBadgeBound = false;

function bindAccountBadge() {
  if (accountBadgeBound) return;
  qs("#user-chip")?.addEventListener("click", () => {
    qs("#tab-profile-btn")?.click();
  });
  accountBadgeBound = true;
}

function clearAccountBadge() {
  const chip = qs("#user-chip");
  const avatar = qs("#user-chip-avatar");
  const name = qs("#user-chip-name");
  if (chip) chip.hidden = true;
  if (avatar) avatar.textContent = "";
  if (name) name.textContent = "";
}

function renderAccountBadge(user?: AccountUser) {
  const chip = qs("#user-chip");
  const avatar = qs("#user-chip-avatar");
  const name = qs("#user-chip-name");
  if (!chip || !avatar || !name || !user || (!user.displayName && !user.email)) {
    clearAccountBadge();
    return;
  }
  bindAccountBadge();
  const label = accountLabel(user);
  avatar.textContent = accountInitials(user);
  name.textContent = label;
  chip.hidden = false;
  chip.setAttribute("aria-label", `${label} profile`);
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${apiBase}${url}`, { credentials: "include" });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const error = new Error(typeof data.error === "string" ? data.error : res.statusText) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }
  return data;
}

function isAuthStatusError(error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: number }).status) : 0;
  return status === 401 || status === 403;
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const INSIGHT_FEATURES = [
  { key: "energy", label: "Energy", color: "var(--c-energy)" },
  { key: "danceability", label: "Dance", color: "var(--c-dance)" },
  { key: "valence", label: "Mood", color: "var(--c-valence)" },
  { key: "acousticness", label: "Acoustic", color: "var(--c-acoustic)" },
  { key: "speechiness", label: "Speech", color: "var(--c-speech)" },
] as const;

function readInsightFeature(body: unknown, key: string): number | null {
  let obj = body;
  if (Array.isArray(obj)) obj = obj[0];
  if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    const inner = (rec.data ?? rec.audio_features ?? rec.features) as unknown;
    let v = rec[key];
    if (v === undefined && inner && typeof inner === "object") v = (inner as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1) return v;
  }
  return null;
}

function renderTrackFeatures(body: unknown): string {
  const rows = INSIGHT_FEATURES.map((feature) => ({
    ...feature,
    value: readInsightFeature(body, feature.key),
  })).filter((feature) => feature.value !== null);

  if (rows.length === 0) {
    return `<p class="muted">No audio features available for this track.</p>`;
  }

  return `<div class="sift-feature-stack">${rows
    .map((feature) => {
      const percent = Math.round(Math.max(0, Math.min(1, feature.value as number)) * 100);
      return `<div class="sift-feature">
        <div class="sift-feature-label"><span>${escapeHtml(feature.label)}</span><span>${percent}</span></div>
        <div class="sift-feature-bar"><span style="width:${percent}%;background:${feature.color}"></span></div>
      </div>`;
    })
    .join("")}</div>`;
}

type SpotifyImage = { url?: string };

function formatDurationMs(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatFollowers(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M followers`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k followers`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k followers`;
  return `${n} followers`;
}

function pickImageUrl(images: SpotifyImage[] | undefined, fallbackIndex = 1): string {
  if (!images?.length) return "";
  const i = Math.min(Math.max(0, fallbackIndex), images.length - 1);
  return images[i]?.url || images[0]?.url || "";
}

type SpotifyUser = {
  images?: SpotifyImage[];
  display_name?: string;
  id?: string;
};

function renderProfile(user: SpotifyUser) {
  const el = qs("#profile");
  if (!el) return;
  el.hidden = false;
  const img = user.images?.[0]?.url;
  const name = user.display_name || user.id || "you";
  el.innerHTML = `
    <div class="profile-row">
      ${img ? `<img alt="" class="profile-avatar" src="${escapeHtml(img)}" width="48" height="48" />` : ""}
      <div class="profile-meta">
        <strong class="profile-name">${escapeHtml(name)}</strong>
      </div>
    </div>
  `;
}

type SpotifyArtist = {
  name: string;
  genres?: string[];
  popularity?: number;
  images?: SpotifyImage[];
  followers?: { total?: number };
};

function artistItem(a: SpotifyArtist) {
  const img = pickImageUrl(a.images, 2);
  const genres =
    Array.isArray(a.genres) && a.genres.length ? a.genres.slice(0, 2).join(" · ") : "";
  const followers = formatFollowers(a.followers?.total);
  const pop = a.popularity != null ? `pop ${a.popularity}` : "";
  const parts = [genres, followers, pop].filter(Boolean);
  const meta = parts.join(" · ");
  const ph = `<div class="media-row__img media-row__img--ph" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>`;
  return `<li class="media-row">
    ${
      img
        ? `<img alt="" class="media-row__img" width="36" height="36" loading="lazy" src="${escapeHtml(img)}" />`
        : ph
    }
    <div class="media-row__body">
      <div class="media-row__title">${escapeHtml(a.name)}</div>
      ${meta ? `<div class="media-row__meta">${escapeHtml(meta)}</div>` : ""}
    </div>
  </li>`;
}

type SpotifyTrack = {
  id?: string;
  name: string;
  artists?: { name: string }[];
  album?: { name?: string; images?: SpotifyImage[]; release_date?: string };
  duration_ms?: number;
  popularity?: number;
  explicit?: boolean;
};

function trackAlbumYear(album: SpotifyTrack["album"]): string {
  const rd = album?.release_date;
  if (typeof rd !== "string" || rd.length < 4) return "";
  return rd.slice(0, 4);
}

function trackPickRow(t: SpotifyTrack, extraHtml = "") {
  const artists = (t.artists || []).map((x) => x.name).join(", ");
  const album = t.album?.name || "";
  const year = trackAlbumYear(t.album);
  const albumLine = [album, year].filter(Boolean).join(" · ");
  const line1 = [artists, albumLine].filter(Boolean).join(" · ");
  const dur = formatDurationMs(t.duration_ms);
  const pop = t.popularity != null ? String(t.popularity) : "";
  const detailParts = [dur, pop ? `pop ${pop}` : ""].filter(Boolean);
  const details = detailParts.join(" · ");
  const exp = t.explicit ? `<span class="explicit-tag" title="Explicit">E</span>` : "";
  const id = t?.id ? String(t.id) : "";
  const title = `${t.name}`;
  const img = pickImageUrl(t.album?.images, 2);
  const ph = `<div class="media-row__img media-row__img--ph" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
  const thumb = img
    ? `<img alt="" class="media-row__img" width="36" height="36" loading="lazy" src="${escapeHtml(img)}" />`
    : ph;
  const stack = `<span class="track-pick__stack">
      <span class="track-pick__title">${escapeHtml(t.name)}${exp}</span>
      <span class="track-pick__sub muted">${escapeHtml(line1 || "—")}</span>
      <span class="track-pick__foot">
        <span class="track-pick__detail muted">${escapeHtml(details)}</span>
        ${extraHtml}
      </span>
    </span>`;
  if (!id) {
    return `<li class="media-row track-row media-row--static">${thumb}<div class="track-pick__stack-wrap">${stack}</div></li>`;
  }
  return `<li class="media-row track-row">
    <button type="button" class="track-pick" data-track-id="${escapeHtml(id)}" data-track-title="${escapeHtml(title)}">${thumb}${stack}</button>
  </li>`;
}

function renderList(id: string, html: string, hideEmptyId: string) {
  const list = qs(id);
  if (list) list.innerHTML = html;
  const empty = qs(hideEmptyId);
  if (empty) empty.hidden = html.length > 0;
}

async function refreshRapidSubtitle() {
  const subtitle = qs("#insights-subtitle");
  if (!subtitle) return;
  subtitle.hidden = false;
  subtitle.textContent = "Audio profile";
}

type TrackInsightsPayload = {
  error?: string;
  attemptedUrl?: string;
  source?: string;
  data?: unknown;
};

async function openTrackInsights(trackId: string, title: string) {
  const dlg = qs("#track-insights") as HTMLDialogElement | null;
  const titleEl = qs("#insights-title");
  const subtitle = qs("#insights-subtitle");
  const bodyEl = qs("#insights-body");
  const footEl = qs("#insights-foot");
  if (!dlg || !titleEl || !subtitle || !bodyEl || !footEl) return;

  footEl.hidden = true;
  footEl.textContent = "";

  titleEl.textContent = title || "Track";
  bodyEl.innerHTML = `<p class="muted">Loading…</p>`;
  await refreshRapidSubtitle();
  if (typeof dlg.showModal === "function") dlg.showModal();

  try {
    const res = await fetch(`${apiBase}/api/track-insights/${encodeURIComponent(trackId)}`, {
      credentials: "include",
    });
    const payload = (await res.json().catch(() => ({}))) as TrackInsightsPayload;
    if (!res.ok) {
      bodyEl.innerHTML = `<p class="error-msg">${escapeHtml(payload.error || res.statusText)}</p>${
        payload.attemptedUrl ? `<p class="muted small">Tried: <code>${escapeHtml(payload.attemptedUrl)}</code></p>` : ""
      }`;
      return;
    }

    footEl.hidden = true;
    footEl.innerHTML = "";

    bodyEl.innerHTML = `<div class="insight-shell">${renderTrackFeatures(payload.data ?? payload)}</div>`;
  } catch (e) {
    bodyEl.innerHTML = `<p class="error-msg">${escapeHtml(String(e instanceof Error ? e.message : e))}</p>`;
  }
}

function bindTabs() {
  const tablist = document.querySelector('#app-shell [role="tablist"]');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  function panelForTab(tab: HTMLButtonElement): HTMLElement | null {
    const id = tab.getAttribute("aria-controls");
    return id ? document.getElementById(id) : null;
  }

  function selectTab(active: HTMLButtonElement) {
    for (const tab of tabs) {
      const on = tab === active;
      tab.setAttribute("aria-selected", String(on));
      tab.classList.toggle("is-active", on);
      tab.tabIndex = on ? 0 : -1;
      const panel = panelForTab(tab);
      if (panel) {
        panel.hidden = !on;
        panel.classList.toggle("is-active", on);
      }
    }
  }

  tablist.addEventListener("click", (ev) => {
    const tab = (ev.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
    if (!tab || !tablist.contains(tab)) return;
    selectTab(tab);
  });

  tablist.addEventListener("keydown", (ev) => {
    if (!(ev instanceof KeyboardEvent)) return;
    const current = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (!current) return;
    const i = tabs.indexOf(current);
    let next = -1;
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = (i + 1) % tabs.length;
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
    if (next >= 0) {
      ev.preventDefault();
      selectTab(tabs[next]!);
      tabs[next]?.focus();
    }
  });

  const initial = tabs.find((t) => t.getAttribute("aria-selected") === "true") ?? tabs[0];
  if (initial) selectTab(initial);
}

function bindTrackInsightClicks() {
  document.body.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest(".track-pick") as HTMLElement | null;
    if (!btn) return;
    const trackId = btn.dataset.trackId;
    const bt = btn.dataset.trackTitle || "";
    if (!trackId) return;
    openTrackInsights(trackId, bt).catch((err) =>
      showError(String(err instanceof Error ? err.message : err))
    );
  });
}

type PaginatedArtists = { items?: SpotifyArtist[] };
type PaginatedTracks = { items?: SpotifyTrack[] };
type RecentRow = { track?: SpotifyTrack; played_at?: string };
type RecentlyPlayed = { items?: RecentRow[] };

function applyGuestUi() {
  showLoginPage();

  if (location.hash) {
    replaceUrlWithoutHash();
  }

  const profile = qs("#profile");
  if (profile) {
    profile.hidden = true;
    profile.innerHTML = "";
  }

  const profileGate = qs("#profile-gate");
  if (profileGate) profileGate.hidden = false;

  const statsPanel = qs("#stats-panel");
  if (statsPanel) statsPanel.hidden = true;

  renderList("#top-artists", "", "#artists-empty");
  renderList("#top-tracks", "", "#tracks-empty");
  renderList("#recent", "", "#recent-empty");

  const logoutBtn = qs("#btn-logout");
  if (logoutBtn) logoutBtn.hidden = true;

  const connectLink = qs("#link-spotify-connect");
  if (connectLink) connectLink.hidden = false;

  clearAccountBadge();

  qs("#tab-discover-btn")?.click();
}

function clearSpotifyPanels() {
  renderList("#top-artists", "", "#artists-empty");
  renderList("#top-tracks", "", "#tracks-empty");
  renderList("#recent", "", "#recent-empty");
}

function showSpotifyGate() {
  const profile = qs("#profile");
  const profileGate = qs("#profile-gate");
  const statsPanel = qs("#stats-panel");
  const connectLink = qs("#link-spotify-connect");
  if (profile) {
    profile.hidden = true;
    profile.innerHTML = "";
  }
  if (profileGate) profileGate.hidden = false;
  if (statsPanel) statsPanel.hidden = true;
  if (connectLink) connectLink.hidden = false;
  clearSpotifyPanels();
}

const TOP_WINDOW = "short_term";

async function loadSpotifyContent() {
  const profileGate = qs("#profile-gate");
  const statsPanel = qs("#stats-panel");
  const connectLink = qs("#link-spotify-connect");
  if (profileGate) profileGate.hidden = true;
  if (statsPanel) statsPanel.hidden = false;
  if (connectLink) connectLink.hidden = true;

  const me = (await fetchJson("/api/me")) as { user?: SpotifyUser };
  if (me.user) renderProfile(me.user);

  async function reloadArtists() {
    const data = (await fetchJson(
      `/api/top-artists?time_range=${encodeURIComponent(TOP_WINDOW)}&limit=5`
    )) as PaginatedArtists;
    const items = data.items?.map((a) => artistItem(a)).join("") || "";
    renderList("#top-artists", items, "#artists-empty");
  }
  async function reloadTracks() {
    const data = (await fetchJson(
      `/api/top-tracks?time_range=${encodeURIComponent(TOP_WINDOW)}&limit=5`
    )) as PaginatedTracks;
    const items = data.items?.map((t) => trackPickRow(t, "")).join("") || "";
    renderList("#top-tracks", items, "#tracks-empty");
  }
  async function reloadRecent() {
    const data = (await fetchJson("/api/recently-played?limit=5")) as RecentlyPlayed;
    const items =
      data.items
        ?.map((row) => {
          const tr = row.track;
          if (!tr) return "";
          const when = row.played_at
            ? new Date(row.played_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "";
          const extra = when ? `<span class="when-inline muted">${escapeHtml(when)}</span>` : "";
          return trackPickRow(tr, extra);
        })
        .join("") || "";
    renderList("#recent", items, "#recent-empty");
  }

  await Promise.all([reloadArtists(), reloadTracks(), reloadRecent()]);
}

function accountUserFromSession(session: Session): AccountUser {
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    [meta.display_name, meta.full_name, meta.name]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .find((v) => v.length > 0) || "";
  return { displayName, email: session.user.email || "" };
}

let pendingSpotifySeed = false;

async function seedTasteProfileFromSpotify() {
  try {
    const seed = (await fetchJson("/api/taste-seed")) as Partial<TasteFeatures> & { sampleSize?: number };
    if (
      !seed.sampleSize ||
      typeof seed.energy !== "number" ||
      typeof seed.danceability !== "number" ||
      typeof seed.valence !== "number" ||
      typeof seed.acousticness !== "number" ||
      typeof seed.speechiness !== "number"
    ) {
      return; // No usable top-track features; leave the existing profile as-is.
    }
    const { error } = await setInitialTasteProfile({
      energy: seed.energy,
      danceability: seed.danceability,
      valence: seed.valence,
      acousticness: seed.acousticness,
      speechiness: seed.speechiness,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
  }
}

async function loadSpotifyState() {
  try {
    const status = (await fetchJson("/api/auth-status")) as { spotifyConnected?: boolean };
    if (status.spotifyConnected) {
      if (pendingSpotifySeed) {
        pendingSpotifySeed = false;
        await seedTasteProfileFromSpotify();
      }
      await loadSpotifyContent();
      qs("#tab-profile-btn")?.click();
      return;
    }
  } catch (e) {
    if (!isAuthStatusError(e)) {
      showError(e instanceof Error ? e.message : String(e));
    } else {
      showError(null);
    }
  }
  showSpotifyGate();
  qs("#tab-discover-btn")?.click();
}

let currentAccountId: string | null = null;

async function applyAuthState(session: Session | null) {
  const accountId = session?.user.id ?? null;

  if (!session || !accountId) {
    currentAccountId = null;
    applyGuestUi();
    return;
  }

  if (accountId === currentAccountId) return;
  currentAccountId = accountId;

  showError(null);
  showAppShell();
  const logoutBtn = qs("#btn-logout");
  if (logoutBtn) logoutBtn.hidden = false;
  renderAccountBadge(accountUserFromSession(session));
  await loadSpotifyState();
}

function bindAccountAuth() {
  const signinTab = qs("#auth-tab-signin");
  const signupTab = qs("#auth-tab-signup");
  const signinPanel = qs("#auth-panel-signin");
  const signupPanel = qs("#auth-panel-signup");

  function selectAuthTab(mode: "signin" | "signup") {
    signinTab?.classList.toggle("is-active", mode === "signin");
    signupTab?.classList.toggle("is-active", mode === "signup");
    signinTab?.setAttribute("aria-selected", mode === "signin" ? "true" : "false");
    signupTab?.setAttribute("aria-selected", mode === "signup" ? "true" : "false");
    if (signinPanel) signinPanel.hidden = mode !== "signin";
    if (signupPanel) signupPanel.hidden = mode !== "signup";
  }

  signinTab?.addEventListener("click", () => selectAuthTab("signin"));
  signupTab?.addEventListener("click", () => selectAuthTab("signup"));

  qs("#signin-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      showError(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    }
  });

  qs("#signup-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const displayName = String(data.get("displayName") || "").trim();
    try {
      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: displayName ? { display_name: displayName } : {} },
      });
      if (error) throw new Error(error.message);
      if (!result.session) {
        showError("Account created. Check your email to confirm your address, then sign in.");
        selectAuthTab("signin");
      } else {
        showError(null);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    }
  });

  qs("#google-signin")?.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    }
  });
}

async function bootstrap() {
  bindTabs();
  mountReactPages();
  bindTrackInsightClicks();
  bindAccountAuth();

  const hash = (location.hash || "").replace(/^#/, "");
  if (hash.startsWith("error=")) {
    showError(decodeURIComponent(hash.slice("error=".length)));
    replaceUrlWithoutHash();
  } else if (hash === "connected" || hash === "/connected") {
    // Returned from a successful Spotify connect — seed the taste profile once.
    pendingSpotifySeed = true;
    replaceUrlWithoutHash();
  }


  const logoutBtn = qs("#btn-logout");
  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/logout";
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    void applyAuthState(session);
  });
}

bootstrap().catch((e) => showError(String(e instanceof Error ? e.message : e)));
