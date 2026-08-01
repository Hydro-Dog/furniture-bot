import { MigrationHandler } from '../migration.types';

export const up: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );
  `);

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      family_id UUID NOT NULL,
      rotated_from_id UUID NULL REFERENCES refresh_sessions(id) ON DELETE SET NULL,
      csrf_token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at TIMESTAMPTZ NULL,
      user_agent TEXT NULL,
      ip TEXT NULL
    );
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS refresh_sessions_user_id_idx
    ON refresh_sessions (user_id);
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS refresh_sessions_family_id_idx
    ON refresh_sessions (family_id);
  `);
};

export const down: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS refresh_sessions;');
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS user_roles;');
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS roles;');
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS users;');
};
