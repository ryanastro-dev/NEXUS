import net from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULT_DEV_PORTS = [1420, 1421, 1422, 1423];

function parseCandidatePorts() {
  const raw = process.env.NEXUS_TAURI_DEV_PORTS;
  if (!raw) {
    return DEFAULT_DEV_PORTS;
  }

  const parsed = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((port) => Number.isFinite(port) && port > 0 && port <= 65535);

  if (parsed.length === 0) {
    return DEFAULT_DEV_PORTS;
  }

  return Array.from(new Set(parsed));
}

function resolveTauriCommand() {
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    prefixArgs: ['exec', '--', 'tauri'],
  };
}

function runTauri(args) {
  const { command, prefixArgs } = resolveTauriCommand();
  let spawnCommand = command;
  let spawnArgs = [...prefixArgs, ...args];
  if (process.platform === 'win32') {
    spawnCommand = 'cmd.exe';
    spawnArgs = ['/d', '/s', '/c', command, ...spawnArgs];
  }

  const child = spawn(spawnCommand, spawnArgs, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('error', (error) => {
    console.error(`[nexus-gui] failed to start tauri cli: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function resolveAvailablePort(candidates) {
  for (const port of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

function hasCustomDevConfig(args) {
  return args.includes('--config') || args.some((arg) => arg.startsWith('--config='));
}

async function main() {
  const args = process.argv.slice(2);
  const [subcommand] = args;

  if (subcommand !== 'dev' || hasCustomDevConfig(args) || args.includes('--no-dev-server')) {
    runTauri(args);
    return;
  }

  const devPort = await resolveAvailablePort(parseCandidatePorts());
  if (devPort === null) {
    console.error(
      `[nexus-gui] no available frontend dev port found from: ${parseCandidatePorts().join(', ')}`,
    );
    process.exit(1);
    return;
  }

  const configOverride = JSON.stringify({
    build: {
      beforeDevCommand: `npm run dev -- --port ${devPort}`,
      devUrl: `http://localhost:${devPort}`,
    },
  });

  console.log(`[nexus-gui] tauri dev using frontend port ${devPort}`);
  runTauri(['dev', '--config', configOverride, ...args.slice(1)]);
}

void main();
