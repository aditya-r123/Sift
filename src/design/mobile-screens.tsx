import { useMemo, useState, type ReactNode } from "react";

import { AlbumArt } from "./album-art.js";
import siftLogoSrc from "../logo.png";
import type { CardVariant } from "./swipe-cards.js";
import { CardStack, MetaBars, MiniPlayer } from "./swipe-cards.js";
import { SIFT_DATA } from "./data.js";
import { Icon } from "./icons.js";

export function SiftLogo({ size = 22 }: { size?: number }) {
  return <img src={siftLogoSrc} alt="" width={size} height={size} style={{ display: "block", flexShrink: 0, borderRadius: 9 }} />;
}

function PhoneFrame({ children, screenLabel }: { children: ReactNode; screenLabel: string }) {
  return (
    <div data-screen-label={screenLabel} className="sift phone" style={{ width: 390, height: 844 }}>
      <div className="statusbar">
        <span>9:41</span>
        <span className="icons">
          <svg width="18" height="10" viewBox="0 0 18 10" fill="currentColor">
            <path d="M0 8h2v2H0zm4-2h2v4H4zm4-2h2v6H8zm4-2h2v8h-2zm4-2h2v10h-2z" />
          </svg>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M1 5a8 8 0 0 1 12 0M3 7a5 5 0 0 1 8 0M5 9a2 2 0 0 1 4 0" />
          </svg>
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="19" height="10" rx="2" />
            <rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor" />
            <path d="M21 4v3" strokeWidth="1.4" />
          </svg>
        </span>
      </div>
      {children}
    </div>
  );
}

export type MobileScreenNav = {
  onNavigate?: (id: string) => void;
};

