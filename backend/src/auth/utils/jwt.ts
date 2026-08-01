import { sign, verify } from 'jsonwebtoken';
import { AccessTokenPayload } from '../types/auth.types';

function getAccessSecret(): string {
  const secret = (process.env.AUTH_ACCESS_SECRET || '').trim();
  if (!secret) {
    throw new Error('AUTH_ACCESS_SECRET is required');
  }
  if (secret.length < 32) {
    throw new Error('AUTH_ACCESS_SECRET must be at least 32 characters long');
  }
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload, expiresInSeconds: number): string {
  return sign(payload, getAccessSecret(), {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = verify(token, getAccessSecret());
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid access token payload');
  }

  const raw = decoded as Partial<AccessTokenPayload>;
  if (
    typeof raw.sub !== 'string'
    || typeof raw.username !== 'string'
    || !Array.isArray(raw.roles)
    || typeof raw.csrfToken !== 'string'
    || typeof raw.refreshSessionId !== 'string'
  ) {
    throw new Error('Invalid access token claims');
  }

  return {
    sub: raw.sub,
    username: raw.username,
    roles: raw.roles.filter((role): role is string => typeof role === 'string'),
    csrfToken: raw.csrfToken,
    refreshSessionId: raw.refreshSessionId
  };
}
