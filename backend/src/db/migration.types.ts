import { QueryInterface } from 'sequelize';

export interface MigrationParams {
  context: QueryInterface;
}

export type MigrationHandler = (params: MigrationParams) => Promise<void>;
