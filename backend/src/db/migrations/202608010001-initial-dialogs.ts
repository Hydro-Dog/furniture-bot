import { MigrationHandler } from '../migration.types';

export const up: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS dialogs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status VARCHAR(255) NOT NULL DEFAULT 'active',
      current_step VARCHAR(255) NOT NULL DEFAULT 'first_contact',
      context JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ NULL
    );
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS dialogs_deleted_at_idx
    ON dialogs (deleted_at);
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS dialogs_updated_at_idx
    ON dialogs (updated_at);
  `);
};

export const down: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS dialogs;');
};
