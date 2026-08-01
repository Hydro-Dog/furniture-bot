export function validateAuthEnvOrThrow(): void {
  const missing = [
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'AUTH_ACCESS_SECRET'
  ].filter((key) => !String(process.env[key] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Missing required auth env: ${missing.join(', ')}`);
  }

  const secret = String(process.env.AUTH_ACCESS_SECRET || '');
  if (secret.length < 32) {
    throw new Error('AUTH_ACCESS_SECRET must be at least 32 characters long');
  }
}
