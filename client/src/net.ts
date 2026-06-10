// Socket.IO client wrapper for the realtime match protocol.
import { io, type Socket } from 'socket.io-client';
import { MSG } from './config';
import { getToken } from './api';
import type { GameEvent, GameResults, LobbyState, Snapshot, StartPayload } from './types';

export interface NetHandlers {
  onLobby?: (s: LobbyState) => void;
  onStart?: (s: StartPayload) => void;
  onSnapshot?: (s: Snapshot) => void;
  onEvent?: (e: GameEvent) => void;
  onGameOver?: (r: GameResults) => void;
  onChat?: (c: { from: string; slot: number; text: string }) => void;
  onError?: (e: { error: string }) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class NetClient {
  private socket: Socket | null = null;
  private handlers: NetHandlers = {};

  setHandlers(h: NetHandlers) {
    this.handlers = h;
  }

  connect() {
    if (this.socket) return;
    // Same-origin connection; Vite proxies /socket.io to the server in dev.
    this.socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 800,
    });

    this.socket.on('connect', () => this.handlers.onConnectionChange?.(true));
    this.socket.on('disconnect', () => this.handlers.onConnectionChange?.(false));

    this.socket.on(MSG.LOBBY, (s: LobbyState) => this.handlers.onLobby?.(s));
    this.socket.on(MSG.START, (s: StartPayload) => this.handlers.onStart?.(s));
    this.socket.on(MSG.SNAPSHOT, (s: Snapshot) => this.handlers.onSnapshot?.(s));
    this.socket.on(MSG.EVENT, (e: GameEvent) => this.handlers.onEvent?.(e));
    this.socket.on(MSG.GAME_OVER, (r: GameResults) => this.handlers.onGameOver?.(r));
    this.socket.on(MSG.CHAT, (c: any) => this.handlers.onChat?.(c));
    this.socket.on(MSG.ERROR, (e: any) => this.handlers.onError?.(e));
  }

  join(mode: 'quick' | 'online'): Promise<{ ok: boolean; roomId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ ok: false, error: 'not_connected' });
      this.socket.emit(MSG.JOIN, { token: getToken(), mode }, (ack: any) => {
        resolve(ack || { ok: false, error: 'no_ack' });
      });
    });
  }

  sendFleet(from: number, to: number, ratio: number) {
    this.socket?.emit(MSG.SEND_FLEET, { from, to, ratio });
  }

  proposeAlly(slot: number) {
    this.socket?.emit(MSG.ALLY, { slot, accept: true });
  }

  breakAlly(slot: number) {
    this.socket?.emit(MSG.BREAK_ALLY, { slot });
  }

  chat(text: string) {
    this.socket?.emit(MSG.CHAT, { text });
  }

  leave() {
    // Leaving a room = disconnecting then reconnecting fresh for the menu.
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const net = new NetClient();
