import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateRequest } from '../middleware/validation.middleware';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';

const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const authService = new AuthService(prisma, auditService);

const ADMIN_SEED_USERS = [
  { username: 'qiadmin', email: 'qiadmin@betagro.com', password: 'P@55W0rd123' },
  { username: 'aiadmin', email: 'aiadmin@betagro.com', password: 'P@ssWord456' },
  { username: 'biadmin', email: 'biadmin@betagro.com', password: 'p@55w0RD789' },
  { username: 'diadmin', email: 'diadmin@betagro.com', password: 'P@5sW0rd012' },
  { username: 'ahbadmin', email: 'ahbadmin@betagro.com', password: 'AhbP@ssw0rd1150', mustChangePassword: true },
  { username: 'feedadmin', email: 'feedadmin@betagro.com', password: 'FeedP@ssw0rd1112', mustChangePassword: true },
  { username: 'agroscmadmin', email: 'agroscmadmin@betagro.com', password: 'AGROSCMP@ssw0rd1169', mustChangePassword: true }
];

type RequestContext = {
  actorId?: string;
  actorEmail?: string;
  actorUsername?: string;
  ipAddress?: string;
  userAgent?: string;
};

type UserIdParams = {
  userId: string;
};

const buildContext = (req: Request): RequestContext => {
  const context: RequestContext = {
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };

  const actorId = req.user?.userId;
  if (actorId) {
    context.actorId = actorId;
  }

  const actorEmail = (req.user as any)?.email;
  if (actorEmail) {
    context.actorEmail = actorEmail;
  }

  const actorUsername = (req.user as any)?.username;
  if (actorUsername) {
    context.actorUsername = actorUsername;
  }

  return context;
};

export const adminRouter = Router();

adminRouter.get('/ping', requireAdmin, (_req, res) => {
  res.json({ success: true, data: { ok: true } });
});

adminRouter.get('/users', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await authService.listAdminUsers();
    res.json({ success: true, data: { users } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'ADMIN_USERS_FETCH_FAILED', message: error?.message || 'Failed to fetch admin users' }
    });
  }
});

adminRouter.patch(
  '/users/:userId',
  requireAdmin,
  [
    param('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('mustChangePassword').optional().isBoolean().withMessage('mustChangePassword must be boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
  ],
  validateRequest,
  async (req: Request<UserIdParams>, res: Response) => {
    try {
      const context = buildContext(req);
      const updated = await authService.updateAdminUser(req.params.userId, req.body, context);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(error?.status || 500).json({
        success: false,
        error: {
          code: error?.code || 'ADMIN_USER_UPDATE_FAILED',
          message: error?.message || 'Failed to update admin user'
        }
      });
    }
  }
);

adminRouter.post(
  '/users/:userId/reset-password',
  requireAdmin,
  [
    param('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('newPassword').optional().isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validateRequest,
  async (req: Request<UserIdParams>, res: Response) => {
    try {
      const context = buildContext(req);
      const result = await authService.resetAdminPassword(req.params.userId, req.body?.newPassword, context);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error?.status || 500).json({
        success: false,
        error: {
          code: error?.code || 'ADMIN_PASSWORD_RESET_FAILED',
          message: error?.message || 'Failed to reset password'
        }
      });
    }
  }
);

adminRouter.post('/users/seed', requireAdmin, async (req: Request, res: Response) => {
  try {
    const context = buildContext(req);
    const result = await authService.seedAdminUsers(ADMIN_SEED_USERS, context);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error?.status || 500).json({
      success: false,
      error: {
        code: error?.code || 'ADMIN_SEED_FAILED',
        message: error?.message || 'Failed to seed admin users'
      }
    });
  }
});
