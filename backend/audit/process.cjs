const { spawn } = require('node:child_process');

function redact(text) {
  return String(text).replace(/(?:private[_ -]?key|clave privada|password|contraseña|mnemonic|seed phrase|api[_ -]?key)\s*[:=]\s*[^\r\n]*/gi, '[dato reservado]')
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1[dato reservado]@');
}

function childEnvironment() {
  const allowed = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'USERPROFILE', 'TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA', 'HOME', 'CI', 'PATHEXT'];
  const env = { NO_COLOR: '1', PYTHONUTF8: '1' };
  for (const key of allowed) if (process.env[key]) env[key] = process.env[key];
  return env;
}

function executeProcess(command, args, { root, timeoutMs = 120000, maxOutput = 2097152 }) {
  const started = Date.now();
  return new Promise(resolve => {
    let stdout = '', stderr = '', timedOut = false, truncated = false;
    const child = spawn(command, args, { cwd: root, env: childEnvironment(), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    function append(chunk, isError) {
      const text = redact(chunk.toString());
      if ((isError ? stderr : stdout).length + text.length > maxOutput) truncated = true;
      if (isError) stderr = (stderr + text).slice(0, maxOutput);
      else stdout = (stdout + text).slice(0, maxOutput);
    }
    child.stdout.on('data', chunk => append(chunk, false));
    child.stderr.on('data', chunk => append(chunk, true));
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ success: false, exitCode: null, code: 'TOOL_UNAVAILABLE', stdout, stderr: 'La herramienta no está instalada o no puede iniciarse.', durationMs: Date.now() - started, timedOut, truncated });
    });
    child.on('close', exitCode => {
      clearTimeout(timer);
      resolve({ success: exitCode === 0 && !timedOut, exitCode, stdout, stderr, durationMs: Date.now() - started, timedOut, truncated });
    });
  });
}

module.exports = { executeProcess, redact };
