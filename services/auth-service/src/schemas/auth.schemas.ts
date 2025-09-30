// Fastify v5 uses JSON Schema by default. Export plain JSON Schemas here.

// Login schema (body)
export const loginSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 1 }
  },
  required: ['username', 'password'],
  additionalProperties: false
} as const;

// Register schema (body)
export const registerSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' },
    password: { type: 'string', minLength: 8 },
    firstName: { type: 'string' },
    lastName: { type: 'string' }
  },
  required: ['email', 'username', 'password'],
  additionalProperties: false
} as const;

// Refresh token schema (body)
export const refreshTokenSchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string', minLength: 1 }
  },
  required: ['refreshToken'],
  additionalProperties: false
} as const;

// Password reset request schema (body)
export const passwordResetRequestSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' }
  },
  required: ['email'],
  additionalProperties: false
} as const;

// Password reset schema (body)
export const passwordResetSchema = {
  type: 'object',
  properties: {
    token: { type: 'string', minLength: 1 },
    newPassword: { type: 'string', minLength: 8 }
  },
  required: ['token', 'newPassword'],
  additionalProperties: false
} as const;

// Change password schema (body)
export const changePasswordSchema = {
  type: 'object',
  properties: {
    currentPassword: { type: 'string', minLength: 1 },
    newPassword: { type: 'string', minLength: 8 }
  },
  required: ['currentPassword', 'newPassword'],
  additionalProperties: false
} as const;

// Update profile schema (body)
export const updateProfileSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' }
  },
  additionalProperties: false
} as const;

// User list query schema (querystring)
export const userListQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1 },
    search: { type: 'string' },
    role: { type: 'string' },
    isActive: { type: 'boolean' }
  },
  additionalProperties: false
} as const;

// Role assignment schema (body)
export const roleAssignmentSchema = {
  type: 'object',
  properties: {
    roleIds: { type: 'array', items: { type: 'integer', minimum: 1 } }
  },
  required: ['roleIds'],
  additionalProperties: false
} as const;

// User status update schema (body)
export const userStatusUpdateSchema = {
  type: 'object',
  properties: {
    isActive: { type: 'boolean' }
  },
  required: ['isActive'],
  additionalProperties: false
} as const;

// Create role schema (body)
export const createRoleSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' }, minItems: 1 }
  },
  required: ['name', 'permissions'],
  additionalProperties: false
} as const;

// Update role schema (body)
export const updateRoleSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
    isActive: { type: 'boolean' }
  },
  additionalProperties: false
} as const;

// Audit log query schema (querystring)
export const auditLogQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1 },
    action: { type: 'string' },
    resource: { type: 'string' },
    resourceId: { type: 'string' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' }
  },
  additionalProperties: false
} as const;
