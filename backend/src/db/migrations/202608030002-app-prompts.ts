import { QueryTypes } from 'sequelize';
import { FIRST_CONTACT_SYSTEM_PROMPT } from '../../prompts/prompt-samples';
import { MigrationHandler } from '../migration.types';

export const up: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS app_prompts (
      key TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_by TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await queryInterface.sequelize.query(
    `
    INSERT INTO app_prompts (key, content, updated_by)
    VALUES (:key, :content, :updatedBy)
    ON CONFLICT (key) DO NOTHING;
    `,
    {
      replacements: {
        key: 'main_chat_intake',
        content: FIRST_CONTACT_SYSTEM_PROMPT,
        updatedBy: 'system'
      },
      type: QueryTypes.INSERT
    }
  );
};

export const down: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS app_prompts;');
};
