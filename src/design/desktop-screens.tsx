/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { AlbumArt } from "./album-art.js";
import { Icon } from "./icons.js";
import { SIFT_DATA } from "./data.js";
import { CardStack, MetaBars, type CardVariant } from "./swipe-cards.js";
import { SiftLogo } from "./mobile-screens.js";

const D = SIFT_DATA;
const A = AlbumArt;
export type DesktopRoute = "discover" | "explore" | "friends" | "profile";

function DeskFrame({
  children,
  active = "discover",
  screenLabel,
  onNavigate,
}: {
  children: ReactNode;
  active?: DesktopRoute;
  screenLabel?: string;
  onNavigate?: (id: DesktopRoute) => void;
}) {
  const [quickSearch, setQuickSearch] = useState("");
  const topFriends = D.FRIENDS.filter((f) =>
    [f.name, f.handle, f.status, f.recent].join(" ").toLowerCase().includes(quickSearch.trim().toLowerCase()),
  ).slice(0, 4);
  const items = [
    { id: "discover", label: "Discover", icon: <Icon.Compass /> },
    { id: "explore", label: "Explore", icon: <Icon.Sparkle /> },
    { id: "friends", label: "Friends", icon: <Icon.Users /> },
    { id: "profile", label: "Profile", icon: <Icon.User /> },
  ] satisfies Array<{ id: DesktopRoute; label: string; icon: ReactNode }>;
  return (
    <div data-screen-label={screenLabel} className="sift" style={{ height: "100%" }}>
      <div className="desk">
        <aside className="sidebar">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 18px" }}>
            <SiftLogo size={24} />
            <div className="t-h3" style={{ fontSize: 16 }}>
              Sift
            </div>
          </div>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Icon.Search size={14} color="var(--ink-3)" style={{ position: "absolute", top: 10, left: 12 }} />
            <input
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Search tracks, friends…"
              style={{
                width: "100%",
                height: 34,
                padding: "0 12px 0 32px",
                borderRadius: 10,
                background: "var(--paper)",
                border: "1px solid var(--hairline)",
                outline: 0,
                fontSize: 12,
                fontFamily: "var(--font-body)",
                color: "var(--ink)",
              }}
            />
          </div>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={"navitem " + (active === it.id ? "active" : "")}
              onClick={() => onNavigate?.(it.id)}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          ))}
          <div style={{ height: 22 }} />
          <div className="t-eyebrow" style={{ padding: "0 12px 8px", fontSize: 9 }}>
            Friends · top
          </div>
          {topFriends.map((f) => (
            <button key={f.id} type="button" className="navitem" style={{ gap: 10 }}>
              <div className="avatar" style={{ width: 22, height: 22, background: f.tone, fontSize: 9 }}>
                {f.initials}
              </div>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {f.name.split(" ")[0]}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
                {f.recent}
              </span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div className="sidebar-footer">
            <a href="/auth/spotify" className="sidebar-sync">
              <Icon.Spotify size={16} color="#1ed760" />
              <span>Sync Spotify</span>
            </a>
            <div className="sidebar-account">
              <Icon.Spotify size={16} color="#1ed760" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink)" }}>aditya</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)" }}>Spotify · synced 2m ago</div>
              </div>
              <a href="/auth/logout" className="sidebar-signout">
                Sign out
              </a>
            </div>
          </div>
        </aside>
        <main className="main">
          <div style={{ height: "100%", overflow: "hidden" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

export function KbdRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>{label}</span>
      <span style={{ display: "flex", gap: 4 }}>
        {keys.map((k) => (
          <span
            key={k}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "3px 7px",
              borderRadius: 5,
              background: "var(--bg)",
              border: "1px solid var(--hairline)",
              color: "var(--ink-2)",
              fontWeight: 600,
            }}
          >
            {k}
          </span>
        ))}
      </span>
    </div>
  );
}

