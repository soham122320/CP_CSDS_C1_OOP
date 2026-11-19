/**
 * Socket.io Client Networking & Latency Tracker
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import { io, Socket } from 'socket.io-client';
import { GameSnapshot, PlayerInputPacket, RoomInfo, OperativeClass } from '@shared/types.js';

export class SocketClient {
  public socket: Socket | null = null;
  public pingMs: number = 0;
  private pingInterval: any = null;

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect to same origin or host
      this.socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.startPingLoop();
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        // Still allow offline/local fallback
        resolve();
      });

      this.socket.on('latency_pong', (startTs: number) => {
        this.pingMs = Math.round(Date.now() - startTs);
      });
    });
  }

  private startPingLoop(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('latency_ping', Date.now());
      }
    }, 2000);
  }

  public createRoom(playerName: string, operativeClass: OperativeClass): Promise<{ success: boolean; roomInfo?: RoomInfo; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Socket not connected' });
      this.socket.emit('create_room', { playerName, operativeClass }, (res: any) => resolve(res));
    });
  }

  public joinRoom(roomCode: string, playerName: string, operativeClass: OperativeClass): Promise<{ success: boolean; roomInfo?: RoomInfo; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Socket not connected' });
      this.socket.emit('join_room', { roomCode, playerName, operativeClass }, (res: any) => resolve(res));
    });
  }

  public startSoloGame(playerName: string, operativeClass: OperativeClass): Promise<{ success: boolean; roomInfo?: RoomInfo; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        // Instant offline fallback for solo training mode
        const offlineInfo: RoomInfo = {
          code: 'SOLO',
          hostId: 'local_solo_commander',
          playerCount: 1,
          maxPlayers: 4,
          status: 'playing',
          players: [
            { id: 'local_solo_commander', name: playerName || 'OPERATIVE-01', slotIndex: 0, operativeClass, isReady: true, isBot: false, ping: 0 },
            { id: 'bot_squad_1', name: 'VALKYRIE-AI', slotIndex: 1, operativeClass: 'phantom', isReady: true, isBot: true, ping: 0 },
            { id: 'bot_squad_2', name: 'SPECTRE-AI', slotIndex: 2, operativeClass: 'breacher', isReady: true, isBot: true, ping: 0 },
            { id: 'bot_squad_3', name: 'AEGIS-AI', slotIndex: 3, operativeClass: 'medic', isReady: true, isBot: true, ping: 0 },
          ],
        };
        return resolve({ success: true, roomInfo: offlineInfo });
      }
      this.socket.emit('start_solo', { playerName, operativeClass }, (res: any) => resolve(res));
    });
  }

  public selectClass(roomCode: string, operativeClass: OperativeClass): void {
    this.socket?.emit('select_class', { roomCode, operativeClass });
  }

  public toggleReady(roomCode: string): void {
    this.socket?.emit('toggle_ready', { roomCode });
  }

  public startMatch(roomCode: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Socket not connected' });
      this.socket.emit('start_match', { roomCode }, (res: any) => resolve(res));
    });
  }

  public sendInput(input: PlayerInputPacket): void {
    this.socket?.emit('player_input', input);
  }

  public onRoomUpdated(callback: (info: RoomInfo) => void): void {
    this.socket?.on('room_updated', callback);
  }

  public onMatchStarted(callback: (info: RoomInfo) => void): void {
    this.socket?.on('match_started', callback);
  }

  public onSnapshot(callback: (snapshot: GameSnapshot) => void): void {
    this.socket?.on('game_snapshot', callback);
  }

  public disconnect(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketClient = new SocketClient();
