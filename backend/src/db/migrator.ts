import * as path from 'node:path';
import { QueryInterface } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { SequelizeStorage, Umzug } from 'umzug';
import { getDatabaseConfig } from '../database/database.config';

export function createSequelizeInstance(): Sequelize {
  const dbConfig = getDatabaseConfig();

  return new Sequelize({
    dialect: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    logging: false
  });
}

export function createMigrator(sequelize: Sequelize): Umzug<QueryInterface> {
  const runtimeExtension = path.extname(__filename) === '.ts' ? 'ts' : 'js';
  const migrationsGlob = path.join(__dirname, 'migrations', `*.${runtimeExtension}`);

  return new Umzug<QueryInterface>({
    migrations: {
      glob: migrationsGlob
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({
      sequelize,
      modelName: 'SequelizeMeta',
      tableName: 'sequelize_meta'
    }),
    logger: console
  });
}

export async function waitForDatabase(
  sequelize: Sequelize,
  retries = 30,
  delayMs = 2000
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await sequelize.authenticate();
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
