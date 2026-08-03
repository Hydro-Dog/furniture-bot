import { Module } from '@nestjs/common';
import { DialogsModule } from '../dialogs/dialogs.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { PublicDialogsController } from './public-dialogs.controller';
import { PublicDialogsService } from './public-dialogs.service';

@Module({
  imports: [DialogsModule, WorkflowModule],
  controllers: [PublicDialogsController],
  providers: [PublicDialogsService]
})
export class PublicDialogsModule {}
