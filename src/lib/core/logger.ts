import { createLogger } from 'goget-logger';

const logger = createLogger({ enabled: import.meta.env.DEV });

export const logError = logger.error;
export const logWarn = logger.warn;
export const logInfo = logger.info;
