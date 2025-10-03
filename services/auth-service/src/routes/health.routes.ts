import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Basic health check (alias /health for container probes)
router.get(['/healthz', '/health'], async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: '1.0.0'
  });
});

// Readiness check
router.get('/readyz', async (_req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      checks: {
        database: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      checks: {
        database: 'error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint
router.get('/metrics', async (_req, res) => {
  try {
    // Get basic metrics
    const [
      totalUsers,
      activeUsers,
      totalRoles,
      totalRefreshTokens,
      expiredRefreshTokens
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.role.count(),
      prisma.refreshToken.count(),
      prisma.refreshToken.count({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { not: null } }
          ]
        }
      })
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        roles: {
          total: totalRoles
        },
        tokens: {
          total: totalRefreshTokens,
          expired: expiredRefreshTokens,
          active: totalRefreshTokens - expiredRefreshTokens
        }
      }
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as healthRoutes };
