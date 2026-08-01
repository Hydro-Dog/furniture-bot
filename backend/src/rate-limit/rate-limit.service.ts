import { Injectable } from '@nestjs/common';
import { RateLimitPolicy, RateLimitResult } from './types/rate-limit.types';

interface Bucket {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, policy: RateLimitPolicy): RateLimitResult {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (current?.blockedUntil && current.blockedUntil > now) {
      return {
        allowed: false,
        retryAfterMs: current.blockedUntil - now
      };
    }

    const bucket = !current || current.resetAt <= now
      ? {
        count: 0,
        resetAt: now + policy.windowMs,
        blockedUntil: 0
      }
      : current;

    bucket.count += 1;

    if (bucket.count > policy.limit) {
      bucket.blockedUntil = now + policy.cooldownMs;
      this.buckets.set(key, bucket);
      return {
        allowed: false,
        retryAfterMs: policy.cooldownMs
      };
    }

    this.buckets.set(key, bucket);
    this.prune(now);
    return {
      allowed: true,
      retryAfterMs: 0
    };
  }

  private prune(now: number): void {
    if (this.buckets.size < 1000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now && bucket.blockedUntil <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
