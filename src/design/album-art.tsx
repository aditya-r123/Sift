import type { CSSProperties, ReactElement } from "react";

type AlbumArtProps = {
  id: string;
  size?: number;
  radius?: number;
  label?: string;
};

/** SVG album covers keyed by TRACKS.cover */
export function AlbumArt({ id, size = 200, radius = 14 }: AlbumArtProps) {
  const s: CSSProperties = { width: size, height: size, borderRadius: radius };

  const covers: Record<string, ReactElement> = {
    dawn: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <defs>
          <linearGradient id={`g-dawn-${size}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffd6a5" />
            <stop offset="55%" stopColor="#ff8e72" />
            <stop offset="100%" stopColor="#7a3d8f" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#g-dawn-${size})`} />
        <circle cx="60" cy="78" r="34" fill="#fff7e1" opacity="0.95" />
        <rect x="0" y="135" width="200" height="65" fill="#291934" opacity="0.55" />
        <text x="14" y="186" fill="#fff" fontFamily="Bricolage Grotesque, serif" fontWeight="800" fontSize="18" letterSpacing="-0.5">
          SOFTLAND
        </text>
      </svg>
    ),
    stripe: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#0d0d0d" />
        <rect x="0" y="78" width="200" height="44" fill="#ff2d55" />
        <text x="100" y="48" textAnchor="middle" fill="#fff" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="18" letterSpacing="-0.4">
          VELVET
        </text>
        <text x="100" y="170" textAnchor="middle" fill="#fff" fontFamily="JetBrains Mono" fontWeight="500" fontSize="9" letterSpacing="3">
          SIDE A · 1997
        </text>
      </svg>
    ),
    arch: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#eddfc6" />
        <path d="M0 200 L0 110 a100 100 0 0 1 200 0 L200 200 Z" fill="#a0b48a" />
        <circle cx="100" cy="118" r="18" fill="#f4ebda" />
        <text x="100" y="178" textAnchor="middle" fill="#2d3a25" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="14">
          Slow Hours
        </text>
      </svg>
    ),
    neongrid: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <defs>
          <linearGradient id={`g-ng-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b0633" />
            <stop offset="100%" stopColor="#660066" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#g-ng-${size})`} />
        <g stroke="#ff3df0" strokeWidth="1" opacity="0.85">
          {[...Array(8)].map((_, i) => (
            <line key={i} x1="0" y1={110 + i * 12} x2="200" y2={110 + i * 12} />
          ))}
          {[...Array(11)].map((_, i) => {
            const x = 100 + (i - 5) * 20 * ((i - 5) === 0 ? 1 : Math.abs(i - 5) * 0.6 + 1);
            return <line key={i} x1="100" y1="110" x2={x} y2="200" />;
          })}
        </g>
        <circle cx="100" cy="80" r="36" fill="#ff7adf" />
        <circle cx="100" cy="80" r="36" fill={`url(#g-ng-${size})`} opacity="0.35" />
        <text x="100" y="48" textAnchor="middle" fill="#fff" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="13" letterSpacing="2">
          NIGHT/DRIVE
        </text>
      </svg>
    ),
    ocean: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <defs>
          <linearGradient id={`g-oc-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bce5f0" />
            <stop offset="100%" stopColor="#2b6477" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#g-oc-${size})`} />
        <line x1="0" y1="120" x2="200" y2="120" stroke="#0c2730" strokeWidth="1.2" />
        <text x="14" y="46" fill="#0c2730" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="22" letterSpacing="-0.5">
          drift.
        </text>
        <text x="14" y="64" fill="#0c2730" fontFamily="JetBrains Mono" fontSize="8" letterSpacing="2">
          EP — 04
        </text>
      </svg>
    ),
    cherry: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#fff" />
        <circle cx="70" cy="100" r="42" fill="#ff2d55" />
        <circle cx="130" cy="100" r="42" fill="#ff2d55" />
        <text x="100" y="178" textAnchor="middle" fill="#0d0d0d" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="14">
          DOUBLE TAKE
        </text>
      </svg>
    ),
    granular: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#f1ead8" />
        <g stroke="#3a2f1f" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M30 130 q70 -90 140 0" />
          <path d="M30 150 q70 -70 140 0" opacity="0.7" />
          <path d="M30 170 q70 -50 140 0" opacity="0.45" />
        </g>
        <text x="100" y="48" textAnchor="middle" fill="#3a2f1f" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="20" fontStyle="italic">
          Letters
        </text>
        <text x="100" y="65" textAnchor="middle" fill="#3a2f1f" fontFamily="JetBrains Mono" fontSize="8" letterSpacing="3">
          FROM ABROAD
        </text>
      </svg>
    ),
    riso: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#fde8d0" />
        <circle cx="70" cy="100" r="62" fill="#1b3b6f" opacity="0.95" />
        <rect x="100" y="40" width="80" height="120" fill="#e8543c" opacity="0.85" />
        <circle cx="70" cy="100" r="62" fill="#e8543c" opacity="0.25" />
        <text x="14" y="184" fill="#1b3b6f" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="12" letterSpacing="3">
          YOUTH/03
        </text>
      </svg>
    ),
    vinyl: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#111" />
        <circle cx="100" cy="100" r="86" fill="#1a1a1a" />
        {[80, 72, 64, 56, 48, 40].map((r, i) => (
          <circle key={i} cx="100" cy="100" r={r} fill="none" stroke="#2a2a2a" strokeWidth="0.5" />
        ))}
        <circle cx="100" cy="100" r="28" fill="#d9304a" />
        <text x="100" y="98" textAnchor="middle" fill="#fff" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="8">
          PARAGON
        </text>
        <text x="100" y="110" textAnchor="middle" fill="#fff" fontFamily="JetBrains Mono" fontSize="5" letterSpacing="1">
          RECORDS
        </text>
        <circle cx="100" cy="100" r="3" fill="#0a0a0a" />
      </svg>
    ),
    type: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#0a3b3b" />
        <text x="100" y="124" textAnchor="middle" fill="#fff7d6" fontFamily="Bricolage Grotesque" fontWeight="900" fontSize="92" letterSpacing="-6">
          m4
        </text>
        <text x="100" y="170" textAnchor="middle" fill="#fff7d6" fontFamily="JetBrains Mono" fontSize="8" letterSpacing={3}>
          MIDNIGHT FOUR · &apos;24
        </text>
      </svg>
    ),
    wash: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <defs>
          <radialGradient id={`g-wa-${size}`} cx="0.3" cy="0.3">
            <stop offset="0%" stopColor="#ffd1e1" />
            <stop offset="50%" stopColor="#e9aaff" />
            <stop offset="100%" stopColor="#5b3ac9" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#g-wa-${size})`} />
        <text x="14" y="184" fill="#fff" fontFamily="Bricolage Grotesque" fontStyle="italic" fontWeight="700" fontSize="22" letterSpacing="-0.4">
          honeysuckle
        </text>
      </svg>
    ),
    field: (
      <svg viewBox="0 0 200 200" width={size} height={size} style={s}>
        <rect width="200" height="200" fill="#eae6dc" />
        <rect x="16" y="16" width="168" height="168" fill="none" stroke="#1c1a16" strokeWidth="1" />
        <circle cx="100" cy="100" r="6" fill="#d93232" />
        <text x="22" y="32" fill="#1c1a16" fontFamily="JetBrains Mono" fontSize="7" letterSpacing="2">
          FIELD STUDY 11
        </text>
        <text x="22" y="178" fill="#1c1a16" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="14">
          Single (radio edit)
        </text>
      </svg>
    ),
  };

  return covers[id] ?? covers.dawn;
}
