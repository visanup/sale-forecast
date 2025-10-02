import Redis from 'ioredis';
import pino from 'pino';

const redis = new Redis({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: Number(process.env['REDIS_PORT']) || 6380,
  ...(process.env['REDIS_PASSWORD'] && { password: process.env['REDIS_PASSWORD'] }),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  data?: any;
  requestId?: string;
}

/**
 * Push log to Redis stream
 * Uses Redis Stream for efficient log storage with automatic expiry
 */
/**
 * Safely stringify data, handling circular references
 */
function safeStringify(data: any): string {
  if (!data) return '';
  
  try {
    // Use a custom replacer to handle circular references
    const seen = new WeakSet();
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    });
  } catch (error) {
    return '[Unable to serialize data]';
  }
}

export async function pushLogToRedis(entry: LogEntry): Promise<void> {
  try {
    const key = 'service:logs';
    const logData = {
      timestamp: entry.timestamp,
      level: entry.level,
      service: entry.service,
      message: entry.message,
      data: entry.data ? safeStringify(entry.data) : '',
      requestId: entry.requestId || ''
    };

    // Add to Redis Stream with MAXLEN to keep only last 10000 logs
    await redis.xadd(
      key,
      'MAXLEN', '~', '10000',
      '*', // auto-generate ID
      'timestamp', logData.timestamp,
      'level', logData.level,
      'service', logData.service,
      'message', logData.message,
      'data', logData.data,
      'requestId', logData.requestId
    );
  } catch (error) {
    // Don't throw - logging should not break the app
    console.error('Failed to push log to Redis:', error);
  }
}

/**
 * Create a Pino transport that sends logs to Redis
 */
export function createRedisLogger(serviceName: string, level: string = 'info') {
  const logger = pino({
    name: serviceName,
    level,
    hooks: {
      logMethod(inputArgs: any[], method: any) {
        // Call the original log method
        method.apply(this, inputArgs);
        
        // Extract log data
        const [obj, msg] = inputArgs;
        let logMessage = msg || '';
        let logData: any = {};
        
        if (typeof obj === 'string') {
          logMessage = obj;
        } else if (typeof obj === 'object' && obj !== null) {
          logData = obj;
          if ((obj as any).msg) logMessage = (obj as any).msg;
        }
        
        // Get log level from method name
        const levelName = method.name || 'info';
        
        // Push to Redis asynchronously (fire and forget)
        pushLogToRedis({
          timestamp: new Date().toISOString(),
          level: levelName,
          service: serviceName,
          message: logMessage,
          data: logData,
          requestId: logData.requestId || logData.req?.id
        }).catch(() => {
          // Silently fail - don't break the app
        });
      }
    }
  });
  
  return logger;
}

/**
 * Get Redis client for reading logs (used in data-service)
 */
export function getRedisClient(): Redis {
  return redis;
}

