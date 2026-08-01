import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DialogModel } from '../dialogs/dialog.model';
import { getDatabaseConfig } from './database.config';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      useFactory: () => {
        const dbConfig = getDatabaseConfig();

        return {
          dialect: 'postgres' as const,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          models: [DialogModel],
          autoLoadModels: false,
          synchronize: false,
          logging: false
        };
      }
    })
  ]
})
export class DatabaseModule {}
