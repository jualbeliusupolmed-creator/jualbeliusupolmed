/**
 * Structured Logger (pino wrapper)
 * Replaces console.log/error/warn with structured JSON logging
 * Includes correlation IDs for request tracing
 */

import pino from 'pino'

// Pretty print in development, JSON in production
const isDevelopment = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'kampuskita-web',
    version: process.env.npm_package_version || 'unknown',
  },
})

/**
 * Create a child logger with context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Request logger with correlation ID
 */
export function createRequestLogger(requestId: string, metadata: Record<string, unknown> = {}) {
  return logger.child({
    requestId,
    ...metadata,
  })
}

/**
 * Error logging with context
 */
export function logError(
  logger: pino.Logger,
  error: Error | unknown,
  message: string,
  context: Record<string, unknown> = {}
) {
  const err = error instanceof Error ? error : new Error(String(error))
  logger.error({ err, ...context }, message)
}

/**
 * Audit logging for admin actions
 */
export function auditLog(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
) {
  logger.info(
    {
      audit: true,
      actorId,
      action,
      targetType,
      targetId,
      ...metadata,
    },
    `Admin action: ${action} on ${targetType}:${targetId}`
  )
}

export default logger