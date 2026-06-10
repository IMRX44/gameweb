// A single match room: handles the lobby, fills empty seats with bots,
// runs the fixed-timestep simulation, and broadcasts snapshots to members.

import { nanoid } from 'nanoid';
import {
  MSG,
  TICK_MS,
  SNAPSHOT_EVERY,
  COUNTDOWN_SECONDS,
  MATCH_MAX_PLAYERS,
} from '@nebula/shared/constants.js';
import { Game } from '../game/Game.js';
import { BotController } from '../game/bot.js';
import { recordGame } from '../store/accounts.js';

const BOT_NAMES = [
  'Nova', 'Vega', 'Orion', 'Lyra', 'Draco', 'Atlas', 'Rigel', 'Cygnus',
  'Pulsar', 'Quasar', 'Nebari', 'Centauri', 'Andromeda', 'Helios',
];

export class Room {
  /**
   * @param {import('socket.io').Server} io
   * @param {object} opts { mode: 'quick'|'online', targetSeats:number, onEmpty:Function }
   */
  constructor(io, opts = {}) {
    this.io = io;
    this.id = nanoid(8);
    this.mode = opts.mode || 'online';
    this.targetSeats = Math.min(opts.targetSeats || 6, MATCH_MAX_PLAYERS);
    this.onEmpty = opts.onEmpty || (() => {});

    this.phase = 'lobby'; // lobby -> countdown -> playing -> ended
    this.humans = new Map(); // socketId -> { socket, account, slot, ready, playerId }
    this.bots = []; // { id, slot, controller, name }
    this.game = null;
    this.loop = null;
    this.tickCount = 0;
    this.countdownTimer = null;
    this.lobbyTimer = null;
    this.destroyed = false;
  }

  get humanCount() {
    return this.humans.size;
  }

  get seatsUsed() {
    return this.humans.size;
  }

  isJoinable() {
    return this.phase === 'lobby' && this.humans.size < this.targetSeats && !this.destroyed;
  }

  addHuman(socket, account) {
    if (!this.isJoinable()) return false;
    const slot = this.nextSlot();
    this.humans.set(socket.id, {
      socket,
      account,
      slot,
      ready: false,
      playerId: account.id,
    });
    socket.join(this.id);
    socket.data.roomId = this.id;
    this.broadcastLobby();

    // Quick matches start their countdown immediately.
    if (this.mode === 'quick') {
      this.beginCountdown();
    } else {
      this.maybeStartOnline();
    }
    return true;
  }

  nextSlot() {
    const used = new Set([...this.humans.values()].map((h) => h.slot));
    let s = 0;
    while (used.has(s)) s++;
    return s;
  }

  removeHuman(socketId) {
    const h = this.humans.get(socketId);
    if (!h) return;
    this.humans.delete(socketId);

    if (this.phase === 'lobby') {
      this.broadcastLobby();
      // Cancel a pending online start if the room emptied out.
      if (this.humans.size === 0) {
        this.clearTimers();
        this.scheduleDestroy();
      }
    } else if (this.phase === 'playing') {
      // The player's planets keep existing but stop receiving orders; bots
      // don't take over a human's empire. They simply become idle and will be
      // conquered. If everyone left, end the match.
      if (this.humans.size === 0) {
        this.endMatch();
      } else {
        this.broadcastLobby();
      }
    }
  }

  maybeStartOnline() {
    if (this.phase !== 'lobby') return;
    if (this.humans.size >= this.targetSeats) {
      this.beginCountdown();
      return;
    }
    // First human starts a short lobby timer; others may join meanwhile.
    if (this.humans.size >= 1 && !this.lobbyTimer) {
      this.lobbyTimer = setTimeout(() => {
        this.lobbyTimer = null;
        if (this.phase === 'lobby' && this.humans.size >= 1) this.beginCountdown();
      }, 8000);
    }
  }

