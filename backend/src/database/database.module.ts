import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DialogModel } from '../dialogs/dialog.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || process.env.POSTGRES_USER || 'furniture',
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'furniture',
      database: process.env.DB_NAME || process.env.POSTGRES_DB || 'furniture_bot',
      models: [DialogModel],
      autoLoadModels: true,
      synchronize: true,
      logging: false
    })
  ]
})
export class DatabaseModule {}

