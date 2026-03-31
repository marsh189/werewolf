/* =============================================================================
   Logger (Server)

   Lightweight structured logging for debugging and auditing.
   - JSON lines to stdout/stderr
   - minimal redaction for common sensitive fields
============================================================================= */

const redact = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);

  /** @type {Record<string, unknown>} */
  const next = {};
  for (const [key, inner] of Object.entries(value)) {
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('token')
    ) {
      next[key] = '[REDACTED]';
      continue;
    }
    next[key] = redact(inner);
  }
  return next;
};

const safeJson = (payload) => {
  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({ msg: 'Failed to serialize log payload' });
  }
};

const write = (stream, payload) => {
  stream.write(`${safeJson(payload)}\n`);
};

export const log = (level, message, meta = {}) => {
  const isTestEnv =
    process.env.LOG_TEST === '1'
      ? false
      : process.env.VITEST !== undefined || process.env.NODE_ENV === 'test';
  if (isTestEnv) {
    // Keep tests deterministic and quiet by default.
    if (level === 'error') {
      // fall through
    } else {
      return;
    }
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...redact(meta),
  };

  if (level === 'error') {
    write(process.stderr, payload);
    return;
  }
  write(process.stdout, payload);
};

export const logInfo = (message, meta) => log('info', message, meta);
export const logWarn = (message, meta) => log('warn', message, meta);
export const logError = (message, meta) => log('error', message, meta);

export const timeSync = (label, fn, { warnMs = 50, meta = {} } = {}) => {
  const start = Date.now();
  try {
    return fn();
  } finally {
    const durationMs = Date.now() - start;
    if (durationMs >= warnMs) {
      logWarn('slow_operation', { label, durationMs, ...meta });
    }
  }
};
