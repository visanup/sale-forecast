import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

type JwtHeader = {
  alg?: string;
  [key: string]: unknown;
};

type JwtPayload = {
  sub?: string;
  email?: string;
  username?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
};

export type RequestActor = {
  performedBy: string | null;
  user?: {
    id: string;
    email?: string;
    username?: string;
    role?: string;
  };
  clientId?: string | null;
};

const HMAC_ALGORITHMS: Record<string, string> = {
  HS256: 'sha256',
  HS384: 'sha384',
  HS512: 'sha512'
};

const jwtAccessSecret = process.env['JWT_ACCESS_SECRET'] || '';

/**
 * Attempt to resolve the user performing the request from the Authorization header.
 * Falls back to the API client id injected by apiKeyAuth middleware.
 */
export function resolveRequestActor(req: Request & { apiClientId?: string }): RequestActor {
  const clientId = req.apiClientId || (req as any).apiClientId;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const actorFromToken = typeof authHeader === 'string' ? parseBearerToken(authHeader) : null;

  if (actorFromToken) {
    return {
      performedBy: actorFromToken.identifier,
      user: actorFromToken.user,
      clientId: clientId ?? null
    };
  }

  return {
    performedBy: clientId ?? null,
    clientId: clientId ?? null
  };
}

type ParsedTokenActor = {
  identifier: string;
  user: {
    id: string;
    email?: string;
    username?: string;
    role?: string;
  };
};

function parseBearerToken(headerValue: string): ParsedTokenActor | null {
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (!token) return null;

  const payload = decodeJwt(token);
  if (!payload?.sub) return null;

  const user = buildUserFromPayload(payload);
  if (!user) return null;

  const identifier = user.username
    ? `user:${user.username}`
    : user.email
      ? `user:${user.email}`
      : `user:${user.id}`;

  return { identifier, user };
}

function buildUserFromPayload(payload: JwtPayload) {
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;

  const result: ParsedTokenActor['user'] = { id: payload.sub };
  if (typeof payload.email === 'string' && payload.email.length > 0) {
    result.email = payload.email;
  }
  if (typeof payload.username === 'string' && payload.username.length > 0) {
    result.username = payload.username;
  }
  if (typeof (payload as any)?.role === 'string' && (payload as any).role.length > 0) {
    result.role = (payload as any).role;
  }

  return result;
}

function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: JwtHeader;
  let payload: JwtPayload;

  try {
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.exp && typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }
  }

  if (!jwtAccessSecret) {
    // No secret configured; return decoded payload without signature validation.
    return payload;
  }

  const hmacAlgorithm = header.alg ? HMAC_ALGORITHMS[header.alg] : undefined;
  if (!hmacAlgorithm) {
    return null;
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = createHmac(hmacAlgorithm, jwtAccessSecret).update(data).digest();
  let signature: Buffer;

  try {
    signature = Buffer.from(encodedSignature, 'base64url');
  } catch {
    return null;
  }

  if (signature.length !== expected.length) {
    return null;
  }

  try {
    if (!timingSafeEqual(signature, expected)) {
      return null;
    }
  } catch {
    return null;
  }

  return payload;
}

export function withActorMetadata(
  base: Prisma.InputJsonObject,
  actor: RequestActor
): Prisma.InputJsonValue {
  const metadata: Record<string, Prisma.InputJsonValue | null> = {
    ...(base as Record<string, Prisma.InputJsonValue | null>)
  };

  if (actor.user) {
    metadata.user = actor.user as Prisma.InputJsonValue;
  }

  if (actor.clientId) {
    metadata.apiClientId = actor.clientId;
  }

  return metadata as Prisma.InputJsonValue;
}
