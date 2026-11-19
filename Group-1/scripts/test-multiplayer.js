import { spawn } from 'child_process';
import { io } from 'socket.io-client';

async function runMultiplayerTest() {
  console.log('\x1b[36m%s\x1b[0m', '--- STARTING 4-PLAYER MULTIPLAYER & ROOM CAPACITY TEST ---');

  const server = spawn('npx', ['tsx', 'server/src/index.ts'], { shell: true, stdio: 'pipe' });
  await new Promise((r) => setTimeout(r, 5500));

  let passed = false;

  try {
    const createClient = (name) => {
      return io('http://127.0.0.1:3001', {
        transports: ['polling', 'websocket'],
      });
    };

    // Client 1: Host (Vanguard)
    const host = createClient('Vanguard-Host');
    await new Promise((res) => host.on('connect', res));

    const hostRes = await new Promise((res) => {
      host.emit('create_room', { playerName: 'HOST-VANGUARD', operativeClass: 'vanguard' }, res);
    });

    if (!hostRes.success || !hostRes.roomInfo) {
      throw new Error('Host failed to create room: ' + hostRes.error);
    }

    const roomCode = hostRes.roomInfo.code;
    console.log('\x1b[32m%s\x1b[0m', `✔ Host created Room ${roomCode}`);

    // Client 2: Phantom
    const client2 = createClient('Phantom-Client');
    await new Promise((res) => client2.on('connect', res));
    const joinRes2 = await new Promise((res) => {
      client2.emit('join_room', { roomCode, playerName: 'P2-PHANTOM', operativeClass: 'phantom' }, res);
    });
    if (!joinRes2.success) throw new Error('Client 2 failed to join');
    console.log('\x1b[32m%s\x1b[0m', '✔ Client 2 (Phantom) joined Room');

    // Client 3: Breacher
    const client3 = createClient('Breacher-Client');
    await new Promise((res) => client3.on('connect', res));
    const joinRes3 = await new Promise((res) => {
      client3.emit('join_room', { roomCode, playerName: 'P3-BREACHER', operativeClass: 'breacher' }, res);
    });
    if (!joinRes3.success) throw new Error('Client 3 failed to join');
    console.log('\x1b[32m%s\x1b[0m', '✔ Client 3 (Breacher) joined Room');

    // Client 4: Medic
    const client4 = createClient('Medic-Client');
    await new Promise((res) => client4.on('connect', res));
    const joinRes4 = await new Promise((res) => {
      client4.emit('join_room', { roomCode, playerName: 'P4-MEDIC', operativeClass: 'medic' }, res);
    });
    if (!joinRes4.success) throw new Error('Client 4 failed to join');
    console.log('\x1b[32m%s\x1b[0m', '✔ Client 4 (Medic) joined Room (Capacity reached: 4/4)');

    // Client 5: Attempt to join full room -> MUST throw RoomFullException!
    const client5 = createClient('Extra-Client');
    await new Promise((res) => client5.on('connect', res));
    const joinRes5 = await new Promise((res) => {
      client5.emit('join_room', { roomCode, playerName: 'P5-EXTRA', operativeClass: 'vanguard' }, res);
    });

    if (joinRes5.success) {
      throw new Error('Room allowed a 5th player! RoomFullException failed.');
    }
    console.log(
      '\x1b[32m%s\x1b[0m',
      `✔ Client 5 join rejected as expected: "${joinRes5.error}" [Code: ${joinRes5.code}]`
    );

    // Host starts match
    const startRes = await new Promise((res) => {
      host.emit('start_match', { roomCode }, res);
    });
    if (!startRes.success) throw new Error('Failed to start match: ' + startRes.error);

    // Verify all 4 clients receive snapshots
    let clientsReceivedSnapshot = new Set();
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for 4-player snapshot broadcast')), 5000);

      const checkAll = () => {
        if (clientsReceivedSnapshot.size === 4) {
          clearTimeout(timeout);
          resolve();
        }
      };

      host.on('game_snapshot', () => { clientsReceivedSnapshot.add('host'); checkAll(); });
      client2.on('game_snapshot', () => { clientsReceivedSnapshot.add('c2'); checkAll(); });
      client3.on('game_snapshot', () => { clientsReceivedSnapshot.add('c3'); checkAll(); });
      client4.on('game_snapshot', () => { clientsReceivedSnapshot.add('c4'); checkAll(); });
    });

    console.log('\x1b[32m%s\x1b[0m', '✔ All 4 simultaneous connected clients received synchronized snapshots!');
    passed = true;

    host.disconnect();
    client2.disconnect();
    client3.disconnect();
    client4.disconnect();
    client5.disconnect();
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Multiplayer Test Failed:', err);
  } finally {
    spawn('taskkill', ['/pid', server.pid.toString(), '/T', '/F'], { shell: true });
  }

  if (passed) {
    console.log('\x1b[32m%s\x1b[0m', '=== 4-PLAYER MULTIPLAYER TEST PASSED! ===');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMultiplayerTest();
