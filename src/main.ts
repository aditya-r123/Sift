//setting up vercel
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
type SpotifyUser = {
  images?: SpotifyImage[];
  display_name?: string;
  id?: string;
  country?: string;
};

function renderProfile(user: SpotifyUser) {
  const el = qs("#profile");
  if (!el) return;
  el.hidden = false;
  const img = user.images?.[0]?.url;
  const name = user.display_name || user.id || "you";
  el.innerHTML = `
    <p class="muted profile-label">Signed in</p>
    <div class="profile-row">
      ${img ? `<img alt="" class="profile-avatar" src="${escapeHtml(img)}" width="48" height="48" />` : ""}
      <div class="profile-meta">
        <strong class="profile-name">${escapeHtml(name)}</strong>
        ${user.country ? `<span class="muted profile-country">${escapeHtml(user.country)}</span>` : ""}
      </div>
    </div>
  `;
}

type SpotifyArtist = { name: string; genres?: string[]; popularity?: number };

function artistItem(a: SpotifyArtist) {
  const genres = Array.isArray(a.genres) && a.genres.length ? ` — ${a.genres.slice(0, 3).join(", ")}` : "";
  return `<li><strong>${escapeHtml(a.name)}</strong>${genres}<div class="muted">Popularity ${a.popularity ?? "—"}</div></li>`;
}

type SpotifyTrack = {
  id?: string;
  name: string;
  artists?: { name: string }[];
  album?: { name?: string };
};

function trackPickRow(t: SpotifyTrack, extraHtml = "") {
  const artists = (t.artists || []).map((x) => x.name).join(", ");
  const album = t.album?.name || "";
  const meta = `${artists}${album ? ` · ${album}` : ""}`;
  const id = t?.id ? String(t.id) : "";
  if (!id) {
    return `<li class="track-row"><strong>${escapeHtml(t.name)}</strong><div class="muted">${escapeHtml(meta)}</div>${extraHtml}</li>`;
  }
  const title = `${t.name}`;
  return `<li class="track-row"><button type="button" class="track-pick" data-track-id="${escapeHtml(id)}" data-track-title="${escapeHtml(title)}">
    <span class="track-pick__title">${escapeHtml(t.name)}</span>
    <span class="track-pick__meta muted">${escapeHtml(meta)}</span>
    </button>${extraHtml}</li>`;
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

async function loadAuthenticatedUI() {
  const logoutBtn = qs("#btn-logout");
  const connectLink = qs("#link-spotify-connect");
  const statsPanel = qs("#stats-panel");
  const artistRange = qs("#artist-range") as HTMLSelectElement | null;
  const trackRange = qs("#track-range") as HTMLSelectElement | null;
  if (!logoutBtn || !artistRange || !trackRange) return;
  const artistSelect = artistRange;
  const trackSelect = trackRange;

  if (connectLink) connectLink.hidden = true;
  logoutBtn.hidden = false;
  if (statsPanel) statsPanel.hidden = false;

  const me = (await fetchJson("/api/me")) as { user?: SpotifyUser };
  if (me.user) renderProfile(me.user);

  async function reloadArtists() {
    const range = artistSelect.value;
    const data = (await fetchJson(
      `/api/top-artists?time_range=${encodeURIComponent(range)}&limit=15`
    )) as PaginatedArtists;
    const items = data.items?.map((a) => artistItem(a)).join("") || "";
    renderList("#top-artists", items, "#artists-empty");
  }
  async function reloadTracks() {
    const range = trackSelect.value;
    const data = (await fetchJson(
      `/api/top-tracks?time_range=${encodeURIComponent(range)}&limit=15`
    )) as PaginatedTracks;
    const items = data.items?.map((t) => trackPickRow(t, "")).join("") || "";
    renderList("#top-tracks", items, "#tracks-empty");
  }
  async function reloadRecent() {
    const data = (await fetchJson("/api/recently-played?limit=25")) as RecentlyPlayed;
    const items =
      data.items
        ?.map((row) => {
          const tr = row.track;
          if (!tr) return "";
          const when = row.played_at ? new Date(row.played_at).toLocaleString() : "";
          const extra = when ? `<div class="muted when">${escapeHtml(when)}</div>` : "";
          return trackPickRow(tr, extra);
        })
        .join("") || "";
    renderList("#recent", items, "#recent-empty");
  }

  artistSelect.addEventListener("change", () =>
    reloadArtists().catch((e) => showError(String(e instanceof Error ? e.message : e)))
  );
  trackSelect.addEventListener("change", () =>
    reloadTracks().catch((e) => showError(String(e instanceof Error ? e.message : e)))
  );
  await Promise.all([reloadArtists(), reloadTracks(), reloadRecent()]);
}

async function bootstrap() {
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

  const profile = qs("#profile");
  if (profile) profile.hidden = true;
  const statsPanel = qs("#stats-panel");
  if (statsPanel) statsPanel.hidden = true;
  if (logoutBtn) logoutBtn.hidden = true;
  const connectLink = qs("#link-spotify-connect");
  if (connectLink) connectLink.hidden = false;
}

bootstrap().catch((e) => showError(String(e instanceof Error ? e.message : e)));
