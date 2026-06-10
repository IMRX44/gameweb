// Cosmetics catalog — the ONLY things players can buy.
// Every entry is purely visual and grants ZERO gameplay advantage.
// `price` is in "Nebula Crystals", the soft currency. The store also lets you
// buy crystals with real money via a pluggable payments provider, but crystals
// can never be turned into stat boosts.

export const COSMETIC_TYPES = {
  SHIP_SKIN: 'ship_skin',
  TRAIL: 'trail',
  PLANET_THEME: 'planet_theme',
  NAMEPLATE: 'nameplate',
  EMOTE: 'emote',
};

export const COSMETICS = [
  // --- Ship skins (shape/glow of the fleet markers) ---
  { id: 'ship_default', type: 'ship_skin', name: 'Standard Wing', price: 0, rarity: 'common', shape: 'arrow' },
  { id: 'ship_dart', type: 'ship_skin', name: 'Void Dart', price: 250, rarity: 'rare', shape: 'dart' },
  { id: 'ship_orb', type: 'ship_skin', name: 'Plasma Orb', price: 250, rarity: 'rare', shape: 'orb' },
  { id: 'ship_crystal', type: 'ship_skin', name: 'Crystal Shard', price: 600, rarity: 'epic', shape: 'crystal' },
  { id: 'ship_phoenix', type: 'ship_skin', name: 'Phoenix Drive', price: 1200, rarity: 'legendary', shape: 'phoenix' },

  // --- Fleet trails ---
  { id: 'trail_none', type: 'trail', name: 'No Trail', price: 0, rarity: 'common', trail: 'none' },
  { id: 'trail_comet', type: 'trail', name: 'Comet Tail', price: 200, rarity: 'rare', trail: 'comet' },
  { id: 'trail_rainbow', type: 'trail', name: 'Spectrum', price: 500, rarity: 'epic', trail: 'rainbow' },
  { id: 'trail_ember', type: 'trail', name: 'Ember Wake', price: 500, rarity: 'epic', trail: 'ember' },

  // --- Planet themes (decorative ring/atmosphere around YOUR planets) ---
  { id: 'planet_default', type: 'planet_theme', name: 'Classic Halo', price: 0, rarity: 'common', theme: 'halo' },
  { id: 'planet_rings', type: 'planet_theme', name: 'Saturn Rings', price: 350, rarity: 'rare', theme: 'rings' },
  { id: 'planet_aurora', type: 'planet_theme', name: 'Aurora Veil', price: 800, rarity: 'epic', theme: 'aurora' },
  { id: 'planet_blackhole', type: 'planet_theme', name: 'Event Horizon', price: 1500, rarity: 'legendary', theme: 'blackhole' },

  // --- Nameplates (frame around your name on leaderboard / planets) ---
  { id: 'plate_default', type: 'nameplate', name: 'Plain', price: 0, rarity: 'common' },
  { id: 'plate_gold', type: 'nameplate', name: 'Golden Frame', price: 400, rarity: 'rare' },
  { id: 'plate_neon', type: 'nameplate', name: 'Neon Pulse', price: 700, rarity: 'epic' },

  // --- Victory / taunt emotes (shown over a planet you just captured) ---
  { id: 'emote_gg', type: 'emote', name: 'GG', price: 100, rarity: 'common', glyph: '🤝' },
  { id: 'emote_skull', type: 'emote', name: 'Skull', price: 150, rarity: 'rare', glyph: '💀' },
  { id: 'emote_crown', type: 'emote', name: 'Crown', price: 300, rarity: 'epic', glyph: '👑' },
  { id: 'emote_fire', type: 'emote', name: 'On Fire', price: 300, rarity: 'epic', glyph: '🔥' },
];

export const RARITY_COLORS = {
  common: '#9aa7b4',
  rare: '#4cc9f0',
  epic: '#b5179e',
  legendary: '#ffd166',
};

// Crystal bundles purchasable with real money (price in cents USD).
// These are the ONLY real-money SKUs. They yield crystals -> cosmetics only.
export const CRYSTAL_BUNDLES = [
  { id: 'crystals_small', crystals: 500, bonus: 0, priceCents: 199, name: 'Pouch of Crystals' },
  { id: 'crystals_medium', crystals: 1200, bonus: 100, priceCents: 499, name: 'Bag of Crystals' },
  { id: 'crystals_large', crystals: 2600, bonus: 400, priceCents: 999, name: 'Chest of Crystals' },
  { id: 'crystals_huge', crystals: 6000, bonus: 1500, priceCents: 1999, name: 'Vault of Crystals' },
];

const byId = new Map(COSMETICS.map((c) => [c.id, c]));
export function getCosmetic(id) {
  return byId.get(id);
}

// Default loadout granted to every new account.
export const DEFAULT_LOADOUT = {
  ship_skin: 'ship_default',
  trail: 'trail_none',
  planet_theme: 'planet_default',
  nameplate: 'plate_default',
  emote: 'emote_gg',
};

export const DEFAULT_OWNED = [
  'ship_default',
  'trail_none',
  'planet_default',
  'plate_default',
  'emote_gg',
];

export const STARTING_CRYSTALS = 300;
