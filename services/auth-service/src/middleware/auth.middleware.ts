import { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '../utils/token.util';
import type { TokenPayload } from '../types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        roles: string[];
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
    const decoded: TokenPayload = TokenUtil.verifyAccessToken(token);

    if (!decoded?.sub) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token payload is missing subject'
        }
      });
      return;
    }

    req.user = {
      userId: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles || [],
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
