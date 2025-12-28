type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

import { env } from '../config/env';

export const initLogger = (): void => {
  const envLevel = (env.logLevel || '');
  const defaultLevel: LogLevel = env.nodeEnv === 'production' ? 'warn' : 'debug';
  const activeLevel: LogLevel = levelOrder[envLevel] ? envLevel : defaultLevel;

  const threshold = levelOrder[activeLevel];

  const noop = () => {};

  // Patch console methods based on active level
  if (levelOrder.debug < threshold) {
    // Suppress debug
    console.debug = noop as any;
  }
  if (levelOrder.info < threshold) {
    // Suppress info (most console.log usages)
    console.info = noop as any;
    console.log = noop as any;
  }
  // keep warn and error unless level is silent
  if (levelOrder.warn < threshold) {
    console.warn = noop as any;
  }
  if (levelOrder.error < threshold) {
    console.error = noop as any;
  }
};

export default {
  initLogger,
};
