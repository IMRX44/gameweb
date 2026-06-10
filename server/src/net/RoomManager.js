// Tracks all active rooms and routes players into them.

import { Room } from './Room.js';

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
  }

  remove = (roomId) => {
    this.rooms.delete(roomId);
  };

  // Solo / instant match against bots.
  createQuick(socket, account) {
    const room = new Room(this.io, { mode: 'quick', targetSeats: 6, onEmpty: this.remove });
    this.rooms.set(room.id, room);
    room.addHuman(socket, account);
    return room;
  }

  // Join an open public lobby, or create one.
  joinOnline(socket, account) {
    for (const room of this.rooms.values()) {
      if (room.mode === 'online' && room.isJoinable()) {
        room.addHuman(socket, account);
        return room;
      }
    }
    const room = new Room(this.io, { mode: 'online', targetSeats: 8, onEmpty: this.remove });
    this.rooms.set(room.id, room);
    room.addHuman(socket, account);
    return room;
  }

  getBySocket(socket) {
    const id = socket.data.roomId;
    return id ? this.rooms.get(id) : undefined;
  }

  handleDisconnect(socket) {
    const room = this.getBySocket(socket);
    if (room) room.removeHuman(socket.id);
  }

  stats() {
    let playing = 0;
    let lobby = 0;
    let humans = 0;
    for (const r of this.rooms.values()) {
      if (r.phase === 'playing') playing++;
      if (r.phase === 'lobby' || r.phase === 'countdown') lobby++;
      humans += r.humanCount;
    }
    return { rooms: this.rooms.size, playing, lobby, humans };
  }
}
