export class AuthError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 400, code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AuthError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message: string = 'Invalid credentials') {
    super(message, 401, 'INVALID_CREDENTIALS');
  }
}

export class UserNotFoundError extends AuthError {
  constructor(message: string = 'User not found') {
    super(message, 404, 'USER_NOT_FOUND');
  }
}

export class UserAlreadyExistsError extends AuthError {
  constructor(message: string = 'User already exists') {
    super(message, 409, 'USER_ALREADY_EXISTS');
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Token has expired') {
    super(message, 401, 'TOKEN_EXPIRED');
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message: string = 'Invalid token') {
    super(message, 401, 'INVALID_TOKEN');
  }
}
