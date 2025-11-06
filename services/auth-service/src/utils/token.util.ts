// src/utils/token.util.ts
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config/config';
import type { AuthTokenPayload, PasswordResetTokenPayload } from '../types/auth.types';

const ISSUER = 'microplate-auth-service';
const AUDIENCE = 'microplate-api';

/**
 * Generate access token
 */
export class TokenUtil {
  static generateAccessToken(
    payload: Omit<AuthTokenPayload, 'iat' | 'exp' | 'type'>
  ): string {
    return jwt.sign(
      { 
        ...payload, 
        type: 'access',
        iss: ISSUER,
        aud: AUDIENCE
      },
      config.jwtAccessSecret,
      {
        expiresIn: config.tokenExpiryAccess
      } as jwt.SignOptions
    );
  }

  /**
   * Generate refresh token (มี jti สำหรับ rotation)
   */
  static generateRefreshToken(
    payload: Omit<AuthTokenPayload, 'iat' | 'exp' | 'type'>
  ): string {
    const tokenId = randomUUID();

    return jwt.sign(
      { 
        ...payload, 
        jti: tokenId, 
        type: 'refresh',
        iss: ISSUER,
        aud: AUDIENCE
      },
      config.jwtRefreshSecret,
      {
        expiresIn: config.tokenExpiryRefresh
      } as jwt.SignOptions
    );
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as AuthTokenPayload;
      if (decoded.type !== 'access' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return decoded;
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.message === 'Token expired') {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwtRefreshSecret) as AuthTokenPayload;
      if (decoded.type !== 'refresh' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return decoded;
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.message === 'Token expired') {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * Decode (no verify)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Expiration datetime
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as { exp?: number };
      if (decoded?.exp) return new Date(decoded.exp * 1000);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Expired check
   */
  static isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiration(token);
    return !exp || exp < new Date();
  }

  /**
   * Token family id (สำหรับ rotation)
   */
  static generateTokenFamily(): string {
    return randomUUID();
  }

  /**
   * Extract jti
   */
  static getTokenId(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as { jti?: string };
      return decoded?.jti ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Password reset token
   */
  static generatePasswordResetToken(userId: string): string {
    const payload = {
      sub: userId,
      jti: randomUUID(),
      type: 'password_reset' as const,
      iss: ISSUER,
      aud: AUDIENCE
    };
    return jwt.sign(payload, config.jwtAccessSecret, {
      expiresIn: config.passwordResetExpiry
    } as jwt.SignOptions);
  }

  static verifyPasswordResetToken(token: string): { userId: string; jti: string } {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as PasswordResetTokenPayload;
      if (decoded.type !== 'password_reset' || decoded.iss !== ISSUER || decoded.aud !== AUDIENCE) {
        throw new Error('INVALID_TOKEN_TYPE');
      }
      return { userId: decoded.sub, jti: decoded.jti! };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError' || err?.message === 'Token expired') {
        throw new Error('PASSWORD_RESET_TOKEN_EXPIRED');
      }
      throw new Error('INVALID_PASSWORD_RESET_TOKEN');
    }
  }
}
