import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { ChatIntakeModule } from './chat-intake/chat-intake.module';
import { DatabaseModule } from './database/database.module';
import { DialogsModule } from './dialogs/dialogs.module';
import { HealthController } from './health.controller';
import { PricingModule } from './pricing/pricing.module';
import { ProfileModule } from './profile/profile.module';
import { SpecificationModule } from './specification/specification.module';
import { TechnicalBriefModule } from './technical-brief/technical-brief.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    DatabaseModule,
    DialogsModule,
    ChatIntakeModule,
    ProfileModule,
    TechnicalBriefModule,
    SpecificationModule,
    PricingModule,
    WorkflowModule,
    AdminModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
