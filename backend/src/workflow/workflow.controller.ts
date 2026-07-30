import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { CreateMessageDto } from '../dialogs/dto/create-message.dto';
import { UpdateSpecificationDto } from '../dialogs/dto/update-specification.dto';
import { WorkflowService } from './workflow.service';

@Controller('dialogs')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post(':id/messages')
  appendMessage(@Param('id') id: string, @Body() body: CreateMessageDto) {
    return this.workflowService.appendUserMessage(id, body.content);
  }

  @Post(':id/profile/regenerate')
  regenerateProfile(@Param('id') id: string) {
    return this.workflowService.regenerateProfile(id);
  }

  @Post(':id/technical-brief/regenerate')
  regenerateTechnicalBrief(@Param('id') id: string) {
    return this.workflowService.regenerateTechnicalBrief(id);
  }

  @Post(':id/specification/regenerate')
  regenerateSpecification(@Param('id') id: string) {
    return this.workflowService.regenerateSpecification(id);
  }

  @Put(':id/specification')
  updateSpecification(@Param('id') id: string, @Body() body: UpdateSpecificationDto) {
    return this.workflowService.updateSpecification(id, body.rows);
  }

  @Post(':id/estimate/recalculate')
  recalculateEstimate(@Param('id') id: string) {
    return this.workflowService.recalculateEstimate(id);
  }
}

