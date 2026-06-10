// Procedural galaxy generation.
// Produces a set of planets spread across the world with no two planets closer
// than MIN_PLANET_GAP. Each player gets one guaranteed "home" planet far from
// the others; the rest are neutral planets of varying sizes.

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MIN_PLANET_GAP,
  PLANET_SIZES,
  PLANET_SIZE_KEYS,
  MATCH_MIN_PLANETS,
  MATCH_MAX_PLANETS,
  NEUTRAL_FILL,
  HOME_START_SHIPS,
  dist,
  clamp,
} from '@nebula/shared/constants.js';

// Small seeded RNG (mulberry32) so a match can be reproduced from a seed.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Try to place a point that respects the minimum gap from all existing points.
function tryPlacePoint(rng, points, margin, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    const x = margin + rng() * (WORLD_WIDTH - margin * 2);
    const y = margin + rng() * (WORLD_HEIGHT - margin * 2);
    let ok = true;
    for (const p of points) {
      if (dist(x, y, p.x, p.y) < MIN_PLANET_GAP) {
        ok = false;
        break;
      }
    }
    if (ok) return { x, y };
  }
  return null;
}

/**
 * Generate a galaxy.
 * @param {number} playerCount number of seats (players + bots) needing a home
 * @param {number} seed deterministic seed
 * @returns {{ seed:number, planets: Array }}
 */
export function generateGalaxy(playerCount, seed = (Math.random() * 1e9) | 0) {
  const rng = makeRng(seed);
  const margin = 200;

  const totalPlanets = clamp(
    Math.round(MATCH_MIN_PLANETS + rng() * (MATCH_MAX_PLANETS - MATCH_MIN_PLANETS)),
    Math.max(MATCH_MIN_PLANETS, playerCount * 3),
    MATCH_MAX_PLANETS,
  );

  const planets = [];
  let nextId = 1;

  // 1) Place home planets first, spreading them around a circle so starts feel fair.
  const cx = WORLD_WIDTH / 2;
  const cy = WORLD_HEIGHT / 2;
  const homeRadius = Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.36;
  const angleStep = (Math.PI * 2) / Math.max(1, playerCount);
  const angleJitter = angleStep * 0.18;

  for (let slot = 0; slot < playerCount; slot++) {
    const ang = slot * angleStep + (rng() - 0.5) * 2 * angleJitter;
    const x = clamp(cx + Math.cos(ang) * homeRadius, margin, WORLD_WIDTH - margin);
    const y = clamp(cy + Math.sin(ang) * homeRadius, margin, WORLD_HEIGHT - margin);
    const size = 'medium';
    planets.push({
      id: nextId++,
      x,
      y,
      size,
      radius: PLANET_SIZES[size].radius,
      owner: slot, // assigned to seat index; remapped to real player ids later
      ships: HOME_START_SHIPS,
      isHome: true,
      homeSlot: slot,
    });
  }

  // 2) Fill the rest with neutral planets.
  let guard = 0;
  while (planets.length < totalPlanets && guard < totalPlanets * 60) {
    guard++;
    const pos = tryPlacePoint(rng, planets, margin);
    if (!pos) break;
    const size = pick(rng, PLANET_SIZE_KEYS);
    const def = PLANET_SIZES[size];
    planets.push({
      id: nextId++,
      x: pos.x,
      y: pos.y,
      size,
      radius: def.radius,
      owner: null, // neutral
      ships: Math.round(def.maxShips * NEUTRAL_FILL),
      isHome: false,
    });
  }

  return { seed, planets };
}
