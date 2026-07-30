import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PromptReviewDto } from './dto/prompt-review.dto';
import { PromptDebugService } from './prompt-debug.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly promptDebugService: PromptDebugService
  ) {}

  @Get('dialogs')
  listDialogs() {
    return this.adminService.listDialogs();
  }

  @Delete('dialogs/:id')
  deleteDialog(@Param('id') id: string) {
    return this.adminService.deleteDialog(id);
  }

  @Post('debug/prompt-review')
  reviewPrompts(@Body() body: PromptReviewDto) {
    return this.promptDebugService.reviewPrompts(body.dialogIds);
  }
}
