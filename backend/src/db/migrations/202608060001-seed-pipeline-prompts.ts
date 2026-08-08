import { QueryTypes } from 'sequelize';
import {
  CLIENT_PROFILE_PROMPT,
  FIRST_CONTACT_SYSTEM_PROMPT,
  PROMPT_REVIEW_PROMPT,
  SPECIFICATION_PROMPT,
  TECHNICAL_BRIEF_PROMPT
} from '../../prompts/prompt-samples';
import { MigrationHandler } from '../migration.types';

const PROMPTS = [
  {
    key: 'main_chat_intake',
    content: FIRST_CONTACT_SYSTEM_PROMPT
  },
  {
    key: 'client_profile',
    content: CLIENT_PROFILE_PROMPT
  },
  {
    key: 'technical_brief',
    content: TECHNICAL_BRIEF_PROMPT
  },
  {
    key: 'specification',
    content: SPECIFICATION_PROMPT
  },
  {
    key: 'prompt_review',
    content: PROMPT_REVIEW_PROMPT
  }
];

export const up: MigrationHandler = async ({ context: queryInterface }) => {
  for (const prompt of PROMPTS) {
    await queryInterface.sequelize.query(
      `
      INSERT INTO app_prompts (key, content, updated_by)
      VALUES (:key, :content, :updatedBy)
      ON CONFLICT (key) DO NOTHING;
      `,
      {
        replacements: {
          key: prompt.key,
          content: prompt.content,
          updatedBy: 'system'
        },
        type: QueryTypes.INSERT
      }
    );
  }
};

export const down: MigrationHandler = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(
    `
    DELETE FROM app_prompts
    WHERE key IN (:keys)
      AND updated_by = :updatedBy;
    `,
    {
      replacements: {
        keys: PROMPTS
          .filter((prompt) => prompt.key !== 'main_chat_intake')
          .map((prompt) => prompt.key),
        updatedBy: 'system'
      },
      type: QueryTypes.DELETE
    }
  );
};
