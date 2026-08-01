import { Response } from 'express';
import { ACCESS_COOKIE_NAME, CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../constants/auth.constants';

function cookieSecure(): boolean {
  return process.env.AUTH_COOKIE_SECURE === 'true';
}

export function setAccessCookie(res: Response, token: string, maxAgeSeconds: number): void {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds * 1000
  });
}

export function setRefreshCookie(res: Response, token: string, maxAgeSeconds: number): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeSeconds * 1000
  });
}

export function setCsrfCookie(res: Response, token: string, maxAgeSeconds: number): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: cookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds * 1000
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}
