export type RateLimitKeyMode = 'ip' | 'ip_username' | 'ip_dialog';

export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
  cooldownMs: number;
  keyMode: RateLimitKeyMode;
  scope: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}
