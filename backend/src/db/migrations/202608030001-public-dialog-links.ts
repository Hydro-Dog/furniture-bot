import { MigrationHandler } from '../migration.types';

export const up: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE dialogs
      ADD COLUMN IF NOT EXISTS public_access_token_id UUID NULL,
      ADD COLUMN IF NOT EXISTS public_access_token_hash TEXT NULL,
      ADD COLUMN IF NOT EXISTS public_access_expires_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS public_access_created_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS public_feedback TEXT NULL,
      ADD COLUMN IF NOT EXISTS public_feedback_updated_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS public_feedback_updated_by TEXT NULL;
  `);

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS dialogs_public_access_token_hash_uidx
    ON dialogs (public_access_token_hash)
    WHERE public_access_token_hash IS NOT NULL;
  `);
};

export const down: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query('DROP INDEX IF EXISTS dialogs_public_access_token_hash_uidx;');
  await queryInterface.sequelize.query(`
    ALTER TABLE dialogs
      DROP COLUMN IF EXISTS public_access_token_id,
      DROP COLUMN IF EXISTS public_access_token_hash,
      DROP COLUMN IF EXISTS public_access_expires_at,
      DROP COLUMN IF EXISTS public_access_created_at,
      DROP COLUMN IF EXISTS public_feedback,
      DROP COLUMN IF EXISTS public_feedback_updated_at,
      DROP COLUMN IF EXISTS public_feedback_updated_by;
  `);
};
