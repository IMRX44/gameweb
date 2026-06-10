// Simple but competent bot AI.
// Bots evaluate the board periodically and either expand to weak neutral
// planets, reinforce threatened frontiers, or attack vulnerable enemies.
// They are intentionally not perfect — they make human-scale decisions.

import { dist } from '@nebula/shared/constants.js';

export class BotController {
  /**
   * @param {string} playerId
   * @param {number} difficulty 0..1 (reaction speed + aggression)
   */
  constructor(playerId, difficulty = 0.5) {
    this.id = playerId;
    this.difficulty = difficulty;
    this.cooldown = 1.5 + Math.random() * 1.5;
  }

  update(game, dt) {
    const me = game.players.get(this.id);
    if (!me || !me.alive || game.over) return;

    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    // Faster bots think more often.
    this.cooldown = 2.2 - this.difficulty * 1.4 + Math.random();

    const mine = game.planets.filter((p) => p.owner === this.id);
    if (mine.length === 0) return;

    // Pick our strongest planet as the launch base.
    const base = mine.reduce((a, b) => (a.ships > b.ships ? a : b));
    if (base.ships < 8) return; // not enough to risk

    // Candidate targets: any planet not owned by us or an ally.
    const targets = game.planets.filter(
      (p) => p.owner !== this.id && !game.areAllied(p.owner, this.id),
    );
    if (targets.length === 0) return;

    // Score targets: prefer close, weakly-defended, and neutral planets.
    let best = null;
    let bestScore = -Infinity;
    for (const t of targets) {
      const d = dist(base.x, base.y, t.x, t.y);
      const neutralBonus = t.owner == null ? 1.4 : 1.0;
      const reachable = base.ships > t.ships + 2 ? 1 : 0.2;
      // Lower defense and closer distance => higher score.
      const score = (neutralBonus * (1 / (1 + t.ships))) * (1 / (1 + d / 800)) * reachable;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }

    if (!best) return;

    // Send enough to (likely) take it, scaled by aggression.
    const needed = best.ships + 3;
    const aggression = 0.45 + this.difficulty * 0.4;
    let ratio = Math.min(1, Math.max(needed / base.ships, aggression));
    if (base.ships * ratio < best.ships + 1) {
      // Not worth a doomed attack unless it's neutral and cheap.
      if (best.owner != null) return;
    }
    game.sendFleet(this.id, base.id, best.id, ratio);
  }
}
