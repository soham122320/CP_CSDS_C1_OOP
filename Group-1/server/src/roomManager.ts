/**
 * Room Lifecycle & Multiplayer Session Manager
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { Server, Socket } from 'socket.io';
import { RoomInfo, OperativeClass, PlayerInputPacket } from '@shared/types.js';
import { RoomFullException } from '@shared/exceptions.js';
import { GameEngine } from './gameEngine.js';
import { OperativeFactory, Operative } from './entities/Operative.js';
import { CONSTANTS } from '@shared/constants.js';

interface PlayerSlot {
  socketId: string;
  name: string;
  slotIndex: number;
  operativeClass: OperativeClass;
  isReady: boolean;
  isBot: boolean;
  ping: number;
  lastSeenMs: number;
}

export class GameRoom {
  public readonly code: string;
  public hostId: string;
  public status: 'lobby' | 'playing' | 'failed' | 'victory' = 'lobby';
  public slots: (PlayerSlot | null)[] = [null, null, null, null];
  public engine: GameEngine | null = null;
  private io: Server;

  constructor(code: string, hostSocket: Socket, io: Server, hostName: string, hostClass: OperativeClass) {
    this.code = code;
    this.hostId = hostSocket.id;
    this.io = io;

    // Slot 0 is host
    this.slots[0] = {
      socketId: hostSocket.id,
      name: hostName || 'Operative-1',
      slotIndex: 0,
      operativeClass: hostClass || 'vanguard',
      isReady: true,
      isBot: false,
      ping: 15,
      lastSeenMs: Date.now(),
    };

    hostSocket.join(code);
  }

  public getPlayerCount(): number {
    return this.slots.filter((s) => s !== null && !s.isBot).length;
  }

  public getInfo(): RoomInfo {
    const players = this.slots
      .filter((s): s is PlayerSlot => s !== null)
      .map((s) => ({
        id: s.socketId,
        name: s.name,
        slotIndex: s.slotIndex,
        operativeClass: s.operativeClass,
        isReady: s.isReady,
        isBot: s.isBot,
        ping: s.ping,
      }));

    return {
      code: this.code,
      hostId: this.hostId,
      playerCount: this.getPlayerCount(),
      maxPlayers: 4,
      status: this.status,
      players,
    };
  }

  public addPlayer(socket: Socket, name: string, operativeClass: OperativeClass): PlayerSlot {
    if (this.getPlayerCount() >= 4) {
      throw new RoomFullException(this.code, 4);
    }

    // Find first free slot
    let freeIndex = this.slots.findIndex((s) => s === null);
    if (freeIndex === -1) {
      throw new RoomFullException(this.code, 4);
    }

    const newSlot: PlayerSlot = {
      socketId: socket.id,
      name: name || `Operative-${freeIndex + 1}`,
      slotIndex: freeIndex,
      operativeClass: operativeClass || 'phantom',
      isReady: false,
      isBot: false,
      ping: 20,
      lastSeenMs: Date.now(),
    };

    this.slots[freeIndex] = newSlot;
    socket.join(this.code);
    return newSlot;
  }

  public fillBots(): void {
    const availableClasses: OperativeClass[] = ['vanguard', 'phantom', 'breacher', 'medic'];
    const botNames = ['ECHO-AI', 'VALKYRIE-AI', 'SPECTRE-AI', 'AEGIS-AI'];

    for (let i = 0; i < 4; i++) {
      if (this.slots[i] === null) {
        // Pick class not yet heavily used
        const usedClasses = this.slots.filter((s) => s !== null).map((s) => s!.operativeClass);
        const freeClass = availableClasses.find((c) => !usedClasses.includes(c)) || 'medic';

        this.slots[i] = {
          socketId: `bot_${i}_${Date.now()}`,
          name: botNames[i],
          slotIndex: i,
          operativeClass: freeClass,
          isReady: true,
          isBot: true,
          ping: 0,
          lastSeenMs: Date.now(),
        };
      }
    }
  }

  public startMatch(): void {
    this.status = 'playing';
    this.fillBots(); // Fill any empty slots with AI bots

    this.engine = new GameEngine(this.code, this.io);

    // Instantiate Operative subclasses polymorphically
    for (const slot of this.slots) {
      if (slot) {
        const op = OperativeFactory.create(
          slot.operativeClass,
          slot.socketId,
          slot.name,
          slot.slotIndex,
          slot.isBot
        );
        this.engine.addOperative(op);
      }
    }

    this.engine.start();
    this.io.to(this.code).emit('match_started', this.getInfo());
  }

  public handleDisconnect(socketId: string): void {
    const slot = this.slots.find((s) => s && s.socketId === socketId);
    if (!slot) return;

    slot.lastSeenMs = Date.now();

    // If game in progress, give 60s grace period for reconnection
    if (this.status === 'playing') {
      setTimeout(() => {
        // If still disconnected after grace period, convert slot to bot
        if (slot.socketId === socketId) {
          slot.isBot = true;
          slot.name = `${slot.name} [AUTOPILOT]`;
          const op = this.engine?.operatives.get(socketId);
          if (op) {
            op.isBot = true;
          }
        }
      }, CONSTANTS.RECONNECT_GRACE_PERIOD_SEC * 1000);
    } else {
      // In lobby, remove immediately
      const idx = this.slots.findIndex((s) => s && s.socketId === socketId);
      if (idx !== -1) {
        this.slots[idx] = null;
      }
    }

    // Host migration if host leaves
    if (this.hostId === socketId) {
      const remainingHuman = this.slots.find((s) => s && !s.isBot && s.socketId !== socketId);
      if (remainingHuman) {
        this.hostId = remainingHuman.socketId;
      }
    }

    this.io.to(this.code).emit('room_updated', this.getInfo());
  }
}

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private socketRoomMap: Map<string, string> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public getActiveRoomsCount(): number {
    return this.rooms.size;
  }

  private generateRoomCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  }

  public createRoom(socket: Socket, hostName: string, hostClass: OperativeClass): GameRoom {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const room = new GameRoom(code, socket, this.io, hostName, hostClass);
    this.rooms.set(code, room);
    this.socketRoomMap.set(socket.id, code);

    this.io.to(code).emit('room_updated', room.getInfo());
    return room;
  }

  public createSoloGame(socket: Socket, playerName: string, operativeClass: OperativeClass): GameRoom {
    const code = `S${this.generateRoomCode().slice(0, 3)}`;
    const room = new GameRoom(code, socket, this.io, playerName || 'Solo Commander', operativeClass);
    this.rooms.set(code, room);
    this.socketRoomMap.set(socket.id, code);

    // Instant start with 3 AI bots!
    room.startMatch();
    return room;
  }

  public joinRoom(socket: Socket, roomCode: string, playerName: string, operativeClass: OperativeClass): GameRoom {
    const normalized = roomCode.toUpperCase().trim();
    const room = this.rooms.get(normalized);
    if (!room) {
      throw new Error(`Room with code "${normalized}" not found.`);
    }

    room.addPlayer(socket, playerName, operativeClass);
    this.socketRoomMap.set(socket.id, normalized);

    this.io.to(normalized).emit('room_updated', room.getInfo());
    return room;
  }

  public selectClass(socket: Socket, roomCode: string, operativeClass: OperativeClass): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const slot = room.slots.find((s) => s && s.socketId === socket.id);
    if (slot) {
      slot.operativeClass = operativeClass;
      this.io.to(roomCode).emit('room_updated', room.getInfo());
    }
  }

  public toggleReady(socket: Socket, roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const slot = room.slots.find((s) => s && s.socketId === socket.id);
    if (slot) {
      slot.isReady = !slot.isReady;
      this.io.to(roomCode).emit('room_updated', room.getInfo());
    }
  }

  public startMatch(socket: Socket, roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== socket.id) {
      throw new Error('Only the room host can start the mission.');
    }
    room.startMatch();
  }

  public handlePlayerInput(socketId: string, input: PlayerInputPacket): void {
    const code = this.socketRoomMap.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (room && room.engine) {
      room.engine.enqueueInput(socketId, input);
    }
  }

  public handleDisconnect(socketId: string): void {
    const code = this.socketRoomMap.get(socketId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (room) {
      room.handleDisconnect(socketId);
      if (room.getPlayerCount() === 0 && room.status === 'lobby') {
        this.rooms.delete(code);
      }
    }
    this.socketRoomMap.delete(socketId);
  }
}
