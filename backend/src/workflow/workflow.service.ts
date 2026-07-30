import { Injectable } from '@nestjs/common';
import { ChatIntakeService } from '../chat-intake/chat-intake.service';
import { DialogsService } from '../dialogs/dialogs.service';
import type {
  ChatMessage,
  DialogContext,
  DialogEntity,
  DialogStatus,
  DialogStep,
  SpecificationRow
} from '../dialogs/dialog.types';
import { PricingService } from '../pricing/pricing.service';
import { ProfileService } from '../profile/profile.service';
import { SpecificationService } from '../specification/specification.service';
import { TechnicalBriefService } from '../technical-brief/technical-brief.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly dialogsService: DialogsService,
    private readonly chatIntakeService: ChatIntakeService,
    private readonly profileService: ProfileService,
    private readonly technicalBriefService: TechnicalBriefService,
    private readonly specificationService: SpecificationService,
    private readonly pricingService: PricingService
  ) {}

  async appendUserMessage(dialogId: string, content: string): Promise<{
    dialog: DialogEntity;
    assistantReply: string;
  }> {
    const dialog = await this.dialogsService.getById(dialogId);
    const context = this.cloneContext(dialog.context);
    const now = new Date().toISOString();
    context.messages.push({
      role: 'user',
      content: content.trim(),
      createdAt: now
    });
    context.workflow.timestamps.last_user_message = now;
    await this.persist(dialog.id, context);

    const assistantReply = await this.chatIntakeService.reply(context.messages);
    context.messages.push({
      role: 'assistant',
      content: assistantReply,
      createdAt: new Date().toISOString()
    });

    await this.runAutomaticStages(context);
    const updated = await this.persist(dialog.id, context);

    return {
      dialog: updated,
      assistantReply
    };
  }

  async regenerateProfile(dialogId: string): Promise<DialogEntity> {
    const dialog = await this.dialogsService.getById(dialogId);
    const context = this.cloneContext(dialog.context);
    context.profile = await this.profileService.buildProfile(context.messages);
    context.workflow.timestamps.profile_regenerated = new Date().toISOString();
    return this.persist(dialog.id, context);
  }

  async regenerateTechnicalBrief(dialogId: string): Promise<DialogEntity> {
    const dialog = await this.dialogsService.getById(dialogId);
    const context = this.cloneContext(dialog.context);
    if (!context.profile) {
      context.profile = await this.profileService.buildProfile(context.messages);
    }
    context.technicalBrief = await this.technicalBriefService.buildTechnicalBrief(context);
    context.workflow.timestamps.technical_brief_regenerated = new Date().toISOString();
    return this.persist(dialog.id, context);
  }

  async regenerateSpecification(dialogId: string): Promise<DialogEntity> {
    const dialog = await this.dialogsService.getById(dialogId);
    const context = this.cloneContext(dialog.context);
    if (!context.profile) {
      context.profile = await this.profileService.buildProfile(context.messages);
    }
    if (!context.technicalBrief) {
      context.technicalBrief = await this.technicalBriefService.buildTechnicalBrief(context);
    }
    context.specification = await this.specificationService.generateSpecification(context);
    context.estimate = this.pricingService.calculate(context.specification.rows);
    context.workflow.timestamps.specification_regenerated = new Date().toISOString();
    return this.persist(dialog.id, context);
  }

  async updateSpecification(dialogId: string, rows: SpecificationRow[]): Promise<DialogEntity> {
    const dialog = await this.dialogsService.getById(dialogId);
    const context = this.cloneContext(dialog.context);
    context.specification = {
      rows: this.specificationService.normalizeRows(rows),
      raw: context.specification?.raw ?? null,
      generatedAt: context.specification?.generatedAt ?? null,
      updatedAt: new Date().toISOString()
    };
    context.workflow.timestamps.specification_updated = new Date().toISOString();
    return this.persist(dialog.id, context);
  }

  async recalculateEstimate(dialogId: string): Promise<DialogEntity> {
    const dialog = await this.dialogsService.getById(dialogId);
    const context = this.cloneContext(dialog.context);
    const rows = context.specification?.rows ?? [];
    context.estimate = this.pricingService.calculate(rows);
    context.workflow.timestamps.estimate_recalculated = new Date().toISOString();
    return this.persist(dialog.id, context);
  }

  private async runAutomaticStages(context: DialogContext): Promise<void> {
    if (!this.hasEnoughFirstContactData(context)) {
      return;
    }

    const latestMessageAt = this.getLatestMessageAt(context);
    if (!latestMessageAt) {
      return;
    }

    if (this.isMissingOrOlder(context.profile?.generatedAt, latestMessageAt)) {
      await this.tryStage(context, 'profile', async () => {
        context.profile = await this.profileService.buildProfile(context.messages);
      });
    }

    const technicalBriefInputAt = this.maxIsoDate([
      latestMessageAt,
      context.profile?.generatedAt ?? null
    ]);
    if (
      context.profile
      && technicalBriefInputAt
      && this.isMissingOrOlder(context.technicalBrief?.generatedAt, technicalBriefInputAt)
    ) {
      await this.tryStage(context, 'technical_brief', async () => {
        context.technicalBrief = await this.technicalBriefService.buildTechnicalBrief(context);
      });
    }

    const specificationInputAt = this.maxIsoDate([
      latestMessageAt,
      context.profile?.generatedAt ?? null,
      context.technicalBrief?.generatedAt ?? null
    ]);
    if (
      context.technicalBrief
      && specificationInputAt
      && this.isMissingOrOlder(context.specification?.generatedAt, specificationInputAt)
    ) {
      await this.tryStage(context, 'specification', async () => {
        context.specification = await this.specificationService.generateSpecification(context);
      });
    }

    const estimateInputAt = this.maxIsoDate([
      context.specification?.generatedAt ?? null,
      context.specification?.updatedAt ?? null
    ]);
    if (
      context.specification
      && estimateInputAt
      && this.isMissingOrOlder(context.estimate?.calculatedAt, estimateInputAt)
    ) {
      context.estimate = this.pricingService.calculate(context.specification.rows);
      context.workflow.timestamps.estimate = new Date().toISOString();
    }
  }

  private async tryStage(
    context: DialogContext,
    stage: string,
    action: () => Promise<void>
  ): Promise<void> {
    try {
      await action();
      context.workflow.timestamps[stage] = new Date().toISOString();
    } catch (error) {
      const message = error instanceof Error ? error.message : `Stage ${stage} failed`;
      context.workflow.errors = [...context.workflow.errors, `${stage}: ${message}`].slice(-20);
    }
  }

  private hasEnoughFirstContactData(context: DialogContext): boolean {
    const userMessages = context.messages.filter((message) => message.role === 'user');
    const joined = userMessages.map((message) => message.content.toLowerCase()).join(' ');
    const hasFurnitureKeyword = [
      'кух',
      'шкаф',
      'гардероб',
      'прихож',
      'мебел',
      'детск',
      'стол',
      'тумб'
    ].some((keyword) => joined.includes(keyword));

    return userMessages.length >= 3 && hasFurnitureKeyword;
  }

  private getLatestMessageAt(context: DialogContext): string | null {
    return this.maxIsoDate(context.messages.map((message) => message.createdAt));
  }

  private isMissingOrOlder(generatedAt: string | null | undefined, inputAt: string): boolean {
    if (!generatedAt) {
      return true;
    }

    return this.toTime(generatedAt) < this.toTime(inputAt);
  }

  private maxIsoDate(values: Array<string | null | undefined>): string | null {
    const times = values
      .map((value) => {
        if (!value) {
          return null;
        }
        const time = this.toTime(value);
        return Number.isNaN(time) ? null : { value, time };
      })
      .filter((value): value is { value: string; time: number } => value !== null);

    if (!times.length) {
      return null;
    }

    return times.reduce((latest, current) => current.time > latest.time ? current : latest).value;
  }

  private toTime(value: string): number {
    return new Date(value).getTime();
  }

  private async persist(dialogId: string, context: DialogContext): Promise<DialogEntity> {
    const currentStep = this.resolveStep(context);
    const status = this.resolveStatus(context, currentStep);
    return this.dialogsService.update(dialogId, {
      context,
      currentStep,
      status
    });
  }

  private resolveStep(context: DialogContext): DialogStep {
    if (context.estimate) {
      return 'estimate_ready';
    }
    if (context.specification) {
      return 'specification_ready';
    }
    if (context.technicalBrief) {
      return 'technical_brief_ready';
    }
    if (context.profile) {
      return 'profile_ready';
    }
    return 'first_contact';
  }

  private resolveStatus(context: DialogContext, currentStep: DialogStep): DialogStatus {
    if (currentStep === 'estimate_ready' || context.workflow.errors.length > 0) {
      return 'needs_manager';
    }
    return 'active';
  }

  private cloneContext(context: DialogContext): DialogContext {
    return JSON.parse(JSON.stringify(context)) as DialogContext;
  }
}
