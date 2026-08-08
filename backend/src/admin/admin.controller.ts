import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { UpdateFeedbackDto } from '../dialogs/dto/update-feedback.dto';
import { AuthUser } from '../auth/types/auth.types';
import { UpdateMainPromptDto } from '../prompts/dto/update-main-prompt.dto';
import { PromptConfigService } from '../prompts/prompt-config.service';
import { AppPromptKey } from '../prompts/prompt.types';
import { DEFAULT_OPENAI_RATE_LIMIT } from '../rate-limit/constants/rate-limit.constants';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { AdminService } from './admin.service';
import { PromptReviewDto } from './dto/prompt-review.dto';
import { PromptDebugService } from './prompt-debug.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly promptDebugService: PromptDebugService,
    private readonly promptConfigService: PromptConfigService
  ) {}

  @Get('dialogs')
  listDialogs() {
    return this.adminService.listDialogs();
  }

  @Delete('dialogs/:id')
  deleteDialog(@Param('id') id: string) {
    return this.adminService.deleteDialog(id);
  }

  @Post('test-dialog-links')
  createTestDialogLink() {
    return this.adminService.createTestDialogLink();
  }

  @Post('dialogs/:id/test-link')
  createDialogTestLink(@Param('id') id: string) {
    return this.adminService.createDialogTestLink(id);
  }

  @Put('dialogs/:id/feedback')
  updateFeedback(@Param('id') id: string, @Body() body: UpdateFeedbackDto) {
    return this.adminService.updateFeedback(id, body.feedback);
  }

  @Get('prompts/main-chat-intake')
  getMainChatIntakePrompt() {
    return this.promptConfigService.getMainChatIntakePrompt();
  }

  @Get('prompts')
  listPrompts() {
    return this.promptConfigService.listPrompts();
  }

  @Put('prompts/main-chat-intake')
  updateMainChatIntakePrompt(
    @Body() body: UpdateMainPromptDto,
    @Req() request: Request & { user?: AuthUser }
  ) {
    return this.promptConfigService.updateMainChatIntakePrompt(
      body.content,
      request.user?.username ?? 'admin'
    );
  }

  @Put('prompts/:key')
  updatePrompt(
    @Param('key') key: AppPromptKey,
    @Body() body: UpdateMainPromptDto,
    @Req() request: Request & { user?: AuthUser }
  ) {
    return this.promptConfigService.updatePrompt(
      key,
      body.content,
      request.user?.username ?? 'admin'
    );
  }

  @RateLimit(DEFAULT_OPENAI_RATE_LIMIT)
  @Post('debug/prompt-review')
  reviewPrompts(@Body() body: PromptReviewDto) {
    return this.promptDebugService.reviewPrompts(body.dialogIds);
  }
}
