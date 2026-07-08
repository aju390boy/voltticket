/// <reference types="node" />
import { spawn } from 'child_process';
import path from 'path';

const PORT = 6379;

// Path to portable Redis binary (downloaded to project root)
const redisBin = path.resolve(__dirname, '../../redis-win/redis-server.exe');
const redisConf = path.resolve(__dirname, '../../redis-win/redis.windows.conf');

console.log(`⚡ Starting Redis on port ${PORT}...`);

const redis = spawn(redisBin, [redisConf, '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

redis.stdout.on('data', (data: Buffer) => {
  const msg = data.toString();
  if (msg.includes('Ready to accept connections')) {
    console.log(`✅ Redis is running at 127.0.0.1:${PORT}`);
    console.log('   Keep this terminal open. Press Ctrl+C to stop.\n');
  }
});

redis.stderr.on('data', (data: Buffer) => {
  console.error('[redis]', data.toString().trim());
});

redis.on('error', (err) => {
  console.error('❌ Redis failed to start:', err.message);
  process.exit(1);
});

redis.on('close', (code) => {
  if (code !== 0) console.error(`Redis exited with code ${code}`);
  process.exit(code ?? 0);
});

const shutdown = () => {
  console.log('\n⏹  Stopping Redis...');
  redis.kill('SIGTERM');
};
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
