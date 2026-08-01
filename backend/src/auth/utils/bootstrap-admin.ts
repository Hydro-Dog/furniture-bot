import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ADMIN_ROLE } from '../constants/auth.constants';
import { validateAuthEnvOrThrow } from './auth-env';
import { hashPassword, verifyPassword } from './password';

interface ExistingUserRow {
  id: string;
  password_hash: string;
}

interface ExistingRoleRow {
  id: string;
}

export async function seedAuthDefaults(sequelize: Sequelize): Promise<void> {
  validateAuthEnvOrThrow();
  const roleId = await ensureAdminRole(sequelize);
  const userId = await ensureAdminUser(sequelize);

  await sequelize.query(
    `
    INSERT INTO user_roles (user_id, role_id)
    VALUES (:userId, :roleId)
    ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    {
      replacements: { userId, roleId },
      type: QueryTypes.INSERT
    }
  );
}

async function ensureAdminRole(sequelize: Sequelize): Promise<string> {
  const existing = await sequelize.query<ExistingRoleRow>(
    'SELECT id FROM roles WHERE code = :code LIMIT 1',
    {
      replacements: { code: ADMIN_ROLE },
      type: QueryTypes.SELECT
    }
  );

  if (existing[0]?.id) {
    return existing[0].id;
  }

  const inserted = await sequelize.query<ExistingRoleRow>(
    `
    INSERT INTO roles (code, name)
    VALUES (:code, :name)
    RETURNING id
    `,
    {
      replacements: { code: ADMIN_ROLE, name: 'Administrator' },
      type: QueryTypes.SELECT
    }
  );

  return inserted[0].id;
}

async function ensureAdminUser(sequelize: Sequelize): Promise<string> {
  const username = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');

  const existing = await sequelize.query<ExistingUserRow>(
    'SELECT id, password_hash FROM users WHERE lower(username) = :username LIMIT 1',
    {
      replacements: { username },
      type: QueryTypes.SELECT
    }
  );

  const existingUser = existing[0];
  if (existingUser) {
    const passwordMatches = await verifyPassword(existingUser.password_hash, password).catch(() => false);
    if (!passwordMatches) {
      await sequelize.query(
        `
        UPDATE users
        SET password_hash = :passwordHash, is_active = true, updated_at = now()
        WHERE id = :id
        `,
        {
          replacements: {
            id: existingUser.id,
            passwordHash: await hashPassword(password)
          },
          type: QueryTypes.UPDATE
        }
      );
    }

    return existingUser.id;
  }

  const inserted = await sequelize.query<ExistingUserRow>(
    `
    INSERT INTO users (username, password_hash, is_active)
    VALUES (:username, :passwordHash, true)
    RETURNING id, password_hash
    `,
    {
      replacements: {
        username,
        passwordHash: await hashPassword(password)
      },
      type: QueryTypes.SELECT
    }
  );

  return inserted[0].id;
}
