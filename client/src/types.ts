import type { Loadout } from './config';

export interface Account {
  id: string;
  name: string;
  crystals: number;
  owned: string[];
  loadout: Required<Loadout> | Loadout;
  wins: number;
  games: number;
}

export interface Cosmetic {
  id: string;
  type: 'ship_skin' | 'trail' | 'planet_theme' | 'nameplate' | 'emote';
  name: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  glyph?: string;
}

export interface CrystalBundle {
  id: string;
  crystals: number;
  bonus: number;
  priceCents: number;
  name: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  slot: number;
  isBot: boolean;
  cosmetics: Loadout;
}

export interface WorldPlanet {
  id: number;
  x: number;
  y: number;
  r: number;
  size: 'small' | 'medium' | 'large';
  max: number;
}

export interface StartPayload {
  seed: number;
  world: { planets: WorldPlanet[] };
  players: PlayerInfo[];
  youId: string;
  roomId: string;
}

// Snapshot wire format (compact arrays).
export type SnapPlanet = [id: number, ownerSlot: number, ships: number];
export type SnapFleet = [
  id: number,
  ownerSlot: number,
  x: number,
  y: number,
  angle100: number,
  ships: number,
  toId: number,
];

export interface Snapshot {
  t: number;
  p: SnapPlanet[];
  f: SnapFleet[];
  a: string[]; // alliance keys "idA|idB"
  over: boolean;
}

export interface GameEvent {
  type: string;
  payload: any;
}

export interface LobbyState {
  roomId: string;
  mode: 'quick' | 'online';
  phase: 'lobby' | 'countdown' | 'playing' | 'ended';
  countdown: number | null;
  targetSeats: number;
  players: { name: string; slot: number; ready: boolean }[];
}

export interface GameResults {
  winner: string | null;
  players: {
    id: string;
    name: string;
    slot: number;
    isBot: boolean;
    alive: boolean;
    planets: number;
    stats: { captured: number; sent: number; lost: number };
    cosmetics: Loadout;
  }[];
}
