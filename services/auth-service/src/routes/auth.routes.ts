import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
// Schema validation will be handled by Express middleware if needed
import { ApiResponse } from '../types/auth.types';

const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const authService = new AuthService(prisma, auditService);

const router = Router();

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
router.post('/register', async (req, res) => {
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
});

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
router.post('/login', async (req, res) => {
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
router.post('/refresh', async (req, res) => {
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
});

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
router.post('/logout', async (req, res) => {
  try {
    const body = req.body;
    await authService.logout(body.refreshToken);

    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

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
router.post('/forgot-password', async (req, res) => {
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
router.post('/reset-password', async (req, res) => {
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

// Verify email (disabled - users are auto-verified)
router.post('/verify-email', async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.body);

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