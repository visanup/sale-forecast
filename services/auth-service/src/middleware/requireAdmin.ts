import { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '../utils/token.util';
import type { AuthTokenPayload } from '../types/auth.types';

const isBearerPresent = (authHeader?: string): authHeader is string =>
  Boolean(authHeader && authHeader.startsWith('Bearer '));

const formatUnauthorized = (res: Response): void => {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided'
    }
  });
};

const formatInvalidToken = (res: Response, code: 'TOKEN_EXPIRED' | 'INVALID_TOKEN'): void => {
  const message =
    code === 'TOKEN_EXPIRED' ? 'Authorization token has expired' : 'Invalid or expired token';

  res.status(401).json({
    success: false,
    error: {
      code,
      message
    }
  });
};

const attachUser = (req: Request, decoded: AuthTokenPayload): void => {
  req.user = {
    userId: decoded.sub,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role,
    tokenId: decoded.jti
  };
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!isBearerPresent(authHeader)) {
    formatUnauthorized(res);
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = TokenUtil.verifyAccessToken(token);

    if (!decoded?.sub || !decoded?.role || decoded.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin only'
        }
      });
      return;
    }

    attachUser(req, decoded);
    next();
  } catch (error: any) {
    const message = error?.message || 'INVALID_TOKEN';

    if (message === 'TOKEN_EXPIRED') {
      formatInvalidToken(res, 'TOKEN_EXPIRED');
      return;
    }

    formatInvalidToken(res, 'INVALID_TOKEN');
  }
};
