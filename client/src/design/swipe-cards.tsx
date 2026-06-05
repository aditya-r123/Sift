/* eslint-disable react-refresh/only-export-components */

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SiftTrack, TrackFeats } from "./data.js";
import { AlbumArt } from "./album-art.js";
import { Icon } from "./icons.js";

export function Waveform({
  playing,
  progress = 0.32,
  color = "currentColor",
  bars = 56,
  height = 26,
}: {
  playing?: boolean;
  progress?: number;
  color?: string;
  bars?: number;
  height?: number;
}) {
  const heights = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      const v = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.42) * 0.55 + Math.cos(i * 0.21) * 0.45);
      out.push(Math.max(0.18, Math.min(1, v)));
    }
    return out;
  }, [bars]);

  return (
    <div className={"wave " + (playing ? "" : "paused")} style={{ height, color, gap: 2, width: "100%" }}>
      {heights.map((h, i) => {
        const before = i / bars < progress;
        return (
          <i
            key={i}
            style={{
              height: `${h * 100}%`,
              opacity: before ? 1 : 0.32,
              animationDelay: `${(i % 7) * 0.08}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export function MiniPlayer({
  track,
  onToggle,
  playing,
  progress,
  onSeek,
  color,
}: {
  track: SiftTrack;
  onToggle: () => void;
  playing?: boolean;
  progress?: number;
  onSeek: (v: number) => void;
  color?: string;
}) {
  const total = 30;
  const cur = Math.floor((progress ?? 0) * total);
  const fmt = (s: number) => `0:${String(s).padStart(2, "0")}`;
  const trackRef = useRef<HTMLDivElement>(null);

  void track;

  const onTrackDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const set = (clientX: number) => {
      const x = clientX - rect.left;
      onSeek(Math.max(0, Math.min(1, x / rect.width)));
    };
    set(e.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    function move(ev: PointerEvent) {
      set(ev.clientX);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const p = progress ?? 0;
  const play = !!playing;

  return (
    <div data-no-drag style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={play ? "Pause" : "Play"}
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          border: 0,
          background: "var(--ink)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        {play ? <Icon.Pause size={18} color="#fff" /> : <Icon.Play size={18} color="#fff" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div ref={trackRef} onPointerDown={onTrackDown} style={{ cursor: "pointer", padding: "4px 0" }}>
          <Waveform playing={play} progress={p} color={color ?? "var(--ink)"} bars={56} height={26} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-3)",
            marginTop: 2,
          }}
        >
          <span>{fmt(cur)}</span>
          <span>0:{total}</span>
        </div>
      </div>
    </div>
  );
}

export function MetaBars({ feats, compact }: { feats: TrackFeats; compact?: boolean }) {
  const items: { k: string; label: string; v: number; c: string }[] = [
    { k: "energy", label: "Energy", v: feats.energy, c: "var(--c-energy)" },
    { k: "dance", label: "Dance", v: feats.dance, c: "var(--c-dance)" },
    { k: "valence", label: "Mood", v: feats.valence, c: "var(--c-valence)" },
    { k: "acoustic", label: "Acoustic", v: feats.acoustic, c: "var(--c-acoustic)" },
  ];
  if (compact) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {items.map((it) => (
          <div key={it.k}>
            <div
              className="t-mono"
              style={{
                fontSize: 9,
                color: "var(--ink-3)",
                letterSpacing: 0.5,
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              {it.label}
            </div>
            <div className="bar">
              <span style={{ width: `${it.v}%`, background: it.c }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it) => (
        <div key={it.k} style={{ display: "grid", gridTemplateColumns: "64px 1fr 28px", alignItems: "center", gap: 10 }}>
          <div
            className="t-mono"
            style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.6 }}
          >
            {it.label}
          </div>
          <div className="bar">
            <span style={{ width: `${it.v}%`, background: it.c }} />
          </div>
          <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-2)", textAlign: "right" }}>
            {it.v}
          </div>
        </div>
      ))}
    </div>
  );
}

export type CardVariant = "minimal" | "rich" | "friend";

export function SwipeCard({
  track,
  variant = "rich",
  width = 326,
  height = 560,
  dragX = 0,
  dragY = 0,
  dragRot = 0,
  isTop = true,
  depth = 0,
  playing = false,
  progress = 0.3,
  onTogglePlay,
  onSeek,
  onPointerDown,
}: {
  track: SiftTrack;
  variant?: CardVariant;
  width?: number;
  height?: number;
  dragX?: number;
  dragY?: number;
  dragRot?: number;
  isTop?: boolean;
  depth?: number;
  playing?: boolean;
  progress?: number;
  onTogglePlay: () => void;
  onSeek: (v: number) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const f = track.feats;
  const likeOp = Math.max(0, Math.min(1, dragX / 100));
  const nopeOp = Math.max(0, Math.min(1, -dragX / 100));
  const stackTransform = isTop
    ? `translate(${dragX}px, ${dragY}px) rotate(${dragRot}deg)`
    : `translate(0, ${depth * 10}px) scale(${1 - depth * 0.05})`;
  const isFriend = variant === "friend";
  const isMinimal = variant === "minimal";
  type CoverKey =
    | "dawn"
    | "stripe"
    | "arch"
    | "neongrid"
    | "ocean"
    | "cherry"
    | "granular"
    | "riso"
    | "vinyl"
    | "type"
    | "wash"
    | "field";
  const palette: Partial<Record<CoverKey, string>> = {
    dawn: "#ff8e72",
    stripe: "#ff2d55",
    arch: "#a0b48a",
    neongrid: "#ff3df0",
    ocean: "#2b6477",
    cherry: "#ff2d55",
    granular: "#a07a3a",
    riso: "#e8543c",
    vinyl: "#d9304a",
    type: "#0a3b3b",
    wash: "#5b3ac9",
    field: "#d93232",
  };
  const albumColor = palette[track.cover as CoverKey] ?? "var(--ink)";
  const p = progress ?? 0;

  return (
    <div
      className="swipe-card"
      onPointerDown={isTop ? onPointerDown : undefined}
      role="presentation"
      style={{
        position: isTop ? "relative" : "absolute",
        inset: isTop ? "auto" : 0,
        width,
        height,
        transform: stackTransform,
        transition: isTop ? "none" : "transform .25s cubic-bezier(.2,.7,.3,1)",
        zIndex: 10 - depth,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 24,
          boxShadow: isTop ? "var(--sh-card)" : "0 8px 20px rgba(20,18,16,0.08)",
          background: "var(--paper)",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: isMinimal ? "1fr auto" : "1fr auto",
          position: "relative",
        }}
      >
        {isFriend && track.friend && (
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px 8px 8px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "var(--sh-1)",
              border: "1px solid var(--hairline)",
            }}
          >
            <div className="avatar" style={{ width: 28, height: 28, background: "var(--sift)", color: "#fff", fontSize: 11 }}>
              {track.friend.name[0]}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{track.friend.name} liked this</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink)",
                  fontWeight: 600,
                  fontStyle: "italic",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                “{track.friend.note}”
              </div>
            </div>
          </div>
        )}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, padding: isMinimal ? 0 : 16, paddingBottom: 0 }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                borderRadius: isMinimal ? 0 : 16,
                overflow: "hidden",
                boxShadow: isMinimal ? "none" : "var(--sh-1)",
              }}
            >
              <AlbumArt id={track.cover} size={500} radius={isMinimal ? 0 : 16} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.18) 100%)",
                  pointerEvents: "none",
                }}
              />
              {isMinimal && (
                <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, color: "#fff" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 28,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.0,
                      textShadow: "0 2px 18px rgba(0,0,0,0.3)",
                    }}
                  >
                    {track.title}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.92, marginTop: 4, fontWeight: 600 }}>{track.artist}</div>
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 24,
              padding: "6px 14px",
              borderRadius: 10,
              border: "3px solid var(--yes)",
              color: "var(--yes)",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: 1,
              transform: `rotate(-12deg) scale(${0.7 + likeOp * 0.4})`,
              opacity: likeOp,
              transition: dragX === 0 ? "opacity .2s" : "none",
              background: "rgba(255,255,255,0.9)",
            }}
          >
            KEEP
          </div>
          <div
            style={{
              position: "absolute",
              top: 32,
              right: 24,
              padding: "6px 14px",
              borderRadius: 10,
              border: "3px solid var(--no)",
              color: "var(--no)",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: 1,
              transform: `rotate(12deg) scale(${0.7 + nopeOp * 0.4})`,
              opacity: nopeOp,
              transition: dragX === 0 ? "opacity .2s" : "none",
              background: "rgba(255,255,255,0.9)",
            }}
          >
            SKIP
          </div>
        </div>

        {!isMinimal && (
          <div style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 12, background: "var(--paper)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="t-h2" style={{ fontSize: 22, lineHeight: 1.05 }}>
                  {track.title}
                </div>
                <div className="t-body" style={{ fontWeight: 600, color: "var(--ink-2)", marginTop: 2 }}>
                  {track.artist}{" "}
                  <span style={{ color: "var(--ink-4)" }}>· {track.year}</span>
                </div>
              </div>
              <span
                className="pill"
                style={{
                  background: "transparent",
                  borderColor: "var(--hairline)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  flex: "0 0 auto",
                  whiteSpace: "nowrap",
                }}
              >
                {track.bpm} BPM
              </span>
            </div>
            {variant === "rich" && <MetaBars feats={f} />}
            {variant === "friend" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {track.genres.map((g) => (
                  <span key={g} className="meta-chip">
                    {g}
                  </span>
                ))}
                <span className="meta-chip">
                  <b>{f.energy}</b> energy
                </span>
                <span className="meta-chip">
                  <b>{f.valence}</b> mood
                </span>
              </div>
            )}
            <MiniPlayer
              track={track}
              playing={playing}
              progress={p}
              onToggle={onTogglePlay}
              onSeek={onSeek}
              color={albumColor}
            />
          </div>
        )}
        {isMinimal && (
          <div style={{ padding: "12px 18px 14px", background: "var(--paper)" }}>
            <MiniPlayer
              track={track}
              playing={playing}
              progress={p}
              onToggle={onTogglePlay}
              onSeek={onSeek}
              color={albumColor}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBar({ onReplay, onYes, onNo }: { onReplay: () => void; onYes: () => void; onNo: () => void }) {
  return (
    <div
      className="swipe-actions"
      style={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 18,
        padding: "10px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid var(--hairline)",
        boxShadow: "var(--sh-2)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        width: "max-content",
        maxWidth: "100%",
        zIndex: 20,
      }}
    >
      <button type="button" className="action sm" onClick={onReplay} title="Replay" aria-label="Replay preview">
        <Icon.Refresh strokeWidth={2} />
      </button>
      <button type="button" className="action no" onClick={onNo} title="Skip" aria-label="Skip track">
        <Icon.X strokeWidth={2.6} />
      </button>
      <button type="button" className="action yes" onClick={onYes} title="Keep" aria-label="Keep track">
        <Icon.HeartFill />
      </button>
      <button type="button" className="action sm" title="Info" aria-label="Open track details">
        <Icon.Info strokeWidth={2} />
      </button>
    </div>
  );
}

export function CardStack({
  tracks,
  variant,
  width = 326,
  height = 560,
}: {
  tracks: SiftTrack[];
  variant: CardVariant;
  width?: number;
  height?: number;
}) {
  const actionArea = 92;
  const cardHeight = Math.max(360, height - actionArea);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0.15);
  const dragRef = useRef({ down: false, sx: 0, sy: 0, x: 0, y: 0 });

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p_) => {
        if (p_ >= 1) return 0;
        return p_ + 1 / 300;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    setProgress(0);
    setPlaying(true);
  }, [index]);

  const visible = useMemo(() => {
    if (tracks.length === 0) return [];
    const out: { track: SiftTrack; depth: number }[] = [];
    for (let d = 0; d < 3; d++) {
      out.push({ track: tracks[(index + d) % tracks.length]!, depth: d });
    }
    return out;
  }, [tracks, index]);

  const settle = useCallback(
    (_dir: "yes" | "no") => {
      setDrag({ x: 0, y: 0 });
      setIndex((i) => (i + 1) % tracks.length);
    },
    [tracks.length],
  );

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest("button") || t.closest("[data-no-drag]")) return;
    dragRef.current = { down: true, sx: e.clientX, sy: e.clientY, x: 0, y: 0 };
    const cap = e.currentTarget;
    cap.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (!dragRef.current.down) return;
      const dx = ev.clientX - dragRef.current.sx;
      const dy = ev.clientY - dragRef.current.sy;
      dragRef.current.x = dx;
      dragRef.current.y = dy;
      setDrag({ x: dx, y: dy });
    };
    const up = () => {
      const dx = dragRef.current.x;
      dragRef.current.down = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (dx > 120) settle("yes");
      else if (dx < -120) settle("no");
      else setDrag({ x: 0, y: 0 });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [settle]);

  if (tracks.length === 0) {
    return (
      <div className="stack" style={{ width, height, position: "relative" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "1px solid var(--hairline)",
            color: "var(--ink-3)",
            fontWeight: 600,
          }}
        >
          No tracks match
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ width, height, position: "relative", alignItems: "flex-start" }}>
      {visible.slice(0).reverse().map((v) => {
        const isTop = v.depth === 0;
        const rot = isTop ? drag.x * 0.05 : 0;
        return (
          <SwipeCard
            key={`${v.track.id}_${index}`}
            track={v.track}
            variant={variant}
            width={width}
            height={cardHeight}
            isTop={isTop}
            depth={v.depth}
            dragX={isTop ? drag.x : 0}
            dragY={isTop ? drag.y : 0}
            dragRot={rot}
            onPointerDown={onPointerDown}
            playing={isTop && playing}
            progress={isTop ? progress : 0}
            onTogglePlay={() => setPlaying((pa) => !pa)}
            onSeek={(prog) => setProgress(prog)}
          />
        );
      })}
      <ActionBar onReplay={() => setProgress(0)} onYes={() => settle("yes")} onNo={() => settle("no")} />
    </div>
  );
}
