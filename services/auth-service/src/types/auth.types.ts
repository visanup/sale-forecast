export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  username: string; // Can be email or username
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export type TokenType = 'access' | 'refresh' | 'password_reset';

export interface BaseTokenPayload {
  sub: string; // User ID
  jti?: string; // JWT ID
  iat: number; // Issued at
  exp: number; // Expires at
  type: TokenType; // Token type
  iss?: string; // Issuer
  aud?: string; // Audience
}

export interface AuthTokenPayload extends BaseTokenPayload {
  email: string;
  username: string;
  role: UserRole;
  jti: string;
  type: 'access' | 'refresh';
}

export interface PasswordResetTokenPayload extends BaseTokenPayload {
  type: 'password_reset';
}

export type TokenPayload = AuthTokenPayload | PasswordResetTokenPayload;

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

export interface RefreshTokenData {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  newPassword: string;
}

// Email verification disabled

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserStatusUpdate {
  isActive: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  requestId?: string;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface AuditLogData {
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceFingerprint?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbiddenPasswords: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

export interface JWTConfig {
  accessToken: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
  refreshToken: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
}
