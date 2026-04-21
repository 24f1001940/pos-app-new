const { execSync } = require('child_process');

const targetPorts = [5000, 5173, 5174, 5175];

function run(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function getPidsByPortWindows(port) {
  const output = run(`netstat -ano -p tcp | findstr :${port}`);
  if (!output) {
    return [];
  }

  return Array.from(
    new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.includes('LISTENING'))
        .map((line) => line.split(/\s+/).pop())
        .filter(Boolean),
    ),
  );
}

function getPidsByPortUnix(port) {
  const output = run(`lsof -ti tcp:${port}`);
  if (!output) {
    return [];
  }

  return Array.from(new Set(output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)));
}

function getProcessNameWindows(pid) {
  const output = run(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
  if (!output || output.startsWith('INFO:')) {
    return '';
  }

  const firstCell = output.split(',')[0] || '';
  return firstCell.replaceAll('"', '').trim().toLowerCase();
}

function getProcessNameUnix(pid) {
  return run(`ps -p ${pid} -o comm=`).trim().toLowerCase();
}

function killProcessWindows(pid) {
  run(`taskkill /PID ${pid} /F`);
}

function killProcessUnix(pid) {
  run(`kill -9 ${pid}`);
}

function cleanupWindows() {
  targetPorts.forEach((port) => {
    const pids = getPidsByPortWindows(port);
    pids.forEach((pid) => {
      const processName = getProcessNameWindows(pid);
      if (!processName.includes('node')) {
        return;
      }

      killProcessWindows(pid);
      // eslint-disable-next-line no-console
      console.log(`[predev] Freed port ${port} by stopping node pid ${pid}`);
    });
  });
}

function cleanupUnix() {
  targetPorts.forEach((port) => {
    const pids = getPidsByPortUnix(port);
    pids.forEach((pid) => {
      const processName = getProcessNameUnix(pid);
      if (!processName.includes('node')) {
        return;
      }

      killProcessUnix(pid);
      // eslint-disable-next-line no-console
      console.log(`[predev] Freed port ${port} by stopping node pid ${pid}`);
    });
  });
}

if (process.platform === 'win32') {
  cleanupWindows();
} else {
  cleanupUnix();
}
