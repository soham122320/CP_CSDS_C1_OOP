import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import os from 'os';
import { RoomManager } from './roomManager.js';
import { PlayerInputPacket, OperativeClass } from '@shared/types.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 5000,
  pingTimeout: 10000,
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const lanIp = getLanIp();
const roomManager = new RoomManager(io);

app.get('/api/info', (req, res) => {
  res.json({
    status: 'online',
    game: 'SHARD-4: BLACKOUT PROTOCOL',
    lanIp,
    port: PORT,
    roomsCount: roomManager.getActiveRoomsCount(),
  });
});

io.on('connection', (socket: Socket) => {
  // Ping latency calculation
  socket.on('latency_ping', (timestamp: number) => {
    socket.emit('latency_pong', timestamp);
  });

  // Create room
  socket.on('create_room', (data: { playerName: string; operativeClass: OperativeClass }, callback) => {
    try {
      const room = roomManager.createRoom(socket, data.playerName, data.operativeClass);
      callback({ success: true, roomInfo: room.getInfo() });
    } catch (err: any) {
      callback({ success: false, error: err.message, code: err.code || 'CREATE_ERROR' });
    }
  });

  // Join room
  socket.on('join_room', (data: { roomCode: string; playerName: string; operativeClass: OperativeClass }, callback) => {
    try {
      const room = roomManager.joinRoom(socket, data.roomCode, data.playerName, data.operativeClass);
      callback({ success: true, roomInfo: room.getInfo() });
    } catch (err: any) {
      callback({ success: false, error: err.message, code: err.code || 'JOIN_ERROR' });
    }
  });

  // Start Solo + 3 AI Squadmates
  socket.on('start_solo', (data: { playerName: string; operativeClass: OperativeClass }, callback) => {
    try {
      const room = roomManager.createSoloGame(socket, data.playerName, data.operativeClass);
      callback({ success: true, roomInfo: room.getInfo() });
    } catch (err: any) {
      callback({ success: false, error: err.message, code: err.code || 'SOLO_ERROR' });
    }
  });

  // Class Select / Change
  socket.on('select_class', (data: { roomCode: string; operativeClass: OperativeClass }) => {
    roomManager.selectClass(socket, data.roomCode, data.operativeClass);
  });

  // Ready up in lobby
  socket.on('toggle_ready', (data: { roomCode: string }) => {
    roomManager.toggleReady(socket, data.roomCode);
  });

  // Start game from lobby
  socket.on('start_match', (data: { roomCode: string }, callback) => {
    try {
      roomManager.startMatch(socket, data.roomCode);
      if (callback) callback({ success: true });
    } catch (err: any) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Player Input stream
  socket.on('player_input', (input: PlayerInputPacket) => {
    roomManager.handlePlayerInput(socket.id, input);
  });

  // Disconnect & Reconnect handling
  socket.on('disconnect', (reason) => {
    roomManager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[SHARD-4 SERVER] Running at http://${HOST}:${PORT}`);
  console.log(`[SHARD-4 SERVER] LAN IP detected: http://${lanIp}:${PORT}`);
  console.log(`[SHARD-4 SERVER] Ready for 4-player tactical sessions.`);
});
