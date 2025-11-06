import { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '../utils/token.util';
import type { AuthTokenPayload, UserRole } from '../types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        role: UserRole;
        tokenId: string;
      };
    }
  }
}

/**
 * Require a valid Bearer token before proceeding
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No authorization token provided'
      }
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded: AuthTokenPayload = TokenUtil.verifyAccessToken(token);

    if (!decoded?.sub || !decoded?.role || !decoded?.jti) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token payload is invalid'
        }
      });
      return;
    }

    req.user = {
      userId: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      tokenId: decoded.jti
    };

    next();
  } catch (error: any) {
    const message = error?.message || 'INVALID_TOKEN';

    if (message === 'TOKEN_EXPIRED') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authorization token has expired'
        }
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
};
