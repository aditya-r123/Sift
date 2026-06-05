/* eslint-disable react-refresh/only-export-components */
import type { ReactElement, SVGProps } from "react";

type SvgIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function L(
  vb: string,
  path: ReactElement,
): (p: SvgIconProps) => ReactElement {
  return ({ size = 18, color = "currentColor", strokeWidth = 1.8, ...rest }) => (
    <svg
      viewBox={vb}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {path}
    </svg>
  );
}

/* eslint-disable react-refresh/only-export-components */
export const Icon = {
  Heart: L(
    "0 0 24 24",
    <path d="M12 21s-7-4.5-9.3-9.1C1.2 8.8 3.1 5 6.5 5c2 0 3.4 1 5.5 3 2.1-2 3.5-3 5.5-3 3.4 0 5.3 3.8 3.8 6.9C19 16.5 12 21 12 21z" />,
  ),
  HeartFill: ({ size = 18, color = "currentColor", ...r }: SvgIconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} {...r}>
      <path d="M12 21s-7-4.5-9.3-9.1C1.2 8.8 3.1 5 6.5 5c2 0 3.4 1 5.5 3 2.1-2 3.5-3 5.5-3 3.4 0 5.3 3.8 3.8 6.9C19 16.5 12 21 12 21z" />
    </svg>
  ),
  X: L(
    "0 0 24 24",
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>,
  ),
  Play: ({ size = 18, color = "currentColor", ...r }: SvgIconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} {...r}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: ({ size = 18, color = "currentColor", ...r }: SvgIconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} {...r}>
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  ),
  Compass: L(
    "0 0 24 24",
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16 8l-2 6-6 2 2-6z" />
    </>,
  ),
  Sparkle: L(
    "0 0 24 24",
    <>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <path d="M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" />
    </>,
  ),
  Users: L(
    "0 0 24 24",
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 19c.5-3 3.4-4.8 6.5-4.8s6 1.8 6.5 4.8" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16 14.5c2.6 0 4.6 1.4 5 3.5" />
    </>,
  ),
  User: L(
    "0 0 24 24",
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-5.8 7-5.8s7 2.2 7 5.8" />
    </>,
  ),
  Search: L(
    "0 0 24 24",
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.5-3.5" />
    </>,
  ),
  Settings: L(
    "0 0 24 24",
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.4 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  ),
  Spotify: ({ size = 18, color = "#1ed760", ...r }: SvgIconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} {...r}>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.6.4-.9.2-2.4-1.5-5.4-1.8-9-1-.4.1-.7-.2-.8-.5-.1-.4.2-.7.5-.8 3.9-.9 7.3-.5 9.9 1.1.4.2.5.6.3 1zm1.2-2.8c-.3.4-.7.5-1.1.3-2.7-1.7-6.9-2.2-10.1-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.6-1.1 8.2-.5 11.4 1.4.3.2.4.7.3 1zm.1-2.9C14.6 8.7 9 8.6 5.9 9.5c-.5.2-1-.1-1.2-.6-.2-.5.1-1 .6-1.2 3.6-1.1 9.7-.9 13.4 1.4.5.3.6.9.3 1.4-.3.4-.9.5-1.3.2z" />
    </svg>
  ),
  Plus: L(
    "0 0 24 24",
    <>
      <path d="M12 5v14M5 12h14" />
    </>,
  ),
  Check: L(
    "0 0 24 24",
    <path d="M5 12.5l4.5 4.5L19 7" />,
  ),
  Chevron: L(
    "0 0 24 24",
    <path d="M9 6l6 6-6 6" />,
  ),
  Bell: L(
    "0 0 24 24",
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7zM10 21a2 2 0 0 0 4 0" />
    </>,
  ),
  Wave: L(
    "0 0 24 24",
    <path d="M3 12h2l2-6 3 12 3-9 3 6 2-3h3" />,
  ),
  Bolt: L(
    "0 0 24 24",
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  ),
  Globe: L(
    "0 0 24 24",
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>,
  ),
  Mic: L(
    "0 0 24 24",
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>,
  ),
  Library: L(
    "0 0 24 24",
    <>
      <rect x="3" y="4" width="3" height="16" />
      <rect x="8" y="4" width="3" height="16" />
      <path d="M14 4l5 16" />
    </>,
  ),
  Headphones: L(
    "0 0 24 24",
    <>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <rect x="3" y="14" width="5" height="7" rx="1.5" />
      <rect x="16" y="14" width="5" height="7" rx="1.5" />
    </>,
  ),
  Disc: L(
    "0 0 24 24",
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  Info: L(
    "0 0 24 24",
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 8v.5" />
    </>,
  ),
  Share: L(
    "0 0 24 24",
    <>
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M12 3v13M7 8l5-5 5 5" />
    </>,
  ),
  Refresh: L(
    "0 0 24 24",
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </>,
  ),
  Filter: L(
    "0 0 24 24",
    <>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </>,
  ),
  Eye: L(
    "0 0 24 24",
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
};