export function TabBar({ active = "discover", onTab }: { active?: string; onTab?: (id: string) => void }) {
  const items = [
    { id: "discover", label: "Discover", icon: <Icon.Compass /> },
    { id: "explore", label: "Explore", icon: <Icon.Sparkle /> },
    { id: "friends", label: "Friends", icon: <Icon.Users /> },
    { id: "profile", label: "Profile", icon: <Icon.User /> },
  ];
  return (
    <div className="tabbar">
      {items.map((it) => (
        <button key={it.id} type="button" className={active === it.id ? "active" : ""} onClick={() => onTab?.(it.id)}>
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MobileOnboarding() {
  return (
    <PhoneFrame screenLabel="01 Onboarding">
      <div className="sift" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "12px 24px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <SiftLogo size={26} />
          <div className="t-h3" style={{ fontSize: 18 }}>
            Sift
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 240, height: 280 }}>
            <div style={{ position: "absolute", left: 0, top: 30, transform: "rotate(-9deg)" }}>
              <AlbumArt id="arch" size={170} radius={18} />
            </div>
            <div style={{ position: "absolute", right: 0, top: 50, transform: "rotate(8deg)" }}>
              <AlbumArt id="cherry" size={170} radius={18} />
            </div>
            <div style={{ position: "absolute", left: 32, bottom: 0, transform: "rotate(-2deg)" }}>
              <AlbumArt id="neongrid" size={200} radius={22} />
            </div>
            <div
              style={{
                position: "absolute",
                left: -10,
                top: -8,
                padding: "6px 10px",
                background: "#fff",
                borderRadius: 999,
                boxShadow: "var(--sh-1)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--yes)" }} />
              Keep
            </div>
            <div
              style={{
                position: "absolute",
                right: -12,
                bottom: 36,
                padding: "6px 10px",
                background: "#fff",
                borderRadius: 999,
                boxShadow: "var(--sh-1)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--no)" }} />
              Skip
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div className="t-display" style={{ fontSize: 42, marginBottom: 12 }}>
            Sift what
            <br />
            your friends play.
          </div>
          <div className="t-body" style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.45 }}>
            30-second cuts. Swipe to keep or skip. We learn your taste in seconds — and so do they.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" className="btn spotify" style={{ width: "100%", height: 52, borderRadius: 26, fontSize: 15 }}>
            <Icon.Spotify size={20} color="#0a0a0a" />
            Continue with Spotify
          </button>
          <button type="button" className="btn ghost" style={{ width: "100%", height: 48, borderRadius: 24, fontSize: 14 }}>
            Try a demo session
          </button>
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: "var(--ink-3)", textAlign: "center" }}>
          We&apos;ll read your top tracks &amp; artists.{" "}
          <span style={{ color: "var(--sift)", fontWeight: 600 }}>Privacy &amp; permissions →</span>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function MobileDiscover({ variant = "rich", onNavigate }: { variant?: CardVariant } & MobileScreenNav) {
  const D = SIFT_DATA;
  const tracks = useMemo(() => {
    if (variant === "friend") return D.TRACKS.filter((t) => t.friend);
    return D.TRACKS;
  }, [variant]);

  const variantBadge = (
    {
      minimal: { color: "var(--ink)", bg: "var(--paper-2)", label: "MINIMAL" },
      rich: { color: "#fff", bg: "var(--ink)", label: "RICH METADATA" },
      friend: { color: "#fff", bg: "var(--sift)", label: "FRIEND‑FORWARD" },
    } as const
  )[variant];

  return (
    <PhoneFrame screenLabel={`02 Discover · ${variant}`}>
      <div className="sift" style={{ height: "100%", display: "flex", flexDirection: "column", paddingTop: 6 }}>
        <div className="topbar">
          <div className="t-h2" style={{ fontSize: 26 }}>
            Discover
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="pill"
              style={{ background: variantBadge.bg, color: variantBadge.color, borderColor: "transparent", fontSize: 10 }}
            >
              {variantBadge.label}
            </span>
            <button
              type="button"
              className="action sm"
              style={{ width: 36, height: 36, boxShadow: "none", border: "1px solid var(--hairline)" }}
            >
              <Icon.Filter size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: "4px 18px 0", display: "flex", gap: 10 }}>
          <span className="pill solid" style={{ height: 30 }}>
            For you
          </span>
          <span className="pill">
            Friends ✦ {D.FRIENDS.length}
          </span>
          <span className="pill">New this week</span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginTop: 18 }}>
          <CardStack tracks={tracks} variant={variant} width={326} height={570} />
        </div>

        <div style={{ padding: "0 18px 104px" }}>
          <div
            className="surface surface-w"
            style={{
              marginTop: 18,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "var(--sift-soft)",
                color: "var(--sift)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
              }}
            >
              <Icon.Sparkle size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Why this</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {variant === "friend"
                  ? "Maya liked 3 like this in the last week"
                  : "92% match · high energy & similar BPM to your top tracks"}
              </div>
            </div>
            <button type="button" className="pill" style={{ background: "transparent" }}>
              <Icon.Chevron size={14} />
            </button>
          </div>
        </div>

        <TabBar active="discover" onTab={onNavigate} />
      </div>
    </PhoneFrame>
  );
}

function InversionChip({
  label,
  v,
  active,
  onClick,
}: {
  label: string;
  v: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
        padding: "8px 12px",
        borderRadius: 8,
        flex: "0 0 auto",
        background: active ? "var(--sift)" : "var(--paper)",
        color: active ? "#fff" : "var(--ink)",
        border: active ? "1px solid transparent" : "1px solid var(--hairline)",
        textAlign: "left",
      }}
    >
      <div className="t-mono" style={{ fontSize: 9, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase" }}>
        {v}
      </div>
      <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>{label}</div>
    </button>
  );
}

