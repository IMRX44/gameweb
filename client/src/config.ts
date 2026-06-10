// Client-side constants. The numeric/world values mirror @nebula/shared so the
// renderer matches the server; they are intentionally duplicated here (as typed
// TS) to keep the client build dependency-light and fully type-checked.

export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 4000;
export const FLEET_SPEED = 240;

export const PLAYER_COLORS = [
  0x4cc9f0, 0xf72585, 0x80ed99, 0xffd166, 0xb5179e, 0xff7b00, 0x4895ef, 0xe5e5e5,
] as const;
export const NEUTRAL_COLOR = 0x6c7a89;

export function colorForSlot(slot: number): number {
  if (slot < 0) return NEUTRAL_COLOR;
  return PLAYER_COLORS[slot % PLAYER_COLORS.length];
}

export function hexCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// Network message types (mirror of shared/constants MSG).
export const MSG = {
  JOIN: 'join',
  SEND_FLEET: 'fleet',
  SET_READY: 'ready',
  CHAT: 'chat',
  ALLY: 'ally',
  BREAK_ALLY: 'unally',
  LOBBY: 'lobby',
  START: 'start',
  SNAPSHOT: 'snap',
  EVENT: 'evt',
  GAME_OVER: 'over',
  ERROR: 'err',
} as const;

export const EVENT = {
  CAPTURE: 'capture',
  DEFEND: 'defend',
  REINFORCE: 'reinforce',
  ELIMINATED: 'eliminated',
} as const;

// Visual attributes for cosmetics, keyed by cosmetic id. Mirrors the visual
// fields in shared/cosmetics.js (shop metadata like price/name comes from the API).
export interface ShipVisual {
  shape: 'arrow' | 'dart' | 'orb' | 'crystal' | 'phoenix';
}
export interface TrailVisual {
  trail: 'none' | 'comet' | 'rainbow' | 'ember';
}
export interface PlanetThemeVisual {
  theme: 'halo' | 'rings' | 'aurora' | 'blackhole';
}

export const SHIP_VISUALS: Record<string, ShipVisual> = {
  ship_default: { shape: 'arrow' },
  ship_dart: { shape: 'dart' },
  ship_orb: { shape: 'orb' },
  ship_crystal: { shape: 'crystal' },
  ship_phoenix: { shape: 'phoenix' },
};
export const TRAIL_VISUALS: Record<string, TrailVisual> = {
  trail_none: { trail: 'none' },
  trail_comet: { trail: 'comet' },
  trail_rainbow: { trail: 'rainbow' },
  trail_ember: { trail: 'ember' },
};
export const PLANET_THEME_VISUALS: Record<string, PlanetThemeVisual> = {
  planet_default: { theme: 'halo' },
  planet_rings: { theme: 'rings' },
  planet_aurora: { theme: 'aurora' },
  planet_blackhole: { theme: 'blackhole' },
};

export const EMOTE_GLYPHS: Record<string, string> = {
  emote_gg: '🤝',
  emote_skull: '💀',
  emote_crown: '👑',
  emote_fire: '🔥',
};

export interface Loadout {
  ship_skin?: string;
  trail?: string;
  planet_theme?: string;
  nameplate?: string;
  emote?: string;
}

export function shipShape(loadout?: Loadout): ShipVisual['shape'] {
  return SHIP_VISUALS[loadout?.ship_skin || 'ship_default']?.shape || 'arrow';
}
export function trailKind(loadout?: Loadout): TrailVisual['trail'] {
  return TRAIL_VISUALS[loadout?.trail || 'trail_none']?.trail || 'none';
}
export function planetTheme(loadout?: Loadout): PlanetThemeVisual['theme'] {
  return PLANET_THEME_VISUALS[loadout?.planet_theme || 'planet_default']?.theme || 'halo';
}
