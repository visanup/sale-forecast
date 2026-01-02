import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
// Schema validation will be handled by Express middleware if needed
import { ApiResponse } from '../types/auth.types';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { TokenUtil } from '../utils/token.util';
import { MonthlyAccessProvisioner } from '../services/monthlyAccessProvisioner.service';

const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const monthlyAccessProvisioner = new MonthlyAccessProvisioner();
const authService = new AuthService(prisma, auditService, monthlyAccessProvisioner);

const router = Router();
const BETAGRO_EMAIL_REGEX = /^[^@\s]+@betagro\.com$/i;
const BETAGRO_EMAIL_MESSAGE = 'Email must be a @betagro.com address';

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email: { type: string, format: email }
 *               username: { type: string }
 *               password: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
// Register user
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Email must be valid')
      .customSanitizer(value => (typeof value === 'string' ? value.trim().toLowerCase() : value))
      .matches(BETAGRO_EMAIL_REGEX)
      .withMessage(BETAGRO_EMAIL_MESSAGE),
    body('username')
      .isString()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Username must be between 3 and 100 characters')
      .customSanitizer(value => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('firstName').optional().isString().trim().isLength({ max: 120 }),
    body('lastName').optional().isString().trim().isLength({ max: 120 })
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.register(req.body, {
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'REGISTRATION_FAILED',
          message: error.message || 'Registration failed'
        }
      });
    }
  }
);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and get tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
// Login user
router.post(
  '/login',
  [
    body('username').isString().trim().notEmpty().withMessage('Username is required'),
    body('password').isString().notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.login(req.body, {
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'LOGIN_FAILED',
          message: error.message || 'Login failed'
        }
      });
    }
  }
);

// Get current authenticated user
router.get('/me', requireAuth, async (req: Request, res: Response) => {
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
    console.error('Get current user error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'USER_FETCH_FAILED',
        message: error.message || 'Failed to fetch current user'
      }
    });
  }
});

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
// Refresh access token
router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty().withMessage('Refresh token is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const result = await authService.refreshToken(body.refreshToken, {
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'REFRESH_FAILED',
          message: error.message || 'Token refresh failed'
        }
      });
    }
  }
);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
// Logout user
router.post(
  '/logout',
  body('refreshToken').isString().notEmpty().withMessage('Refresh token is required'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const body = req.body;
      let userId: string | undefined;

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7).trim();
          const decoded = TokenUtil.verifyAccessToken(token);
          userId = decoded.sub;
        } catch {
          // Ignore token parsing errors during logout
        }
      }

      await authService.logout(body.refreshToken, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully'
      };

      res.json(response);
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'LOGOUT_FAILED',
          message: error.message || 'Logout failed'
        }
      });
    }
  }
);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: OK
 */
// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const result = await authService.requestPasswordReset(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const result = await authService.resetPassword(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

export { router as authRoutes };
