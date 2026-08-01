import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ACCESS_COOKIE_NAME, AUTH_PUBLIC_KEY } from '../constants/auth.constants';
import { AuthUser } from '../types/auth.types';
import { verifyAccessToken } from '../utils/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & {
      user?: AuthUser;
      cookies?: Record<string, string>;
    }>();
    const accessToken = request.cookies?.[ACCESS_COOKIE_NAME];
    if (!accessToken) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = verifyAccessToken(accessToken);
      request.user = {
        id: payload.sub,
        username: payload.username,
        roles: payload.roles,
        csrfToken: payload.csrfToken,
        refreshSessionId: payload.refreshSessionId
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
