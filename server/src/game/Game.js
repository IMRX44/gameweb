// Authoritative game simulation for a single match.
// The server is the single source of truth: clients only send intents
// ("send a fleet from A to B"), and the server validates + simulates everything.

import {
  PLANET_SIZES,
  FLEET_SPEED,
  MIN_FLEET,
  EVENT,
  dist,
  clamp,
} from '@nebula/shared/constants.js';
import { generateGalaxy } from './galaxy.js';

let FLEET_SEQ = 1;

export class Game {
  /**
   * @param {Array<{id:string,name:string,slot:number,isBot:boolean,cosmetics:object}>} seats
   * @param {(type:string, payload:object)=>void} onEvent
   * @param {number} [seed]
   */
  constructor(seats, onEvent, seed) {
    this.onEvent = onEvent || (() => {});
    this.over = false;
    this.winnerId = null;
    this.elapsed = 0; // seconds
    this.fleets = [];
    this.alliances = new Set(); // "idA|idB" with sorted ids
    this.pendingAlly = new Set(); // "from->to" proposals

    // Players keyed by id; slot index maps to home planet + color.
    this.players = new Map();
    seats.forEach((s) => {
      this.players.set(s.id, {
        id: s.id,
        name: s.name,
        slot: s.slot,
        isBot: !!s.isBot,
        cosmetics: s.cosmetics || {},
        alive: true,
        stats: { captured: 0, sent: 0, lost: 0 },
      });
    });

    const galaxy = generateGalaxy(seats.length, seed);
    this.seed = galaxy.seed;

    // Remap home planet seat indices -> real player ids.
    const slotToId = new Map(seats.map((s) => [s.slot, s.id]));
    this.planets = galaxy.planets.map((p) => {
      const planet = { ...p };
      if (planet.isHome) {
        planet.owner = slotToId.get(planet.homeSlot) ?? null;
        delete planet.homeSlot;
      } else {
        planet.owner = null;
      }
      planet.maxShips = PLANET_SIZES[planet.size].maxShips;
      planet.production = PLANET_SIZES[planet.size].production;
      planet.ships = Number(planet.ships) || 0;
      return planet;
    });

    this.planetById = new Map(this.planets.map((p) => [p.id, p]));
  }

