import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AUTH_PUBLIC_KEY } from '../constants/auth.constants';
import { AuthUser } from '../types/auth.types';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const tokenHeader = request.header('x-csrf-token');
    if (!request.user?.csrfToken || !tokenHeader || tokenHeader !== request.user.csrfToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
