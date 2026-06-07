import { pino } from 'pino';

const level = process.env.LOG_LEVEL || 'info';

// Create logger - use simple console-based output for simplicity
export const logger = pino({
  level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Convenience methods with context
export const createLogger = (context: string) => logger.child({ context });