export function MobileExplore({ onNavigate }: MobileScreenNav = {}) {
  const D = SIFT_DATA;
  const [query, setQuery] = useState("");
  const [activeInversion, setActiveInversion] = useState("quiet");
  const tracks = useMemo(() => {
    const base = D.TRACKS.filter((t) => t.feats.acoustic > 60 || t.feats.instr > 40 || t.bpm < 80 || t.bpm > 130);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) => [t.title, t.artist, ...t.genres, String(t.bpm)].join(" ").toLowerCase().includes(q));
  }, [D.TRACKS, query]);

  return (
    <PhoneFrame screenLabel="03 Explore">
      <div className="sift" style={{ height: "100%", display: "flex", flexDirection: "column", paddingTop: 6 }}>
        <div className="topbar">
          <div className="t-h2" style={{ fontSize: 26 }}>Explore</div>
          <button type="button" className="action sm" style={{ width: 36, height: 36, boxShadow: "none", border: "1px solid var(--hairline)" }}>
            <Icon.Refresh size={16} />
          </button>
        </div>

        <div style={{ padding: "0 18px 10px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            height: 42, padding: "0 14px", borderRadius: 999,
            background: "var(--paper)", border: "1px solid var(--hairline)",
          }}>
            <Icon.Search size={16} color="var(--ink-3)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search genres, moods, BPM…" style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontSize: 14, color: "var(--ink)" }} />
          </div>
        </div>

        <div style={{ padding: "0 18px 0", display: "flex", gap: 8, overflowX: "auto" }} className="noscroll">
          <InversionChip label="Quieter than usual" v="ENERGY ↓" active={activeInversion === "quiet"} onClick={() => setActiveInversion("quiet")} />
          <InversionChip label="More acoustic" v="ACOUSTIC ↑" active={activeInversion === "acoustic"} onClick={() => setActiveInversion("acoustic")} />
          <InversionChip label="Slower BPM" v="≤ 80" active={activeInversion === "bpm"} onClick={() => setActiveInversion("bpm")} />
          <InversionChip label="New genres" v="GENRE ↺" active={activeInversion === "genre"} onClick={() => setActiveInversion("genre")} />
        </div>

        <div
          style={{
            margin: "16px 18px 0",
            padding: "12px 14px",
            borderRadius: 14,
            background: "#0d0d0d",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Icon.Bolt size={18} color="#ffd166" />
          <div style={{ minWidth: 0, flex: 1, fontSize: 12, lineHeight: 1.4 }}>
            You usually swipe yes on <b>high‑energy 110+ BPM</b>. We inverted that.
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginTop: 10 }}>
          <CardStack tracks={tracks} variant="rich" width={326} height={550} />
        </div>

        <div style={{ padding: "0 18px 90px" }} />
        <TabBar active="explore" onTab={onNavigate} />
      </div>
    </PhoneFrame>
  );
}

export function MobileFriends({ onNavigate }: MobileScreenNav = {}) {
  const D = SIFT_DATA;
  const [query, setQuery] = useState("");
  const friends = D.FRIENDS.filter((f) => [f.name, f.handle, f.status].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <PhoneFrame screenLabel="04 Friends">
      <div className="sift" style={{ height: "100%", display: "flex", flexDirection: "column", paddingTop: 6 }}>
        <div className="topbar">
          <div>
            <div className="t-eyebrow">{D.FRIENDS.length} friends</div>
            <div className="t-h2" style={{ fontSize: 26, marginTop: 2 }}>
              Friends
            </div>
          </div>
          <button type="button" className="btn sm sift" style={{ height: 34, padding: "0 12px", fontSize: 12 }}>
            <Icon.Plus size={14} /> Add
          </button>
        </div>

        <div style={{ padding: "0 18px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 42,
              padding: "0 14px",
              borderRadius: 999,
              background: "var(--paper)",
              border: "1px solid var(--hairline)",
            }}
          >
            <Icon.Search size={16} color="var(--ink-3)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find by @username"
              style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontSize: 14, color: "var(--ink)" }}
            />
          </div>
        </div>

        <div style={{ padding: "0 18px 8px" }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            Now in heavy rotation
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }} className="noscroll">
            {friends.slice(0, 5).map((f) => (
              <div key={f.id} style={{ flex: "0 0 auto", width: 88, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 999,
                      padding: 3,
                      background: "conic-gradient(from 0deg, var(--sift), var(--love), var(--c-energy), var(--sift))",
                    }}
                  >
                    <div className="avatar" style={{ width: "100%", height: "100%", background: f.tone, color: "#1c1a16", fontSize: 18 }}>
                      {f.initials}
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: -4,
                      bottom: -2,
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      overflow: "hidden",
                      boxShadow: "0 0 0 3px var(--bg)",
                    }}
                  >
                    <AlbumArt id={f.lastCover} size={24} radius={999} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textAlign: "center",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {f.name.split(" ")[0]}
                </div>
                <div style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                  {f.recent} likes
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden auto" }} className="noscroll">
          <div className="t-eyebrow" style={{ padding: "10px 18px 8px" }}>
            Activity
          </div>
          {friends.slice(0, 5).map((f, i) => {
            const t = D.TRACKS[(i * 2) % D.TRACKS.length]!;
            return (
              <div key={f.id} style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <div className="avatar" style={{ width: 44, height: 44, background: f.tone, fontSize: 14, flex: "0 0 auto" }}>
                  {f.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                    <b style={{ fontWeight: 700 }}>{f.name.split(" ")[0]}</b> <span style={{ color: "var(--ink-3)" }}>kept</span>{" "}
                    <b style={{ fontWeight: 700 }}>{t.title}</b>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                    {f.status} · {t.artist}
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flex: "0 0 auto" }}>
                  <AlbumArt id={t.cover} size={44} radius={10} />
                </div>
              </div>
            );
          })}
          <div style={{ height: 110 }} />
        </div>

        <TabBar active="friends" onTab={onNavigate} />
      </div>
    </PhoneFrame>
  );
}

