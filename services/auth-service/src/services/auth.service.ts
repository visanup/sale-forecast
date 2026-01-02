import { PrismaClient, Role } from '@prisma/client';
import { PasswordUtil } from '../utils/password.util';
import { TokenUtil } from '../utils/token.util';
import { AuditService } from './audit.service';
import { InvalidCredentialsError, UserAlreadyExistsError, ValidationError } from '../utils/errors';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User, 
  AuthTokenPayload,
  PasswordResetRequest,
  PasswordResetData,
  ChangePasswordData,
  DeviceInfo,
  UserUpdateData,
  AuditLogData
} from '../types/auth.types';
import { MonthlyAccessProvisioner } from './monthlyAccessProvisioner.service';

const BETAGRO_EMAIL_DOMAIN = '@betagro.com';
const BETAGRO_EMAIL_MESSAGE = 'กรุณาใช้อีเมล @betagro.com เท่านั้น';
const EMAIL_IN_USE_MESSAGE = 'เมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมล @betagro.com ที่ไม่ซ้ำ';

type AdminActionContext = {
  actorId?: string;
  actorEmail?: string;
  actorUsername?: string;
  ipAddress?: string;
  userAgent?: string;
};

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService,
    private monthlyAccessProvisioner?: MonthlyAccessProvisioner
  ) {}

  /**
   * Register a new user
   */
  async register(data: RegisterData, deviceInfo?: DeviceInfo): Promise<{ user: User; message: string }> {
    const email = (data.email || '').trim().toLowerCase();
    const username = (data.username || data.email || '').trim().toLowerCase();

    if (!email.endsWith(BETAGRO_EMAIL_DOMAIN)) {
      throw new ValidationError(BETAGRO_EMAIL_MESSAGE);
    }

    // Validate password strength
    const passwordValidation = PasswordUtil.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email?.toLowerCase() === email) {
        throw new UserAlreadyExistsError(EMAIL_IN_USE_MESSAGE);
      } else {
        throw new UserAlreadyExistsError('USERNAME_ALREADY_EXISTS');
      }
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(data.password);

    // Create user - filter out undefined values to satisfy exactOptionalPropertyTypes
    const userData: any = {
      email,
      username,
      password: hashedPassword,
      emailVerified: true,
      mustChangePassword: false
    };

    if (data.firstName !== undefined) {
      userData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      userData.lastName = data.lastName;
    }

    const user = await this.prisma.user.create({
      data: userData
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

    await this.ensureMonthlyAccessDefaults(user);

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
    const tokenFamily = TokenUtil.generateTokenFamily();
    const tokenPayload: Omit<AuthTokenPayload, 'iat' | 'exp' | 'type'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      jti: tokenFamily
    };

    const accessToken = TokenUtil.generateAccessToken(tokenPayload);
    const refreshToken = TokenUtil.generateRefreshToken(tokenPayload);

    // Store refresh token - filter out undefined values to satisfy exactOptionalPropertyTypes
    const refreshTokenData: any = {
      userId: user.id,
      token: refreshToken,
      family: tokenFamily,
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
        user: true
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
    const newTokenFamily = TokenUtil.generateTokenFamily();
    const newTokenPayload: Omit<AuthTokenPayload, 'iat' | 'exp' | 'type'> = {
      sub: storedToken.user.id,
      email: storedToken.user.email,
      username: storedToken.user.username,
      role: storedToken.user.role,
      jti: newTokenFamily
    };

    const newAccessToken = TokenUtil.generateAccessToken(newTokenPayload);
    const newRefreshToken = TokenUtil.generateRefreshToken(newTokenPayload);

    // Store new refresh token - filter out undefined values to satisfy exactOptionalPropertyTypes
    const newRefreshTokenData: any = {
      userId: storedToken.user.id,
      token: newRefreshToken,
      family: newTokenFamily,
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

  async changePassword(userId: string, data: ChangePasswordData, deviceInfo?: DeviceInfo): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new InvalidCredentialsError('Invalid user context');
    }

    const matches = await PasswordUtil.verify(user.password, data.currentPassword);
    if (!matches) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    const passwordValidation = PasswordUtil.validatePassword(data.newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const isSamePassword = await PasswordUtil.verify(user.password, data.newPassword);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from the current password');
    }

    const hashedPassword = await PasswordUtil.hash(data.newPassword);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      }
    });

    await this.auditService.log({
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: userId,
      details: { forceResetReleased: true },
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return this.mapUserToResponse(updatedUser);
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Update basic profile fields
   */
  async updateProfile(userId: string, data: UserUpdateData, deviceInfo?: DeviceInfo): Promise<User> {
    const updateData: Record<string, any> = {};

    if (data.firstName !== undefined) {
      updateData['firstName'] = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData['lastName'] = data.lastName;
    }

    if (Object.keys(updateData).length === 0) {
      return this.getCurrentUser(userId);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    await this.auditService.log({
      action: 'USER_PROFILE_UPDATED',
      resource: 'User',
      resourceId: user.id,
      details: updateData,
      ipAddress: deviceInfo?.ipAddress || 'unknown',
      userAgent: deviceInfo?.userAgent || 'unknown'
    });

    return this.mapUserToResponse(user);
  }

  /**
   * Map database user to response format
   */
  async listAdminUsers(): Promise<User[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      orderBy: [{ createdAt: 'asc' }]
    });
    return admins.map((admin) => this.mapUserToResponse(admin));
  }

  async updateAdminUser(
    userId: string,
    input: { mustChangePassword?: boolean; isActive?: boolean },
    ctx?: AdminActionContext
  ): Promise<User> {
    const data: Record<string, any> = {};

    if (typeof input.mustChangePassword === 'boolean') {
      data['mustChangePassword'] = input.mustChangePassword;
    }
    if (typeof input.isActive === 'boolean') {
      data['isActive'] = input.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data
    });

    const logData: AuditLogData & { userId?: string } = {
      action: 'ADMIN_USER_UPDATED',
      resource: 'User',
      resourceId: user.id,
      details: {
        ...data,
        updatedBy: ctx?.actorId || 'admin'
      },
      ipAddress: ctx?.ipAddress || 'unknown',
      userAgent: ctx?.userAgent || 'unknown'
    };

    if (ctx?.actorId) {
      logData.userId = ctx.actorId;
    }

    await this.auditService.log(logData);

    return this.mapUserToResponse(user);
  }

  async resetAdminPassword(
    userId: string,
    newPassword?: string,
    ctx?: AdminActionContext
  ): Promise<{ user: User; temporaryPassword: string }> {
    const password = newPassword?.trim() || PasswordUtil.generatePassword(14);
    const validation = PasswordUtil.validatePassword(password);
    if (!validation.isValid) {
      throw new ValidationError(`Password validation failed: ${validation.errors.join(', ')}`);
    }

    const hashedPassword = await PasswordUtil.hash(password);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true
      }
    });

    const logData: AuditLogData & { userId?: string } = {
      action: 'ADMIN_RESET_PASSWORD',
      resource: 'User',
      resourceId: user.id,
      details: {
        resetBy: ctx?.actorId || 'admin'
      },
      ipAddress: ctx?.ipAddress || 'unknown',
      userAgent: ctx?.userAgent || 'unknown'
    };

    if (ctx?.actorId) {
      logData.userId = ctx.actorId;
    }

    await this.auditService.log(logData);

    return {
      user: this.mapUserToResponse(user),
      temporaryPassword: password
    };
  }

  async seedAdminUsers(
    admins: Array<{ email: string; username: string; password: string; firstName?: string; mustChangePassword?: boolean }>,
    ctx?: AdminActionContext
  ): Promise<{ count: number; users: Array<{ email: string; action: 'created' | 'updated' }> }> {
    const results: Array<{ email: string; action: 'created' | 'updated' }> = [];

    for (const admin of admins) {
      const email = admin.email.trim().toLowerCase();
      const username = admin.username.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      const passwordHash = await PasswordUtil.hash(admin.password);

      const data = {
        email,
        username,
        firstName: admin.firstName ?? username,
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true,
        mustChangePassword: Boolean(admin.mustChangePassword)
      };

      let action: 'created' | 'updated' = 'created';
      let userRecord;

      if (existing) {
        userRecord = await this.prisma.user.update({
          where: { email },
          data
        });
        action = 'updated';
      } else {
        userRecord = await this.prisma.user.create({ data });
      }

      const logData: AuditLogData & { userId?: string } = {
        action: 'ADMIN_USER_SEEDED',
        resource: 'User',
        resourceId: userRecord.id,
        details: { email, action },
        ipAddress: ctx?.ipAddress || 'seed-script',
        userAgent: ctx?.userAgent || 'seed-script'
      };

      if (ctx?.actorId) {
        logData.userId = ctx.actorId;
      }

      await this.auditService.log(logData);

      results.push({ email, action });

      await this.ensureMonthlyAccessDefaults(userRecord);
    }

    return { count: results.length, users: results };
  }

  private async ensureMonthlyAccessDefaults(user: any) {
    if (!this.monthlyAccessProvisioner) return;
    if (!user || user.role !== Role.USER) return;

    try {
      await this.monthlyAccessProvisioner.seedDefaultAccessForUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role
      });
    } catch (error) {
      console.error('monthly access provisioning failed', error);
    }
  }

  private mapUserToResponse(user: any): User {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
