import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { body } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ApiResponse } from '../types/auth.types';

const router = Router();
const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const authService = new AuthService(prisma, auditService);

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const user = await authService.getCurrentUser(req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.json(response);
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'PROFILE_FETCH_FAILED',
        message: error.message || 'Failed to fetch profile'
      }
    });
  }
});

/**
 * @openapi
 * /api/v1/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update current user profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.put(
  '/',
  body('firstName').optional().isString().trim().isLength({ max: 120 }),
  body('lastName').optional().isString().trim().isLength({ max: 120 }),
  validateRequest,
  async (req, res) => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }

      const updatedUser = await authService.updateProfile(
        req.user.userId,
        req.body,
        {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      );

      const response: ApiResponse = {
        success: true,
        data: updatedUser
      };

      res.json(response);
    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'PROFILE_UPDATE_FAILED',
          message: error.message || 'Failed to update profile'
        }
      });
    }
  }
);

router.post(
  '/change-password',
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword').isString().isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validateRequest,
  async (req, res) => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }

      const updatedUser = await authService.changePassword(req.user.userId, req.body, {
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: updatedUser
      };

      res.json(response);
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'CHANGE_PASSWORD_FAILED',
          message: error.message || 'Failed to change password'
        }
      });
    }
  }
);

export { router as profileRoutes };
