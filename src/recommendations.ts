import { supabase } from './supabase.js';

export type CardSwipeDirection = 'left' | 'right';
export type SwipeSource = 'DISCOVER' | 'EXPLORE';
export type SwipeDecision = 'YES' | 'NO';

export function toSwipeDecision(direction: CardSwipeDirection): SwipeDecision {
  return direction === 'right' ? 'YES' : 'NO';
}

export function scoreSavedSwipe(direction: string | null | undefined): number {
  if (direction === 'right' || direction === 'YES') return 1;
  if (direction === 'left' || direction === 'NO') return -0.5;
  return 0;
}

export type TasteFeatures = {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  speechiness: number;
};


export async function setInitialTasteProfile(features: TasteFeatures) {
  return supabase.rpc('set_initial_taste_profile', {
    p_energy: features.energy,
    p_danceability: features.danceability,
    p_valence: features.valence,
    p_acousticness: features.acousticness,
    p_speechiness: features.speechiness,
  });
}

export async function recordSwipeAndUpdateTaste(
  songId: string,
  source: SwipeSource,
  direction: CardSwipeDirection
) {
  return supabase.rpc('record_swipe_and_update_taste', {
    p_song_id: songId,
    p_source: source,
    p_direction: toSwipeDecision(direction),
  });
}
