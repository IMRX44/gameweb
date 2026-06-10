// Shared game constants used by both the authoritative server and the client.
// Keeping these in one place guarantees client prediction matches the server.

export const PROTOCOL_VERSION = 1;

// Simulation
export const TICK_RATE = 20; // server simulation ticks per second
export const TICK_MS = 1000 / TICK_RATE;
export const SNAPSHOT_RATE = 10; // network snapshots per second
export const SNAPSHOT_EVERY = Math.round(TICK_RATE / SNAPSHOT_RATE);

// Galaxy / world
export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 4000;
export const MIN_PLANET_GAP = 220; // minimum distance between planet centers

// Planets
export const PLANET_SIZES = {
  small: { radius: 22, maxShips: 40, production: 0.6, cost: 18 },
  medium: { radius: 32, maxShips: 80, production: 1.0, cost: 32 },
  large: { radius: 44, maxShips: 150, production: 1.6, cost: 55 },
};
export const PLANET_SIZE_KEYS = Object.keys(PLANET_SIZES);

// A neutral planet starts with this fraction of its max as defenders.
export const NEUTRAL_FILL = 0.35;
// A player's home planet starts with this many ships.
export const HOME_START_SHIPS = 30;

// Fleets
export const FLEET_SPEED = 240; // world units per second
export const MIN_FLEET = 1; // smallest fleet you can send
// Combat: when a hostile fleet of A ships hits a planet defended by D ships,
// the survivors = |A - D|, owner flips to attacker if A > D.
// Reinforcement: same owner -> ships add (clamped at maxShips capacity is soft;
// fleets can temporarily overstack a planet beyond max, production just pauses).

// Match
export const MATCH_MAX_PLAYERS = 8;
export const MATCH_MIN_PLANETS = 22;
export const MATCH_MAX_PLANETS = 34;
export const COUNTDOWN_SECONDS = 5;

// Player colors (neon palette). Index 0..7 map to slots; bots reuse them.
export const PLAYER_COLORS = [
  0x4cc9f0, // cyan
  0xf72585, // magenta
  0x80ed99, // green
  0xffd166, // amber
  0xb5179e, // purple
  0xff7b00, // orange
  0x4895ef, // blue
  0xe5e5e5, // white
];

export const NEUTRAL_COLOR = 0x6c7a89;

// Networking message types (kept short for bandwidth).
export const MSG = {
  // client -> server
  JOIN: 'join',
  SEND_FLEET: 'fleet',
  SET_READY: 'ready',
  CHAT: 'chat',
  ALLY: 'ally', // propose / accept alliance
  BREAK_ALLY: 'unally',
  // server -> client
  LOBBY: 'lobby',
  START: 'start',
  SNAPSHOT: 'snap',
  EVENT: 'evt',
  GAME_OVER: 'over',
  ERROR: 'err',
};

// Result of a combat resolution, sent as an event for visual feedback.
export const EVENT = {
  CAPTURE: 'capture',
  DEFEND: 'defend',
  REINFORCE: 'reinforce',
  ELIMINATED: 'eliminated',
};

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
