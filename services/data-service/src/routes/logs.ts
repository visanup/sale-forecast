import { Router } from 'express';
import { getRedisClient } from '../utils/redis-logger.js';

type RedisStreamEntry = [string, string[]];
type ParsedLogEntry = {
  id: string;
  service?: string;
  level?: string;
  timestamp?: string;
  [key: string]: unknown;
};

const router = Router();
const redis = getRedisClient();

/**
 * GET /v1/logs
 * Fetch logs from Redis Stream
 * Query params:
 *  - limit: number of logs to fetch (default: 100, max: 1000)
 *  - service: filter by service name
 *  - level: filter by log level (info, warn, error, debug)
 *  - since: timestamp to fetch logs after (ISO 8601)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query['limit']) || 100, 1000);
    const serviceFilter = req.query['service'] as string;
    const levelFilter = req.query['level'] as string;
    const sinceFilter = req.query['since'] as string;

    // Read from Redis Stream
    const logs = await redis.xrevrange('service:logs', '+', '-', 'COUNT', limit) as RedisStreamEntry[];

    // Parse and filter logs
    const parsedLogs: ParsedLogEntry[] = logs
      .map(([id, fields]) => {
        const logEntry: ParsedLogEntry = { id };
        
        // Convert field array to object
        for (let i = 0; i < fields.length; i += 2) {
          const key = fields[i];
          const value = fields[i + 1];
          
          if (key === 'data' && value) {
            try {
              logEntry[key] = JSON.parse(value);
            } catch {
              logEntry[key] = value;
            }
          } else {
            logEntry[key] = value;
          }
        }
        
        return logEntry;
      })
      .filter((log) => {
        // Apply filters
        if (serviceFilter && log.service !== serviceFilter) return false;
        if (levelFilter && log.level !== levelFilter) return false;
        if (sinceFilter && typeof log.timestamp === 'string' && log.timestamp < sinceFilter) return false;
        return true;
      });

    return res.json({
      success: true,
      data: {
        logs: parsedLogs,
        count: parsedLogs.length,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch logs'
      }
    });
  }
});

/**
 * GET /v1/logs/stats
 * Get log statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const streamInfo = await redis.xinfo('STREAM', 'service:logs') as Array<string | number | Record<string, unknown>>;
    
    // Parse stream info
    const stats: Record<string, unknown> = {};
    for (let i = 0; i < streamInfo.length; i += 2) {
      const key = String(streamInfo[i]);
      const value = streamInfo[i + 1];
      stats[key] = value;
    }

    return res.json({
      success: true,
      data: {
        totalLogs: (stats['length'] as number | undefined) || 0,
        firstEntry: stats['first-entry'] || null,
        lastEntry: stats['last-entry'] || null
      }
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch log statistics'
      }
    });
  }
});

/**
 * DELETE /v1/logs
 * Clear all logs (admin only)
 */
router.delete('/', async (_req, res) => {
  try {
    await redis.del('service:logs');
    
    return res.json({
      success: true,
      message: 'All logs cleared'
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear logs'
      }
    });
  }
});

export { router as logsRouter };
