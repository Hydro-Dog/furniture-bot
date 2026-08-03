export type RateLimitKeyMode = 'ip' | 'ip_username' | 'ip_dialog' | 'ip_public_token';

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
