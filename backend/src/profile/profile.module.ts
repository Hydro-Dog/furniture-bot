import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ProfileService } from './profile.service';

@Module({
  imports: [LlmModule],
  providers: [ProfileService],
  exports: [ProfileService]
})
export class ProfileModule {}

