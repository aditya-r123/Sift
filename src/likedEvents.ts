import type { Song } from './types.js';
export type LikedChange =
  | { kind: 'added'; song: Song; source: 'DISCOVER' | 'EXPLORE'; swipedAt: string }
  | { kind: 'removed'; songId: string };

const EVENT_NAME = 'sift:liked-change';

export function emitLikedChange(detail: LikedChange): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<LikedChange>(EVENT_NAME, { detail }));
}

export function onLikedChange(handler: (change: LikedChange) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<LikedChange>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
