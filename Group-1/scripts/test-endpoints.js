import { spawn } from 'child_process';
import http from 'http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function test() {
  console.log('[TEST] Starting server process...');
  const server = spawn('npx', ['tsx', 'server/src/index.ts'], { shell: true, stdio: 'pipe' });

  console.log('[TEST] Starting client vite process...');
  const client = spawn('npx', ['vite', 'client', '--host', '0.0.0.0', '--port', '5173'], { shell: true, stdio: 'pipe' });

  // Wait 4 seconds for both to listen
  await new Promise((r) => setTimeout(r, 4500));

  try {
    const apiRes = await get('http://127.0.0.1:3001/api/info');
    console.log('[TEST SUCCESS] Server /api/info:', apiRes.statusCode, apiRes.body);

    const clientRes = await get('http://127.0.0.1:5173');
    console.log('[TEST SUCCESS] Client Vite:', clientRes.statusCode, clientRes.body.slice(0, 150));
  } catch (err) {
    console.error('[TEST ERROR]', err);
  } finally {
    console.log('[TEST] Cleaning up test processes...');
    server.kill();
    client.kill();
    // On windows force kill process tree
    spawn('taskkill', ['/pid', server.pid.toString(), '/T', '/F'], { shell: true });
    spawn('taskkill', ['/pid', client.pid.toString(), '/T', '/F'], { shell: true });
    process.exit(0);
  }
}

test();
