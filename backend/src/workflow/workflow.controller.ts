import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { CreateMessageDto } from '../dialogs/dto/create-message.dto';
import { UpdateSpecificationDto } from '../dialogs/dto/update-specification.dto';
import { DEFAULT_OPENAI_RATE_LIMIT } from '../rate-limit/constants/rate-limit.constants';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { WorkflowService } from './workflow.service';

@Controller('dialogs')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @RateLimit({
    ...DEFAULT_OPENAI_RATE_LIMIT,
    keyMode: 'ip_dialog'
  })
  @Post(':id/messages')
  appendMessage(@Param('id') id: string, @Body() body: CreateMessageDto) {
    return this.workflowService.appendUserMessage(id, body.content);
  }

  @RateLimit(DEFAULT_OPENAI_RATE_LIMIT)
  @Post(':id/profile/regenerate')
  regenerateProfile(@Param('id') id: string) {
    return this.workflowService.regenerateProfile(id);
  }

  @RateLimit(DEFAULT_OPENAI_RATE_LIMIT)
  @Post(':id/technical-brief/regenerate')
  regenerateTechnicalBrief(@Param('id') id: string) {
    return this.workflowService.regenerateTechnicalBrief(id);
  }

  @RateLimit(DEFAULT_OPENAI_RATE_LIMIT)
  @Post(':id/specification/regenerate')
  regenerateSpecification(@Param('id') id: string) {
    return this.workflowService.regenerateSpecification(id);
  }

  @Put(':id/specification')
  updateSpecification(@Param('id') id: string, @Body() body: UpdateSpecificationDto) {
    return this.workflowService.updateSpecification(id, body.rows);
  }

  @RateLimit(DEFAULT_OPENAI_RATE_LIMIT)
  @Post(':id/estimate/recalculate')
  recalculateEstimate(@Param('id') id: string) {
    return this.workflowService.recalculateEstimate(id);
  }
}