export function DesktopDiscover({
  variant = "rich" as CardVariant,
  onNavigate,
}: {
  variant?: CardVariant;
  onNavigate?: (id: DesktopRoute) => void;
}) {
  const tracks = useMemo(() => {
    if (variant === "friend") return D.TRACKS.filter((t) => t.friend);
    return D.TRACKS;
  }, [variant]);
  return (
    <DeskFrame active="discover" screenLabel="D01 Discover" onNavigate={onNavigate}>
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 360px", gap: 0 }}>
        <div style={{ padding: "28px 32px 28px 32px", overflow: "hidden auto" }} className="noscroll">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <div className="t-display" style={{ fontSize: 44 }}>
                Discover
              </div>
              <div className="t-body" style={{ marginTop: 6 }}>
                Swipe through 30-second cuts. Your taste profile updates in realtime.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="pill solid" style={{ height: 32 }}>
                For you · 24
              </span>
              <span className="pill">Friends · 8</span>
              <span className="pill">New · 12</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 28, alignItems: "start" }}>
            <div style={{ position: "relative", height: 640, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CardStack tracks={tracks} variant={variant} width={360} height={620} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div className="t-eyebrow" style={{ marginBottom: 10 }}>
                  Why this
                </div>
                <div className="surface" style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                    <span className="t-display" style={{ fontSize: 42, color: "var(--sift)" }}>
                      94
                    </span>
                    <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      /100 match
                    </span>
                  </div>
                  <div className="t-body" style={{ marginBottom: 12 }}>
                    You keep 91% of <b>indie pop</b> at 88–102 BPM. <b>Maya</b> swiped yes on this 2 days ago.
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="meta-chip">
                      + <b>dance affinity</b>
                    </span>
                    <span className="meta-chip">
                      + <b>shared with Maya</b>
                    </span>
                    <span className="meta-chip">
                      ↑ <b>valence</b>
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="t-eyebrow" style={{ marginBottom: 10 }}>
                  Coming up
                </div>
                <div className="surface" style={{ padding: 8 }}>
                  {tracks.slice(1, 5).map((t, i) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8 }}>
                      <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-4)", width: 14 }}>
                        {i + 1}
                      </span>
                      <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flex: "0 0 auto" }}>
                        <A id={t.cover} size={40} radius={8} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--ink-3)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t.artist} · {t.bpm} BPM
                        </div>
                      </div>
                      {t.friend && (
                        <div
                          className="avatar"
                          style={{ width: 18, height: 18, fontSize: 8, background: "var(--sift)", color: "#fff" }}
                        >
                          {t.friend.name[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="t-eyebrow" style={{ marginBottom: 10 }}>
                  Keyboard
                </div>
                <div className="surface" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <KbdRow keys={["←"]} label="Skip" />
                  <KbdRow keys={["→"]} label="Keep" />
                  <KbdRow keys={["Space"]} label="Play / Pause" />
                  <KbdRow keys={["I"]} label="Open details" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <aside
          style={{
            borderLeft: "1px solid var(--hairline)",
            background: "var(--paper-2)",
            padding: "28px 24px",
            overflow: "hidden auto",
          }}
          className="noscroll"
        >
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>
            Your taste · live
          </div>
          <div className="surface" style={{ padding: 16, marginBottom: 18 }}>
            <MetaBars feats={D.PROFILE.taste} />
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                BPM avg
              </div>
              <div className="t-h3" style={{ fontSize: 22 }}>
                {D.PROFILE.taste.bpm}
              </div>
            </div>
          </div>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>
            Friend activity
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {D.FRIENDS.slice(0, 5).map((f, i) => {
              const t = D.TRACKS[(i * 3 + 1) % D.TRACKS.length]!;
              return (
                <div key={f.id} className="surface" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar" style={{ width: 30, height: 30, background: f.tone, fontSize: 11 }}>
                    {f.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                      <b>{f.name.split(" ")[0]}</b> <span style={{ color: "var(--ink-3)" }}>kept</span> {t.title}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{f.status}</div>
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: 6, overflow: "hidden", flex: "0 0 auto" }}>
                    <A id={t.cover} size={30} radius={6} />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </DeskFrame>
  );
}

export function InvTile({
  label,
  v,
  desc,
  active,
  onClick,
}: {
  label: string;
  v: string;
  desc: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderRadius: 8,
        background: active ? "var(--ink)" : "var(--paper)",
        color: active ? "#fff" : "var(--ink)",
        border: active ? "1px solid transparent" : "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div className="t-mono" style={{ fontSize: 10, opacity: 0.8, letterSpacing: 1 }}>
        {v}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.15, fontFamily: "var(--font-display)" }}>{label}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{desc}</div>
    </button>
  );
}

export function CompareBar({ label, you, now, c }: { label: string; you: number; now: number; c: string }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--ink-3)",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        <span>{label}</span>
        <span>
          <span className="t-mono">{you}</span> →{" "}
          <span className="t-mono" style={{ color: c, fontWeight: 700 }}>
            {now}
          </span>
        </span>
      </div>
      <div className="bar" style={{ height: 6 }}>
        <span style={{ width: `${you}%`, background: "var(--ink-4)" }} />
      </div>
      <div className="bar" style={{ height: 6, marginTop: 4 }}>
        <span style={{ width: `${now}%`, background: c }} />
      </div>
    </div>
  );
}

export function DesktopExplore({ onNavigate }: { onNavigate?: (id: DesktopRoute) => void } = {}) {
  const [query, setQuery] = useState("");
  const [activeInversion, setActiveInversion] = useState("quiet");
  const tracks = useMemo(() => {
    const base = D.TRACKS.filter((t) => t.feats.acoustic > 50 || t.feats.instr > 30 || t.bpm < 90 || t.bpm > 130);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) => [t.title, t.artist, ...t.genres, String(t.bpm)].join(" ").toLowerCase().includes(q));
  }, [query]);
  return (
    <DeskFrame active="explore" screenLabel="D02 Explore" onNavigate={onNavigate}>
      <div style={{ height: "100%", padding: "28px 32px", overflow: "hidden auto" }} className="noscroll">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div className="t-eyebrow" style={{ color: "var(--sift)" }}>
              Outside your bubble
            </div>
            <div className="t-display" style={{ fontSize: 44, marginTop: 4 }}>
              Explore
            </div>
            <div className="t-body" style={{ marginTop: 6, maxWidth: 540 }}>
              Sift inverts one weight at a time so you can intentionally hear what your algorithm wouldn't pick.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              height: 40, padding: "0 14px", borderRadius: 999,
              background: "var(--paper)", border: "1px solid var(--hairline)", width: 260,
            }}>
              <Icon.Search size={14} color="var(--ink-3)" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search genres, moods, BPM…" style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontSize: 13, fontFamily: "var(--font-body)", color: "var(--ink)" }} />
            </div>
            <button type="button" className="btn ghost" style={{ height: 40 }}>
              <Icon.Refresh size={14} /> Re-spin
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          <InvTile label="Quieter than usual" v="ENERGY ↓" desc="You usually go for 65+" active={activeInversion === "quiet"} onClick={() => setActiveInversion("quiet")} />
          <InvTile label="More acoustic" v="ACOUSTIC ↑" desc="Up from 38 → 75" active={activeInversion === "acoustic"} onClick={() => setActiveInversion("acoustic")} />
          <InvTile label="Outside your BPM" v="≤ 80 or ≥ 140" desc="You hover at 112" active={activeInversion === "bpm"} onClick={() => setActiveInversion("bpm")} />
          <InvTile label="New genres" v="GENRE ↺" desc="Folk, jazz, classical" active={activeInversion === "genre"} onClick={() => setActiveInversion("genre")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 32, alignItems: "start" }}>
          <div style={{ position: "relative", height: 660, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CardStack tracks={tracks} variant="rich" width={400} height={640} />
          </div>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              What we're showing you
            </div>
            <div className="surface" style={{ padding: 20, marginBottom: 18 }}>
              <div className="t-h3" style={{ fontSize: 20, marginBottom: 10 }}>
                Slower, more acoustic music
              </div>
              <div className="t-body" style={{ marginBottom: 16 }}>
                For the next 8 cards we've pulled tracks where <b>acoustic ≥ 60</b> and <b>BPM ≤ 95</b>, while keeping your
                genre weights intact.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <CompareBar label="Energy" you={D.PROFILE.taste.energy} now={36} c="var(--c-energy)" />
                <CompareBar label="Acoustic" you={D.PROFILE.taste.acoustic} now={78} c="var(--c-acoustic)" />
                <CompareBar label="Dance" you={D.PROFILE.taste.dance} now={42} c="var(--c-dance)" />
                <CompareBar label="Instrumental" you={D.PROFILE.taste.instr} now={48} c="var(--c-instr)" />
              </div>
            </div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Last 5 you kept from Explore
            </div>
            <div className="surface" style={{ padding: 10 }}>
              {D.TRACKS.slice(2, 7).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 8px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden" }}>
                    <A id={t.cover} size={36} radius={6} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.genres[0]}</div>
                  </div>
                  <span className="meta-chip">
                    <b>+{Math.floor(Math.max(0, t.feats.acoustic - 30))}</b> acoustic
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DeskFrame>
  );
}

