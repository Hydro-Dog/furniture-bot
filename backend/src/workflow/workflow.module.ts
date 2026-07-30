import { Module } from '@nestjs/common';
import { ChatIntakeModule } from '../chat-intake/chat-intake.module';
import { DialogsModule } from '../dialogs/dialogs.module';
import { PricingModule } from '../pricing/pricing.module';
import { ProfileModule } from '../profile/profile.module';
import { SpecificationModule } from '../specification/specification.module';
import { TechnicalBriefModule } from '../technical-brief/technical-brief.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [
    DialogsModule,
    ChatIntakeModule,
    ProfileModule,
    TechnicalBriefModule,
    SpecificationModule,
    PricingModule
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService]
})
export class WorkflowModule {}

