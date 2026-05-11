export interface ApiConfig {
  nodeEnv: string;
  host: string;
  port: number;
  logLevel: LogLevel;
  publicBaseUrl: string;
}

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

function parsePort(rawPort: string | undefined): number {
  const port = Number(rawPort ?? '3000');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid API_PORT: expected an integer between 1 and 65535');
  }

  return port;
}

function parseLogLevel(rawLogLevel: string | undefined): LogLevel {
  const logLevel = rawLogLevel ?? 'info';

  if (!LOG_LEVELS.includes(logLevel as LogLevel)) {
    throw new Error(`Invalid LOG_LEVEL: expected one of ${LOG_LEVELS.join(', ')}`);
  }

  return logLevel as LogLevel;
}

export function loadApiConfig(raw: NodeJS.ProcessEnv = process.env): ApiConfig {
  const port = parsePort(raw.API_PORT);

  return {
    nodeEnv: raw.NODE_ENV ?? 'development',
    host: raw.API_HOST ?? '0.0.0.0',
    port,
    logLevel: parseLogLevel(raw.LOG_LEVEL),
    publicBaseUrl: raw.API_PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`
  };
}