  // ---- Alliance helpers -------------------------------------------------
  allyKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }
  areAllied(a, b) {
    if (a == null || b == null) return false;
    if (a === b) return true;
    return this.alliances.has(this.allyKey(a, b));
  }

  proposeAlly(fromId, toId) {
    if (!this.players.has(fromId) || !this.players.has(toId)) return;
    if (fromId === toId || this.areAllied(fromId, toId)) return;
    const reverse = `${toId}->${fromId}`;
    if (this.pendingAlly.has(reverse)) {
      // Mutual: form alliance.
      this.pendingAlly.delete(reverse);
      this.alliances.add(this.allyKey(fromId, toId));
      this.onEvent('ally', { a: fromId, b: toId });
    } else {
      this.pendingAlly.add(`${fromId}->${toId}`);
      this.onEvent('allyProposed', { from: fromId, to: toId });
    }
  }

  breakAlly(fromId, toId) {
    const key = this.allyKey(fromId, toId);
    if (this.alliances.delete(key)) {
      this.onEvent('unally', { a: fromId, b: toId });
    }
    this.pendingAlly.delete(`${fromId}->${toId}`);
  }

  // ---- Intents ----------------------------------------------------------
  /**
   * A player sends a fraction of ships from one of their planets to a target.
   * Validated entirely server-side.
   */
  sendFleet(playerId, fromId, toId, ratio = 0.5) {
    if (this.over) return;
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    const from = this.planetById.get(fromId);
    const to = this.planetById.get(toId);
    if (!from || !to || from.id === to.id) return;
    if (from.owner !== playerId) return; // can only launch from your own planet

    ratio = clamp(Number(ratio) || 0, 0.05, 1);
    const count = Math.floor(from.ships * ratio);
    if (count < MIN_FLEET) return;

    from.ships -= count;

    const d = dist(from.x, from.y, to.x, to.y);
    const nx = (to.x - from.x) / (d || 1);
    const ny = (to.y - from.y) / (d || 1);

    this.fleets.push({
      id: FLEET_SEQ++,
      owner: playerId,
      fromId,
      toId,
      x: from.x,
      y: from.y,
      nx,
      ny,
      angle: Math.atan2(ny, nx),
      ships: count,
      remaining: d,
    });
    player.stats.sent += count;
  }

  // ---- Simulation -------------------------------------------------------
  tick(dt) {
    if (this.over) return;
    this.elapsed += dt;

    // 1) Production on owned planets.
    for (const p of this.planets) {
      if (p.owner != null && p.ships < p.maxShips) {
        p.ships = Math.min(p.maxShips, p.ships + p.production * dt);
      }
    }

    // 2) Move fleets and resolve arrivals.
    const step = FLEET_SPEED * dt;
    const survivors = [];
    for (const f of this.fleets) {
      f.remaining -= step;
      if (f.remaining <= 0) {
        this.resolveArrival(f);
      } else {
        f.x += f.nx * step;
        f.y += f.ny * step;
        survivors.push(f);
      }
    }
    this.fleets = survivors;

    // 3) Eliminations + victory check.
    this.checkEndConditions();
  }

  resolveArrival(fleet) {
    const planet = this.planetById.get(fleet.toId);
    if (!planet) return; // target vanished (shouldn't happen)

    const arriver = this.players.get(fleet.owner);
    const friendly =
      planet.owner === fleet.owner || this.areAllied(planet.owner, fleet.owner);

    if (friendly) {
      // Reinforce: ships stack (can briefly exceed maxShips; production pauses).
      planet.ships += fleet.ships;
      this.onEvent(EVENT.REINFORCE, { planet: planet.id, by: fleet.owner, n: fleet.ships });
      return;
    }

    // Hostile combat.
    const before = planet.ships;
    planet.ships -= fleet.ships;

    if (planet.ships < 0) {
      // Captured.
      const prevOwner = planet.owner;
      planet.owner = fleet.owner;
      planet.ships = -planet.ships;
      if (arriver) arriver.stats.captured += 1;
      if (prevOwner != null) {
        const loser = this.players.get(prevOwner);
        if (loser) loser.stats.lost += 1;
      }
      this.onEvent(EVENT.CAPTURE, {
        planet: planet.id,
        from: prevOwner,
        to: fleet.owner,
        emote: arriver?.cosmetics?.emote || null,
        x: planet.x,
        y: planet.y,
      });
    } else {
      // Defended (ships >= 0).
      this.onEvent(EVENT.DEFEND, {
        planet: planet.id,
        owner: planet.owner,
        attacker: fleet.owner,
        survived: Math.round(planet.ships),
        lost: Math.round(before - planet.ships),
      });
    }
  }

  countPlanets(playerId) {
    let n = 0;
    for (const p of this.planets) if (p.owner === playerId) n++;
    return n;
  }

  hasFleets(playerId) {
    for (const f of this.fleets) if (f.owner === playerId) return true;
    return false;
  }

  checkEndConditions() {
    // Eliminate players with no planets and no fleets in transit.
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      if (this.countPlanets(player.id) === 0 && !this.hasFleets(player.id)) {
        player.alive = false;
        // Dissolve their alliances.
        for (const key of [...this.alliances]) {
          if (key.split('|').includes(player.id)) this.alliances.delete(key);
        }
        this.onEvent(EVENT.ELIMINATED, { player: player.id });
      }
    }

    const alive = [...this.players.values()].filter((p) => p.alive);
    if (alive.length <= 1) {
      this.over = true;
      this.winnerId = alive[0]?.id ?? null;
    }
  }

  // ---- Networking -------------------------------------------------------
  // Static info sent once at match start (positions never change).
  startPayload() {
    return {
      seed: this.seed,
      world: { planets: this.planets.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), r: p.radius, size: p.size, max: p.maxShips })) },
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        slot: p.slot,
        isBot: p.isBot,
        cosmetics: p.cosmetics,
      })),
    };
  }

  // Compact per-frame snapshot. Planets keyed by id with owner slot + ship count.
  snapshot() {
    const ownerSlot = (id) => (id == null ? -1 : this.players.get(id)?.slot ?? -1);
    return {
      t: Math.round(this.elapsed * 1000),
      p: this.planets.map((p) => [p.id, ownerSlot(p.owner), Math.round(p.ships)]),
      f: this.fleets.map((f) => [
        f.id,
        ownerSlot(f.owner),
        Math.round(f.x),
        Math.round(f.y),
        Math.round(f.angle * 100),
        f.ships,
        f.toId,
      ]),
      a: [...this.alliances],
      over: this.over,
    };
  }

  results() {
    return {
      winner: this.winnerId,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        slot: p.slot,
        isBot: p.isBot,
        alive: p.alive,
        planets: this.countPlanets(p.id),
        stats: p.stats,
        cosmetics: p.cosmetics,
      })),
    };
  }
}
