import { Redis } from 'ioredis';
import pino from 'pino';

const redis = new Redis({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: Number(process.env['REDIS_PORT']) || 6380,
  ...(process.env['REDIS_PASSWORD'] && { password: process.env['REDIS_PASSWORD'] }),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err: Error) => {
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
 * Safely stringify objects with circular references
 */
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, val) => {
    if (val != null && typeof val === 'object') {
      if (seen.has(val)) {
        return '[Circular Reference]';
      }
      seen.add(val);
    }
    return val;
  });
}

/**
 * Clean log data to remove circular references and sensitive information
 */
function cleanLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const cleaned = { ...data };
  
  // Remove circular references from request/response objects
  if (cleaned.req) {
    cleaned.req = {
      id: cleaned.req.id,
      method: cleaned.req.method,
      url: cleaned.req.url,
      query: cleaned.req.query,
      params: cleaned.req.params,
      headers: cleaned.req.headers,
      remoteAddress: cleaned.req.remoteAddress,
      remotePort: cleaned.req.remotePort
    };
  }
  
  if (cleaned.res) {
    cleaned.res = {
      statusCode: cleaned.res.statusCode,
      headers: cleaned.res.headers
    };
  }
  
  // Remove other potentially circular objects
  delete cleaned.socket;
  delete cleaned.parser;
  delete cleaned._events;
  delete cleaned._eventsCount;
  
  return cleaned;
}

/**
 * Push log to Redis stream
 * Uses Redis Stream for efficient log storage with automatic expiry
 */
export async function pushLogToRedis(entry: LogEntry): Promise<void> {
  try {
    const key = 'service:logs';
    const cleanedData = cleanLogData(entry.data);
    
    const logData = {
      timestamp: entry.timestamp,
      level: entry.level,
      service: entry.service,
      message: entry.message,
      data: cleanedData ? safeStringify(cleanedData) : '',
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
