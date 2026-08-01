import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  DEFAULT_RATE_LIMIT_SCOPE,
  RATE_LIMIT_POLICY_KEY,
  RATE_LIMIT_SKIP_KEY
} from '../constants/rate-limit.constants';
import { RateLimitService } from '../rate-limit.service';
import { RateLimitPolicy } from '../types/rate-limit.types';

type HttpRequest = Request & {
  route?: {
    path?: string;
  };
  body?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (skipRateLimit) {
      return true;
    }

    const policyOverrides = this.reflector.getAllAndOverride<Partial<RateLimitPolicy>>(
      RATE_LIMIT_POLICY_KEY,
      [context.getHandler(), context.getClass()]
    );
    const policy = this.resolvePolicy(policyOverrides);
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const ip = this.extractIp(request);
    const routePath = request.route?.path || request.path || 'unknown';
    const method = request.method || 'UNKNOWN';
    const subject = this.resolveSubject(policy.keyMode, request, ip);
    const key = `${policy.scope}:${method}:${routePath}:${subject}`;
    const result = this.rateLimitService.consume(key, policy);

    if (result.allowed) {
      return true;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
    response.setHeader('Retry-After', String(retryAfterSeconds));
    throw new HttpException(
      `Too many requests. Retry after ${retryAfterSeconds} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  private resolvePolicy(overrides?: Partial<RateLimitPolicy>): RateLimitPolicy {
    return {
      limit: this.readPositiveInt('RATE_LIMIT_DEFAULT_LIMIT', 120),
      windowMs: this.readPositiveInt('RATE_LIMIT_DEFAULT_WINDOW_MS', 60_000),
      cooldownMs: this.readPositiveInt('RATE_LIMIT_DEFAULT_COOLDOWN_MS', 30_000),
      keyMode: 'ip',
      scope: DEFAULT_RATE_LIMIT_SCOPE,
      ...overrides
    };
  }

  private extractIp(request: HttpRequest): string {
    const forwardedFor = request.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwardedFor) {
      return forwardedFor;
    }
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  private resolveSubject(
    keyMode: RateLimitPolicy['keyMode'],
    request: HttpRequest,
    ip: string
  ): string {
    if (keyMode === 'ip_username') {
      const username = request.body?.username;
      return `${ip}:${typeof username === 'string' ? username.trim().toLowerCase() : 'unknown'}`;
    }

    if (keyMode === 'ip_dialog') {
      return `${ip}:${request.params?.id || 'unknown'}`;
    }

    return ip;
  }

  private readPositiveInt(envKey: string, fallback: number): number {
    const raw = process.env[envKey];
    if (!raw) {
      return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.floor(parsed);
  }
}
