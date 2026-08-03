import { Injectable } from '@nestjs/common';
import { DialogsService } from '../dialogs/dialogs.service';
import type { DialogEntity, PublicDialogLinkResult } from '../dialogs/dialog.types';

@Injectable()
export class AdminService {
  constructor(private readonly dialogsService: DialogsService) {}

  async listDialogs() {
    const dialogs = await this.dialogsService.list();
    return dialogs.map((dialog) => this.toListItem(dialog));
  }

  async deleteDialog(id: string): Promise<{ ok: true }> {
    await this.dialogsService.softDelete(id);
    return { ok: true };
  }

  createTestDialogLink(): Promise<PublicDialogLinkResult> {
    return this.dialogsService.createWithPublicLink();
  }

  createDialogTestLink(id: string): Promise<PublicDialogLinkResult> {
    return this.dialogsService.createPublicLink(id);
  }

  updateFeedback(id: string, feedback: string): Promise<DialogEntity> {
    return this.dialogsService.updateFeedback(id, feedback, 'admin');
  }

  private toListItem(dialog: DialogEntity) {
    const profile = dialog.context.profile?.json;
    const client = this.asRecord(profile?.client);
    const request = this.asRecord(profile?.request);
    const estimate = dialog.context.estimate;

    return {
      id: dialog.id,
      status: dialog.status,
      currentStep: dialog.currentStep,
      clientName: this.stringOrNull(client?.name),
      contact: this.stringOrNull(client?.contact),
      requestSummary: this.stringOrNull(request?.furniture_type)
        || this.stringOrNull(request?.room)
        || dialog.context.profile?.summary
        || this.getLastUserMessage(dialog),
      estimateTotal: estimate?.total ?? null,
      estimateComplete: estimate?.isComplete ?? false,
      publicAccess: dialog.publicAccess,
      publicFeedback: dialog.publicFeedback,
      createdAt: dialog.createdAt,
      updatedAt: dialog.updatedAt
    };
  }

  private getLastUserMessage(dialog: DialogEntity): string | null {
    return [...dialog.context.messages]
      .reverse()
      .find((message) => message.role === 'user')?.content ?? null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
      ? value as Record<string, unknown>
      : null;
  }

  private stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
