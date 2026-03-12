/**
 * Production-safe logger utility
 * 
 * In production (NODE_ENV=production), debug/verbose logs are suppressed
 * to reduce noise and improve performance. Errors and warnings always print.
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('Some verbose message');  // suppressed in production
 *   logger.info('Important message');      // always shown
 *   logger.warn('Warning message');        // always shown
 *   logger.error('Error message');         // always shown
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEBUG = process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug';

export const logger = {
  /**
   * Debug logs: only shown in development or when DEBUG=true
   */
  debug: (...args: any[]): void => {
    if (!IS_PRODUCTION || IS_DEBUG) {
      console.log(...args);
    }
  },

  /**
   * Info logs: always shown (important operational messages)
   */
  info: (...args: any[]): void => {
    console.log(...args);
  },

  /**
   * Warning logs: always shown
   */
  warn: (...args: any[]): void => {
    console.warn(...args);
  },

  /**
   * Error logs: always shown
   */
  error: (...args: any[]): void => {
    console.error(...args);
  },
};

export default logger;
