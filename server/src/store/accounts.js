// In-memory account store.
// For an MVP we use guest accounts identified by a token kept in the browser.
// Swapping this for a real database (Postgres/SQLite) later only requires
// reimplementing these functions with the same signatures.

import { nanoid } from 'nanoid';
import {
  DEFAULT_LOADOUT,
  DEFAULT_OWNED,
  STARTING_CRYSTALS,
  getCosmetic,
} from '@nebula/shared/cosmetics.js';

const accounts = new Map(); // token -> account

function makeAccount(name) {
  const token = nanoid(24);
  const acc = {
    token,
    id: nanoid(12),
    name: name && String(name).trim().slice(0, 18) || `Pilot-${Math.floor(Math.random() * 9000 + 1000)}`,
    crystals: STARTING_CRYSTALS,
    owned: [...DEFAULT_OWNED],
    loadout: { ...DEFAULT_LOADOUT },
    createdAt: Date.now(),
    wins: 0,
    games: 0,
  };
  accounts.set(token, acc);
  return acc;
}

export function getOrCreate(token, name) {
  if (token && accounts.has(token)) return accounts.get(token);
  return makeAccount(name);
}

export function getByToken(token) {
  return token ? accounts.get(token) : undefined;
}

export function setName(token, name) {
  const acc = accounts.get(token);
  if (!acc) return null;
  const clean = String(name || '').trim().slice(0, 18);
  if (clean) acc.name = clean;
  return acc;
}

export function setLoadout(token, slot, cosmeticId) {
  const acc = accounts.get(token);
  if (!acc) return { ok: false, error: 'no_account' };
  const cosmetic = getCosmetic(cosmeticId);
  if (!cosmetic) return { ok: false, error: 'unknown_cosmetic' };
  if (cosmetic.type !== slot) return { ok: false, error: 'wrong_slot' };
  if (!acc.owned.includes(cosmeticId)) return { ok: false, error: 'not_owned' };
  acc.loadout[slot] = cosmeticId;
  return { ok: true, account: publicAccount(acc) };
}

export function purchaseCosmetic(token, cosmeticId) {
  const acc = accounts.get(token);
  if (!acc) return { ok: false, error: 'no_account' };
  const cosmetic = getCosmetic(cosmeticId);
  if (!cosmetic) return { ok: false, error: 'unknown_cosmetic' };
  if (acc.owned.includes(cosmeticId)) return { ok: false, error: 'already_owned' };
  if (acc.crystals < cosmetic.price) return { ok: false, error: 'insufficient_crystals' };
  acc.crystals -= cosmetic.price;
  acc.owned.push(cosmeticId);
  return { ok: true, account: publicAccount(acc) };
}

export function grantCrystals(token, amount) {
  const acc = accounts.get(token);
  if (!acc) return { ok: false, error: 'no_account' };
  acc.crystals += Math.max(0, Math.floor(amount));
  return { ok: true, account: publicAccount(acc) };
}

export function recordGame(token, won) {
  const acc = accounts.get(token);
  if (!acc) return;
  acc.games += 1;
  if (won) acc.wins += 1;
}

// What we expose to the client (never leak the token to other players).
export function publicAccount(acc) {
  return {
    id: acc.id,
    name: acc.name,
    crystals: acc.crystals,
    owned: acc.owned,
    loadout: acc.loadout,
    wins: acc.wins,
    games: acc.games,
  };
}

// The loadout we attach to a player when they join a match.
export function loadoutForMatch(acc) {
  return { ...acc.loadout };
}
