import { PrismaClient } from '@prisma/client';
import { PasswordUtil } from '../utils/password.util';
import { TokenUtil } from '../utils/token.util';
import { AuditService } from './audit.service';
import { InvalidCredentialsError, UserAlreadyExistsError } from '../utils/errors';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User, 
  TokenPayload,
  PasswordResetRequest,
  PasswordResetData,
  DeviceInfo
} from '../types/auth.types';

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService
  ) {}

  /**
   * Register a new user
   */
  async register(data: RegisterData, deviceInfo?: DeviceInfo): Promise<{ user: User; message: string }> {
    // Validate password strength
    const passwordValidation = PasswordUtil.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new UserAlreadyExistsError('EMAIL_ALREADY_EXISTS');
      } else {
        throw new UserAlreadyExistsError('USERNAME_ALREADY_EXISTS');
      }
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(data.password);

    // Create user - filter out undefined values to satisfy exactOptionalPropertyTypes
    const userData: any = {
      email: data.email,
      username: data.username,
      password: hashedPassword,
      emailVerified: false
    };

    if (data.firstName !== undefined) {
      userData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      userData.lastName = data.lastName;
    }

    const user = await this.prisma.user.create({
      data: userData,
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Email verification disabled - set user as verified automatically
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    });

    // Log registration
    await this.auditService.log({
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email, username: user.username },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return {
      user: this.mapUserToResponse(user),
      message: 'User registered successfully.'
    };
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    // Find user by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: credentials.username },
          { username: credentials.username }
        ],
        isActive: true
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.verify(user.password, credentials.password);
    if (!isPasswordValid) {
      // Log failed login attempt
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        details: { reason: 'Invalid password' },
        ipAddress: deviceInfo?.ipAddress || 'unknown',
        userAgent: deviceInfo?.userAgent || 'unknown'
      });
      throw new InvalidCredentialsError('Invalid username or password');
    }

    // Generate tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles.map((ur: any) => ur.role.name),
      jti: TokenUtil.generateTokenFamily(),
      type: 'access' as const
    };

    const accessToken = TokenUtil.generateAccessToken(tokenPayload);
    const refreshToken = TokenUtil.generateRefreshToken(tokenPayload);

    // Store refresh token - filter out undefined values to satisfy exactOptionalPropertyTypes
    const refreshTokenData: any = {
      userId: user.id,
      token: refreshToken,
      family: tokenPayload.jti,
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    if (deviceInfo?.userAgent !== undefined) {
      refreshTokenData.deviceInfo = deviceInfo.userAgent;
    }

    await this.prisma.refreshToken.create({
      data: refreshTokenData
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Log successful login
    await this.auditService.log({
      action: 'LOGIN_SUCCESS',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email, username: user.username },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer',
      user: this.mapUserToResponse(user)
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    // Verify refresh token
    TokenUtil.verifyRefreshToken(refreshToken);

    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Check for token reuse (security measure)
    if (storedToken.reused) {
      // Revoke all tokens in the family
      await this.prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { revokedAt: new Date() }
      });
      throw new Error('TOKEN_REUSE_DETECTED');
    }

    // Mark current token as used
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { reused: true }
    });

    // Generate new tokens
    const newTokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: storedToken.user.id,
      email: storedToken.user.email,
      username: storedToken.user.username,
      roles: storedToken.user.roles.map((ur: any) => ur.role.name),
      jti: TokenUtil.generateTokenFamily(),
      type: 'access' as const
    };

    const newAccessToken = TokenUtil.generateAccessToken(newTokenPayload);
    const newRefreshToken = TokenUtil.generateRefreshToken(newTokenPayload);

    // Store new refresh token - filter out undefined values to satisfy exactOptionalPropertyTypes
    const newRefreshTokenData: any = {
      userId: storedToken.user.id,
      token: newRefreshToken,
      family: newTokenPayload.jti,
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    if (deviceInfo?.userAgent !== undefined) {
      newRefreshTokenData.deviceInfo = deviceInfo.userAgent;
    }

    await this.prisma.refreshToken.create({
      data: newRefreshTokenData
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer',
      user: this.mapUserToResponse(storedToken.user)
    };
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string, userId?: string): Promise<void> {
    // Revoke refresh token
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() }
    });

    // Log logout
    if (userId) {
      await this.auditService.log({
        action: 'LOGOUT',
        resource: 'User',
        resourceId: userId,
        details: { reason: 'User logout' }
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequest, deviceInfo?: DeviceInfo): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email, isActive: true }
    });

    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Generate password reset token
    const resetToken = TokenUtil.generatePasswordResetToken(user.id);

    // Store reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        ipAddress: deviceInfo?.ipAddress || 'unknown',
        userAgent: deviceInfo?.userAgent || 'unknown'
      }
    });

    // Email service disabled - password reset functionality removed

    // Log password reset request
    await this.auditService.log({
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  /**
   * Reset password
   */
  async resetPassword(data: PasswordResetData, deviceInfo?: DeviceInfo): Promise<{ message: string }> {
    // Verify reset token
    const { userId } = TokenUtil.verifyPasswordResetToken(data.token);

    // Find reset token in database
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token: data.token,
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: true
      }
    });

    if (!resetToken) {
      throw new Error('INVALID_OR_EXPIRED_RESET_TOKEN');
    }

    // Validate new password
    const passwordValidation = PasswordUtil.validatePassword(data.newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const hashedPassword = await PasswordUtil.hash(data.newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Mark reset token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() }
    });

    // Log password reset
    await this.auditService.log({
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'User',
      resourceId: userId,
      details: { email: resetToken.user?.email },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Verify email (disabled - users are auto-verified)
   */
  async verifyEmail(_data: any): Promise<{ message: string }> {
    // Email verification is disabled - return success message
    return { message: 'Email verification is disabled. Users are automatically verified upon registration.' };
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Map database user to response format
   */
  private mapUserToResponse(user: any): User {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles?.map((ur: any) => ur.role.name) || []
    };
  }
}
