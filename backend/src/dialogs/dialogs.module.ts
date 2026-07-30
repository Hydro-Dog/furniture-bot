import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DialogModel } from './dialog.model';
import { DialogsController } from './dialogs.controller';
import { DialogsService } from './dialogs.service';

@Module({
  imports: [SequelizeModule.forFeature([DialogModel])],
  controllers: [DialogsController],
  providers: [DialogsService],
  exports: [DialogsService]
})
export class DialogsModule {}

