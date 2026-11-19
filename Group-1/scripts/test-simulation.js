import { spawn } from 'child_process';
import { io } from 'socket.io-client';

async function runSimulation() {
  console.log('\x1b[36m%s\x1b[0m', '--- STARTING E2E GAME SIMULATION TEST ---');

  // 1. Launch server
  const server = spawn('npx', ['tsx', 'server/src/index.ts'], { shell: true, stdio: 'pipe' });
  await new Promise((r) => setTimeout(r, 5500));

  let testPassed = false;

  try {
    const socket = io('http://127.0.0.1:3001', {
      transports: ['polling', 'websocket'],
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    console.log('\x1b[32m%s\x1b[0m', '✔ Client connected to authoritative server via Socket.io');

    // 2. Test Solo + 3 AI Squadmates instant launch
    const soloRes = await new Promise((resolve) => {
      socket.emit(
        'start_solo',
        { playerName: 'COMMANDER-TEST', operativeClass: 'vanguard' },
        (res) => resolve(res)
      );
    });

    if (!soloRes.success || !soloRes.roomInfo) {
      throw new Error('Failed to start solo session: ' + soloRes.error);
    }

    console.log(
      '\x1b[32m%s\x1b[0m',
      `✔ Solo session started in Room ${soloRes.roomInfo.code} with ${soloRes.roomInfo.players.length} operatives`
    );

    // Verify all 4 slots filled
    if (soloRes.roomInfo.players.length !== 4) {
      throw new Error(`Expected 4 players (1 human + 3 AI), got ${soloRes.roomInfo.players.length}`);
    }

    // 3. Receive and verify snapshots
    let snapshotCount = 0;
    let receivedFirstSnapshot = false;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for snapshots')), 5000);

      socket.on('game_snapshot', (snapshot) => {
        snapshotCount++;
        if (!receivedFirstSnapshot) {
          receivedFirstSnapshot = true;
          console.log('\x1b[32m%s\x1b[0m', `✔ First Authoritative Snapshot received (Tick #${snapshot.tick})`);
          console.log(`  - Operatives count: ${snapshot.operatives.length}`);
          console.log(`  - Enemies in Sector A: ${snapshot.enemies.length}`);
          console.log(`  - Supply Crates: ${snapshot.crates.length}`);
          console.log(`  - Plasma Barrels: ${snapshot.barrels.length}`);
          console.log(`  - Forensic Terminals: ${snapshot.terminals.length}`);
          console.log(`  - Extraction Sync Pads: ${snapshot.extractionPads.length}`);

          if (snapshot.operatives.length !== 4) {
            clearTimeout(timeout);
            return reject(new Error('Expected 4 operatives in snapshot'));
          }
        }

        // Send a burst of player inputs
        socket.emit('player_input', {
          seq: snapshotCount,
          moveX: 1,
          moveY: 0,
          aimAngle: 0.25,
          isSprinting: true,
          isCrouched: false,
          isDodging: false,
          isFiring: true,
          isReloading: false,
          isInteracting: false,
          useSkill: snapshotCount === 5, // Test Vanguard Shield skill
          throwGrenade: false,
          switchSlot: null,
          dt: 0.033,
          clientTimestamp: Date.now(),
        });

        if (snapshotCount >= 20) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    console.log('\x1b[32m%s\x1b[0m', `✔ Processed ${snapshotCount} authoritative game ticks and input packets with zero errors`);

    testPassed = true;
    socket.disconnect();
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Simulation Test Failed:', err);
  } finally {
    console.log('[TEST] Stopping server...');
    spawn('taskkill', ['/pid', server.pid.toString(), '/T', '/F'], { shell: true });
  }

  if (testPassed) {
    console.log('\x1b[32m%s\x1b[0m', '=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSimulation();