function StatCard({ k, v, sub }: { k: string; v: ReactNode; sub?: string }) {
  return (
    <div className="surface" style={{ padding: "12px 12px", textAlign: "left" }}>
      <div className="t-eyebrow" style={{ fontSize: 9 }}>
        {k}
      </div>
      <div className="t-display" style={{ fontSize: 26, marginTop: 4 }}>
        {v}
      </div>
      {sub && (
        <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function MobileProfile({ onNavigate }: MobileScreenNav = {}) {
  const D = SIFT_DATA;
  const p = D.PROFILE;
  const dims = [
    { k: "energy", label: "Energy", v: p.taste.energy, c: "var(--c-energy)" },
    { k: "dance", label: "Dance", v: p.taste.dance, c: "var(--c-dance)" },
    { k: "valence", label: "Mood", v: p.taste.valence, c: "var(--c-valence)" },
    { k: "acoustic", label: "Acoustic", v: p.taste.acoustic, c: "var(--c-acoustic)" },
    { k: "instr", label: "Instrumental", v: p.taste.instr, c: "var(--c-instr)" },
  ];
  return (
    <PhoneFrame screenLabel="05 Profile">
      <div className="sift" style={{ height: "100%", display: "flex", flexDirection: "column", paddingTop: 6 }}>
        <div className="topbar">
          <div className="t-h2" style={{ fontSize: 26 }}>
            Profile
          </div>
          <button type="button" className="action sm" style={{ width: 36, height: 36, boxShadow: "none", border: "1px solid var(--hairline)" }}>
            <Icon.Settings size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "hidden auto", padding: "0 18px 110px" }} className="noscroll">
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0 18px" }}>
            <div className="avatar" style={{ width: 64, height: 64, background: "var(--sift)", color: "#fff", fontSize: 22 }}>
              {p.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-h3" style={{ fontSize: 20 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {p.handle} · joined {p.joined}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon.Spotify size={14} />
              <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                linked
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            <StatCard k="Swipes" v={p.swipes} />
            <StatCard k="Kept" v={p.kept} sub={`${Math.round((p.kept / p.swipes) * 100)}%`} />
            <StatCard k="Streak" v={`${p.streak}d`} />
          </div>

          <div className="t-eyebrow" style={{ marginBottom: 10 }}>
            Taste DNA
          </div>
          <div className="surface" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="t-h3">Audio profile</div>
              <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {p.taste.bpm} BPM avg
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dims.map((d) => (
                <div key={d.k} style={{ display: "grid", gridTemplateColumns: "90px 1fr 28px", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>{d.label}</div>
                  <div className="bar">
                    <span style={{ width: `${d.v}%`, background: d.c }} />
                  </div>
                  <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-2)", textAlign: "right" }}>
                    {d.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="t-eyebrow" style={{ marginBottom: 10 }}>
            Genre weights
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {p.genres.map((g) => {
              const opacity = 0.25 + g.weight * 0.75;
              return (
                <span
                  key={g.name}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: `rgba(91,43,214,${opacity})`,
                    color: g.weight > 0.55 ? "#fff" : "var(--sift)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {g.name}
                </span>
              );
            })}
          </div>

          <div className="t-eyebrow" style={{ marginBottom: 10 }}>
            Auto‑sync playlist
          </div>
          <div className="surface" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                overflow: "hidden",
                flex: "0 0 auto",
                background: "#1ed760",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon.Spotify size={28} color="#0a0a0a" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Discovered on Sift</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.kept} songs · synced to Spotify</div>
            </div>
            <button type="button" className="pill">
              <Icon.Chevron size={14} />
            </button>
          </div>

          <div className="t-eyebrow" style={{ margin: "14px 0 10px" }}>
            Recently kept
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }} className="noscroll">
            {p.recent.map((id) => {
              const t = D.TRACKS.find((x) => x.id === id) ?? D.TRACKS[0]!;
              return (
                <div key={id} style={{ flex: "0 0 auto", width: 110 }}>
                  <AlbumArt id={t.cover} size={110} radius={12} />
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.artist}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TabBar active="profile" onTab={onNavigate} />
      </div>
    </PhoneFrame>
  );
}

function ReasonRow({ label, v, muted }: { label: string; v: number; muted?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 30px", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ fontSize: 12, color: muted ? "var(--ink-3)" : "var(--ink)", fontWeight: 500 }}>{label}</div>
      <div className="bar">
        <span style={{ width: `${v}%`, background: muted ? "var(--ink-4)" : "var(--sift)" }} />
      </div>
      <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right" }}>
        {v}
      </div>
    </div>
  );
}

export function MobileDetail({ onNavigate }: MobileScreenNav = {}) {
  const D = SIFT_DATA;
  const t = D.TRACKS[1]!;
  const albumColor = "#ff3df0";

  return (
    <PhoneFrame screenLabel="06 Card Detail">
      <div className="sift" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "4px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="action sm" style={{ width: 36, height: 36, boxShadow: "none", border: "1px solid var(--hairline)" }}>
            <Icon.Chevron size={16} color="var(--ink)" style={{ transform: "rotate(180deg)" }} />
          </button>
          <div className="t-eyebrow">Why you got this</div>
          <button type="button" className="action sm" style={{ width: 36, height: 36, boxShadow: "none", border: "1px solid var(--hairline)" }}>
            <Icon.Share size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "hidden auto", padding: "0 18px 110px" }} className="noscroll">
          <div style={{ borderRadius: 22, overflow: "hidden", boxShadow: "var(--sh-2)", marginBottom: 18 }}>
            <AlbumArt id={t.cover} size={354} radius={22} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="t-display" style={{ fontSize: 32 }}>
              {t.title}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)", marginTop: 4 }}>{t.artist}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              {t.album} · {t.year}
            </div>
          </div>

          <MiniPlayer track={t} playing color={albumColor} onToggle={() => {}} onSeek={() => {}} progress={0.42} />

          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            From your network
          </div>
          <div
            style={{
              paddingTop: 12,
              marginBottom: 20,
              borderTop: "1px solid var(--hairline)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div className="avatar" style={{ width: 38, height: 38, background: "#ffd6a5", fontSize: 13 }}>
              MC
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>
              <b>Maya</b> kept this <span style={{ color: "var(--ink-3)" }}>· 2 days ago</span>
              <div style={{ color: "var(--ink-3)", fontSize: 12, fontStyle: "italic", marginTop: 2 }}>&ldquo;on repeat all week&rdquo;</div>
            </div>
          </div>

          <div className="t-eyebrow" style={{ marginBottom: 10 }}>
            Audio attributes
          </div>
          <div className="surface" style={{ padding: 16, marginBottom: 16 }}>
            <MetaBars feats={t.feats} />
            <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
              <span className="meta-chip">
                <b>{t.bpm}</b> BPM
              </span>
              <span className="meta-chip">
                <b>{t.key}</b>
              </span>
              {t.genres.map((g) => (
                <span key={g} className="meta-chip">
                  {g}
                </span>
              ))}
            </div>

            <div className="t-eyebrow" style={{ margin: "22px 0 10px" }}>
              Why we chose this
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span className="t-display" style={{ fontSize: 36, color: "var(--sift)" }}>
                92
              </span>
              <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                /100 match
              </span>
            </div>
            <ReasonRow label="Matches your high dance affinity" v={91} />
            <ReasonRow label="BPM range is in your top quartile" v={88} />
            <ReasonRow label="Maya kept 3 similar tracks this week" v={84} />
            <ReasonRow label="New artist for you" v={70} muted />
          </div>
        </div>

        <TabBar active="discover" onTab={onNavigate} />
      </div>
    </PhoneFrame>
  );
}