export function DesktopFriends({ onNavigate }: { onNavigate?: (id: DesktopRoute) => void } = {}) {
  const [query, setQuery] = useState("");
  const friends = D.FRIENDS.filter((f) => [f.name, f.handle, f.status].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <DeskFrame active="friends" screenLabel="D03 Friends" onNavigate={onNavigate}>
      <div style={{ height: "100%", padding: "28px 32px", overflow: "hidden auto" }} className="noscroll">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <div className="t-eyebrow">{D.FRIENDS.length} friends</div>
            <div className="t-display" style={{ fontSize: 44, marginTop: 4 }}>
              Friends
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 40,
                padding: "0 14px",
                borderRadius: 999,
                background: "var(--paper)",
                border: "1px solid var(--hairline)",
                width: 280,
              }}
            >
              <Icon.Search size={14} color="var(--ink-3)" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find by @username" style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontSize: 13 }} />
            </div>
            <button type="button" className="btn sift">
              <Icon.Plus size={14} /> Invite friends
            </button>
          </div>
        </div>
        <div className="surface" style={{ padding: 12, marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="pill love" style={{ height: 26 }}>
            1 pending
          </div>
          <div className="avatar" style={{ width: 32, height: 32, background: "#cdd9ff", fontSize: 11 }}>
            NL
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13 }}>
              <b>Nico Lim</b> wants to share music with you
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>2 mutual friends · @nico</div>
          </div>
          <button type="button" className="btn ghost sm">
            Decline
          </button>
          <button type="button" className="btn sm sift">
            Accept
          </button>
        </div>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>
          Your network
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {friends.map((f) => {
            const t = D.TRACKS.find((x) => x.cover === f.lastCover) ?? D.TRACKS[0]!;
            return (
              <div key={f.id} className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar" style={{ width: 44, height: 44, background: f.tone, fontSize: 14 }}>
                    {f.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {f.handle} · {f.status}
                    </div>
                  </div>
                  <button type="button" className="action sm" style={{ width: 28, height: 28, boxShadow: "none", border: "1px solid var(--hairline)" }}>
                    <Icon.Chevron size={12} />
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flex: "0 0 auto" }}>
                    <A id={f.lastCover} size={56} radius={10} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>
                      Last kept
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.artist}</div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 4,
                    borderTop: "1px solid var(--hairline)",
                  }}
                >
                  <div>
                    <div className="t-mono" style={{ fontSize: 18, fontWeight: 700 }}>
                      {f.recent}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>kept · 30d</div>
                  </div>
                  <div>
                    <div className="t-mono" style={{ fontSize: 18, fontWeight: 700 }}>
                      {f.mutuals}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>mutuals</div>
                  </div>
                  <button type="button" className="btn sm ghost" style={{ height: 30, fontSize: 12 }}>
                    Listen along
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DeskFrame>
  );
}

