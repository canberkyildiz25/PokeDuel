export interface TcgCard {
  id: string;
  set: string;
  name: string;
  supertype: string;
  subtypes: string[];
  types?: string[];
  number: string;
  rarity: string;
  images: {
    small: string;
    large: string;
    foil?: string;
    mask?: string;
  };
}

export const RARITY_SCORE: Record<string, number> = {
  'common': 1,
  'uncommon': 2,
  'rare': 3,
  'rare holo': 4,
  'rare holo cosmos': 5,
  'rare holo v': 6,
  'rare ultra': 7,
  'radiant rare': 8,
  'rare secret': 9,
  'trainer gallery rare holo': 7,
  'trainer gallery rare holo v': 8,
};

export function rarityScore(rarity: string): number {
  return RARITY_SCORE[rarity.toLowerCase()] ?? 3;
}

export const RARITY_LABEL: Record<string, string> = {
  'common': '⚪ Common',
  'uncommon': '🟢 Uncommon',
  'rare': '🔵 Rare',
  'rare holo': '✨ Rare Holo',
  'rare holo cosmos': '🌌 Cosmos Holo',
  'rare holo v': '⚡ Rare V',
  'rare ultra': '💎 Ultra Rare',
  'radiant rare': '🌟 Radiant',
  'rare secret': '🔥 Secret Rare',
  'trainer gallery rare holo': '🎨 Trainer Gallery',
};
