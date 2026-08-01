import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ChatIntakeModule } from './chat-intake/chat-intake.module';
import { DatabaseModule } from './database/database.module';
import { DialogsModule } from './dialogs/dialogs.module';
import { PricingModule } from './pricing/pricing.module';
import { ProfileModule } from './profile/profile.module';
import { RateLimitGuard } from './rate-limit/guards/rate-limit.guard';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { SpecificationModule } from './specification/specification.module';
import { TechnicalBriefModule } from './technical-brief/technical-brief.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    DatabaseModule,
    RateLimitModule,
    AuthModule,
    DialogsModule,
    ChatIntakeModule,
    ProfileModule,
    TechnicalBriefModule,
    SpecificationModule,
    PricingModule,
    WorkflowModule,
    AdminModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard
    }
  ]
})
export class AppModule {}
