// Initialize Vercel Web Analytics
import { inject } from '@vercel/analytics';

inject();

const apiBase = "";

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

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${apiBase}${url}`, { credentials: "include" });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : res.statusText);
  }
  return data;
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" && Number.isFinite(v))
    return String(Math.abs(v) >= 1 || v === 0 ? Math.round(v * 1000) / 1000 : v);
  return String(v);
}

function renderObject(obj: unknown, depth = 0): string {
  if (obj === null || obj === undefined) return `<span class="muted">—</span>`;
  if (typeof obj === "boolean" || typeof obj === "string" || typeof obj === "number")
    return `<span>${escapeHtml(formatScalar(obj))}</span>`;
  if (Array.isArray(obj))
    return obj.length === 0
      ? `<span class="muted">[]</span>`
      : `<ul class="nested">${obj.map((x) => `<li>${renderObject(x, depth + 1)}</li>`).join("")}</ul>`;
  if (typeof obj !== "object") return `<span class="muted">—</span>`;
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return `<span class="muted">{}</span>`;
  return `<dl class="insight-dl">${entries
    .map(
      ([k, v]) => `
      <dt>${escapeHtml(k)}</dt>
      <dd>${renderObject(v, depth + 1)}</dd>`
    )
    .join("")}</dl>`;
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
  subtitle.textContent = "RapidAPI extended audio features";
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

    footEl.hidden = !payload.attemptedUrl;
    footEl.innerHTML =
      payload.attemptedUrl && payload.source === "rapidapi"
        ? `<span class="muted small">Request: <code>${escapeHtml(payload.attemptedUrl)}</code></span>`
        : "";

    bodyEl.innerHTML = `<div class="insight-shell">${renderObject(payload.data ?? payload)}</div>`;
  } catch (e) {
    bodyEl.innerHTML = `<p class="error-msg">${escapeHtml(String(e instanceof Error ? e.message : e))}</p>`;
  }
}

function bindTabs() {
  const tablist = document.querySelector('[role="tablist"]');
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
  if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
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

  showError(null);
  qs("#tab-discover-btn")?.click();
}

const TOP_WINDOW = "short_term";

async function loadAuthenticatedUI() {
  const logoutBtn = qs("#btn-logout");
  const connectLink = qs("#link-spotify-connect");
  const statsPanel = qs("#stats-panel");
  if (!logoutBtn) return;

  if (connectLink) connectLink.hidden = true;
  logoutBtn.hidden = false;
  const profileGate = qs("#profile-gate");
  if (profileGate) profileGate.hidden = true;
  if (statsPanel) statsPanel.hidden = false;

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

async function bootstrap() {
  bindTabs();
  bindTrackInsightClicks();

  const hash = (location.hash || "").replace(/^#/, "");
  if (hash.startsWith("error=")) {
    showError(decodeURIComponent(hash.slice("error=".length)));
    history.replaceState(null, "", location.pathname + location.search);
  } else if (hash === "connected") {
    history.replaceState(null, "", location.pathname + location.search);
  }

  const logoutBtn = qs("#btn-logout");
  logoutBtn?.addEventListener("click", () => {
    window.location.href = "/auth/logout";
  });

  try {
    const status = (await fetchJson("/api/auth-status")) as { authenticated?: boolean };
    if (status.authenticated) {
      await loadAuthenticatedUI();
      qs("#tab-profile-btn")?.click();
      return;
    }
  } catch (e) {
    showError(
      e instanceof Error && e.message
        ? e.message
        : "Could not reach backend. Deploy the Express API or run locally with npm start."
    );
    return;
  }

  applyGuestUi();
}

bootstrap().catch((e) => showError(String(e instanceof Error ? e.message : e)));
