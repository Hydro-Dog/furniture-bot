export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || process.env.POSTGRES_USER || 'furniture',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'furniture',
    database: process.env.DB_NAME || process.env.POSTGRES_DB || 'furniture_bot'
  };
}
