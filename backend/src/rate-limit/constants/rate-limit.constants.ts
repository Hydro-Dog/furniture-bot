export const RATE_LIMIT_POLICY_KEY = 'rate-limit:policy';
export const RATE_LIMIT_SKIP_KEY = 'rate-limit:skip';

export const DEFAULT_RATE_LIMIT_SCOPE = 'default';
export const LOGIN_RATE_LIMIT_SCOPE = 'auth_login';
export const OPENAI_RATE_LIMIT_SCOPE = 'openai';
export const DIALOG_RATE_LIMIT_SCOPE = 'dialogs';

export const DEFAULT_LOGIN_RATE_LIMIT = {
  limit: Number(process.env.RATE_LIMIT_LOGIN_MAX || 5),
  windowMs: 60_000,
  cooldownMs: 60_000,
  keyMode: 'ip_username' as const,
  scope: LOGIN_RATE_LIMIT_SCOPE
};

export const DEFAULT_OPENAI_RATE_LIMIT = {
  limit: Number(process.env.RATE_LIMIT_OPENAI_MAX || 20),
  windowMs: 60_000,
  cooldownMs: 60_000,
  keyMode: 'ip' as const,
  scope: OPENAI_RATE_LIMIT_SCOPE
};