export function DesktopProfile({ onNavigate }: { onNavigate?: (id: DesktopRoute) => void } = {}) {
  const p = D.PROFILE;
  return (
    <DeskFrame active="profile" screenLabel="D04 Profile" onNavigate={onNavigate}>
      <div style={{ height: "100%", padding: "28px 32px", overflow: "hidden auto" }} className="noscroll">
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div className="avatar" style={{ width: 84, height: 84, background: "var(--sift)", color: "#fff", fontSize: 30 }}>
            {p.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div className="t-eyebrow">
              @{p.handle.replace("@", "")} · joined {p.joined}
            </div>
            <div className="t-display" style={{ fontSize: 44, marginTop: 4 }}>
              {p.name}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 8, alignItems: "baseline" }}>
              <span>
                <b className="t-mono" style={{ fontSize: 18 }}>{p.swipes}</b>{" "}
                <span style={{ color: "var(--ink-3)", fontSize: 12 }}>swipes</span>
              </span>
              <span>
                <b className="t-mono" style={{ fontSize: 18 }}>{p.kept}</b>{" "}
                <span style={{ color: "var(--ink-3)", fontSize: 12 }}>kept</span>
              </span>
              <span>
                <b className="t-mono" style={{ fontSize: 18 }}>{p.streak}d</b>{" "}
                <span style={{ color: "var(--ink-3)", fontSize: 12 }}>streak</span>
              </span>
              <span>
                <b className="t-mono" style={{ fontSize: 18 }}>{D.FRIENDS.length}</b>{" "}
                <span style={{ color: "var(--ink-3)", fontSize: 12 }}>friends</span>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn ghost">
              <Icon.Share size={14} /> Share profile
            </button>
            <button type="button" className="btn">
              <Icon.Settings size={14} /> Settings
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Taste DNA · updated 2 min ago
            </div>
            <div className="surface" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="t-h3">Audio profile</div>
                <div className="t-mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>{p.taste.bpm} BPM target</div>
              </div>
              <MetaBars feats={p.taste} />
            </div>
            <div className="t-eyebrow" style={{ margin: "18px 0 10px" }}>
              Genre weights
            </div>
            <div className="surface" style={{ padding: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {p.genres.map((g) => {
                  const sz = 11 + g.weight * 14;
                  const opacity = 0.25 + g.weight * 0.75;
                  return (
                    <span
                      key={g.name}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: `rgba(91,43,214,${opacity})`,
                        color: g.weight > 0.55 ? "#fff" : "var(--sift)",
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: sz,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {g.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Auto-sync playlist
            </div>
            <div className="surface" style={{ padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  overflow: "hidden",
                  flex: "0 0 auto",
                  background: "linear-gradient(135deg, #1ed760, #0a8a40)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon.Spotify size={32} color="#0a0a0a" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Discovered on Sift</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.kept} songs · synced 2m ago · public</div>
              </div>
              <button type="button" className="btn ghost sm">
                Open in Spotify <Icon.Chevron size={12} />
              </button>
            </div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Top artists
            </div>
            <div className="surface" style={{ padding: 14, marginBottom: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {p.topArtists.map((name, i) => (
                  <div key={name} style={{ textAlign: "center" }}>
                    <div style={{ width: "100%", aspectRatio: "1", borderRadius: 999, overflow: "hidden", margin: "0 auto", maxWidth: 96 }}>
                      <A id={p.topArtistCovers[i]!} size={96} radius={999} />
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 8,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
                    </div>
                    <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                      #{i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>
              Recently kept
            </div>
            <div className="surface" style={{ padding: 10 }}>
              {p.recent.slice(0, 5).map((id, i) => {
                const t = D.TRACKS.find((x) => x.id === id)!;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px" }}>
                    <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-4)", width: 14 }}>
                      {i + 1}
                    </span>
                    <div style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden" }}>
                      <A id={t.cover} size={36} radius={6} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.artist}</div>
                    </div>
                    <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{t.dur}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DeskFrame>
  );
}
