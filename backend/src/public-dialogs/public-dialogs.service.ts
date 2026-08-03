import { Injectable } from '@nestjs/common';
import { DialogsService } from '../dialogs/dialogs.service';
import type { PublicDialogEntity } from '../dialogs/dialog.types';
import { WorkflowService } from '../workflow/workflow.service';

@Injectable()
export class PublicDialogsService {
  constructor(
    private readonly dialogsService: DialogsService,
    private readonly workflowService: WorkflowService
  ) {}

  getByToken(token: string): Promise<PublicDialogEntity> {
    return this.dialogsService.getPublicByToken(token);
  }

  async appendMessage(token: string, content: string): Promise<{
    dialog: PublicDialogEntity;
    assistantReply: string;
  }> {
    const dialogId = await this.dialogsService.getDialogIdByPublicToken(token);
    const result = await this.workflowService.appendUserMessage(dialogId, content);

    return {
      dialog: await this.dialogsService.getPublicByToken(token),
      assistantReply: result.assistantReply
    };
  }

  updateFeedback(token: string, feedback: string): Promise<PublicDialogEntity> {
    return this.dialogsService.updatePublicFeedback(token, feedback);
  }
}