  beginCountdown() {
    if (this.phase !== 'lobby') return;
    this.clearTimers();
    this.phase = 'countdown';
    let remaining = COUNTDOWN_SECONDS;
    this.io.to(this.id).emit(MSG.LOBBY, this.lobbyState(remaining));
    this.countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.startMatch();
      } else {
        this.io.to(this.id).emit(MSG.LOBBY, this.lobbyState(remaining));
      }
    }, 1000);
  }

  fillBots() {
    const seatsToFill = Math.max(this.targetSeats, Math.max(2, this.humans.size + 1)) - this.humans.size;
    const usedSlots = new Set([...this.humans.values()].map((h) => h.slot));
    let slot = 0;
    const namePool = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < seatsToFill; i++) {
      while (usedSlots.has(slot)) slot++;
      usedSlots.add(slot);
      const id = `bot_${nanoid(6)}`;
      const difficulty = 0.35 + Math.random() * 0.5;
      this.bots.push({
        id,
        slot,
        name: namePool[i % namePool.length] || `Bot ${i + 1}`,
        controller: new BotController(id, difficulty),
        cosmetics: {},
      });
      slot++;
    }
  }

  buildSeats() {
    const seats = [];
    for (const h of this.humans.values()) {
      seats.push({
        id: h.playerId,
        name: h.account.name,
        slot: h.slot,
        isBot: false,
        cosmetics: h.account.loadout || {},
      });
    }
    for (const b of this.bots) {
      seats.push({ id: b.id, name: b.name, slot: b.slot, isBot: true, cosmetics: {} });
    }
    seats.sort((a, b) => a.slot - b.slot);
    return seats;
  }

  startMatch() {
    if (this.phase !== 'countdown') return;
    this.fillBots();
    const seats = this.buildSeats();

    this.game = new Game(seats, (type, payload) => {
      // Forward gameplay events to clients for visual/audio feedback.
      this.io.to(this.id).emit(MSG.EVENT, { type, payload });
    });

    this.phase = 'playing';
    this.tickCount = 0;

    // Tell each human their identity + the static world.
    const start = this.game.startPayload();
    for (const h of this.humans.values()) {
      h.socket.emit(MSG.START, { ...start, youId: h.playerId, roomId: this.id });
    }

    const dt = TICK_MS / 1000;
    this.loop = setInterval(() => this.step(dt), TICK_MS);
  }

  step(dt) {
    if (this.phase !== 'playing' || !this.game) return;

    // Bots think.
    for (const b of this.bots) {
      const player = this.game.players.get(b.id);
      if (player && player.alive) b.controller.update(this.game, dt);
    }

    this.game.tick(dt);
    this.tickCount++;

    if (this.tickCount % SNAPSHOT_EVERY === 0 || this.game.over) {
      this.io.to(this.id).emit(MSG.SNAPSHOT, this.game.snapshot());
    }

    if (this.game.over) {
      this.endMatch();
    }
  }

  endMatch() {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    this.clearTimers();
    if (this.loop) {
      clearInterval(this.loop);
      this.loop = null;
    }

    const results = this.game ? this.game.results() : { winner: null, players: [] };

    // Persist win/loss for humans.
    for (const h of this.humans.values()) {
      const won = results.winner === h.playerId;
      recordGame(h.account.token, won);
    }

    this.io.to(this.id).emit(MSG.GAME_OVER, results);
    this.scheduleDestroy(8000);
  }

  // ---- Player intents (validated by Game) ----
  handleFleet(socketId, fromId, toId, ratio) {
    if (this.phase !== 'playing' || !this.game) return;
    const h = this.humans.get(socketId);
    if (!h) return;
    this.game.sendFleet(h.playerId, Number(fromId), Number(toId), Number(ratio));
  }

  handleAlly(socketId, targetSlot, accept) {
    if (this.phase !== 'playing' || !this.game) return;
    const h = this.humans.get(socketId);
    if (!h) return;
    const targetId = this.slotToPlayerId(targetSlot);
    if (!targetId) return;
    if (accept === false) this.game.breakAlly(h.playerId, targetId);
    else this.game.proposeAlly(h.playerId, targetId);
  }

  handleChat(socketId, text) {
    const h = this.humans.get(socketId);
    if (!h) return;
    const msg = String(text || '').slice(0, 160);
    if (!msg.trim()) return;
    this.io.to(this.id).emit(MSG.CHAT, { from: h.account.name, slot: h.slot, text: msg });
  }

  slotToPlayerId(slot) {
    for (const h of this.humans.values()) if (h.slot === slot) return h.playerId;
    for (const b of this.bots) if (b.slot === slot) return b.id;
    return null;
  }

  // ---- Lobby state ----
  lobbyState(countdown = null) {
    return {
      roomId: this.id,
      mode: this.mode,
      phase: this.phase,
      countdown,
      targetSeats: this.targetSeats,
      players: [...this.humans.values()].map((h) => ({
        name: h.account.name,
        slot: h.slot,
        ready: h.ready,
      })),
    };
  }

  broadcastLobby() {
    this.io.to(this.id).emit(MSG.LOBBY, this.lobbyState());
  }

  clearTimers() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.lobbyTimer) clearTimeout(this.lobbyTimer);
    this.countdownTimer = null;
    this.lobbyTimer = null;
  }

  scheduleDestroy(delay = 1000) {
    setTimeout(() => {
      if (this.humans.size === 0 || this.phase === 'ended') this.destroy();
    }, delay);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearTimers();
    if (this.loop) clearInterval(this.loop);
    this.loop = null;
    this.onEmpty(this.id);
  }
}
