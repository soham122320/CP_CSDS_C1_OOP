import { spawn } from 'child_process';
import os from 'os';

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const lanIps = getLocalIpAddresses();
const primaryLanIp = lanIps[0] || '127.0.0.1';

console.log('\x1b[36m%s\x1b[0m', `
================================================================================
  ███████╗██╗  ██╗ █████╗ ██████╗ ██████╗       ██╗  ██╗
  ██╔════╝██║  ██║██╔══██╗██╔══██╗██╔══██╗      ██║  ██║
  ███████╗███████║███████║██████╔╝██║  ██║█████╗███████║
  ╚════██║██╔══██║██╔══██║██╔══██╗██║  ██║╚════╝╚════██║
  ███████║██║  ██║██║  ██║██║  ██║██████╔╝           ██║
  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝            ╚═╝
              BLACKOUT PROTOCOL // STATION EREBUS
================================================================================
`);

console.log('\x1b[32m%s\x1b[0m', '>> SYSTEM BOOT: Tactical Co-Op 4-Player Environment Initiated');
console.log('\x1b[33m%s\x1b[0m', `>> LOCAL HOST:     http://localhost:5173`);
console.log('\x1b[35m%s\x1b[0m', `>> MOBILE/LAN URL: http://${primaryLanIp}:5173`);
console.log('\x1b[90m%s\x1b[0m', `>> AUTHORITATIVE SERVER: Port 3001 (0.0.0.0)`);
console.log('\x1b[90m%s\x1b[0m', `>> Connect phones or other laptops on the same Wi-Fi using the LAN URL above!\n`);

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Spawn Server
const serverProcess = spawn(npxCmd, ['tsx', 'watch', 'server/src/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3001', HOST: '0.0.0.0', LAN_IP: primaryLanIp },
});

// Spawn Client
const clientProcess = spawn(npxCmd, ['vite', 'client', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

function cleanup() {
  console.log('\n\x1b[31m%s\x1b[0m', 'Shutting down SHARD-4 servers...');
  try {
    serverProcess.kill();
    clientProcess.kill();
  } catch (err) {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
