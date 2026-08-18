/** Tiny structured logger so every service call is traceable. */
type Level = "info" | "warn" | "error";

function log(level: Level, scope: string, msg: string, meta?: Record<string, unknown>) {
  const line = `[cif:${scope}] ${msg}`;
  const args: unknown[] = [line];
  if (meta) args.push(meta);
  if (level === "error") console.error(...args);
  else if (level === "warn") console.warn(...args);
  else if (process.env.CIF_VERBOSE === "1") console.info(...args);
}

export const logger = {
  info: (scope: string, msg: string, meta?: Record<string, unknown>) => log("info", scope, msg, meta),
  warn: (scope: string, msg: string, meta?: Record<string, unknown>) => log("warn", scope, msg, meta),
  error: (scope: string, msg: string, meta?: Record<string, unknown>) => log("error", scope, msg, meta),
};

export class ServiceError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
