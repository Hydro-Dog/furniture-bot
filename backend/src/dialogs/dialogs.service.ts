import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHmac, randomUUID } from 'node:crypto';
import { hashToken } from '../auth/utils/crypto';
import { DialogModel } from './dialog.model';
import { createEmptyDialogContext, normalizeDialogContext } from './dialog-context.utils';
import type {
  DialogContext,
  DialogEntity,
  DialogStatus,
  DialogStep,
  PublicDialogEntity,
  PublicDialogLinkResult
} from './dialog.types';

@Injectable()
export class DialogsService {
  constructor(
    @InjectModel(DialogModel)
    private readonly dialogModel: typeof DialogModel
  ) {}

  async create(): Promise<DialogEntity> {
    const dialog = await this.dialogModel.create({
      status: 'active',
      currentStep: 'first_contact',
      context: createEmptyDialogContext()
    });

    return this.toEntity(dialog);
  }

  async createWithPublicLink(): Promise<PublicDialogLinkResult> {
    const dialog = await this.dialogModel.create({
      status: 'active',
      currentStep: 'first_contact',
      context: createEmptyDialogContext()
    });

    return this.assignPublicLink(dialog);
  }

  async list(): Promise<DialogEntity[]> {
    const dialogs = await this.dialogModel.findAll({
      order: [['updatedAt', 'DESC']]
    });

    return dialogs.map((dialog) => this.toEntity(dialog));
  }

  async getById(id: string): Promise<DialogEntity> {
    const dialog = await this.dialogModel.findByPk(id);
    if (!dialog) {
      throw new NotFoundException('Dialog not found');
    }

    return this.toEntity(dialog);
  }

  async createPublicLink(id: string): Promise<PublicDialogLinkResult> {
    const dialog = await this.dialogModel.findByPk(id);
    if (!dialog) {
      throw new NotFoundException('Dialog not found');
    }

    return this.assignPublicLink(dialog);
  }

  async getPublicByToken(token: string): Promise<PublicDialogEntity> {
    const dialog = await this.getDialogByPublicToken(token);
    return this.toPublicEntity(dialog);
  }

  async getDialogIdByPublicToken(token: string): Promise<string> {
    return (await this.getDialogByPublicToken(token)).id;
  }

  async updateFeedback(
    id: string,
    feedback: string,
    updatedBy: 'admin' | 'public'
  ): Promise<DialogEntity> {
    const dialog = await this.dialogModel.findByPk(id);
    if (!dialog) {
      throw new NotFoundException('Dialog not found');
    }

    dialog.publicFeedback = feedback.trim() || null;
    dialog.publicFeedbackUpdatedAt = new Date();
    dialog.publicFeedbackUpdatedBy = updatedBy;
    await dialog.save();

    return this.toEntity(dialog);
  }

  async updatePublicFeedback(token: string, feedback: string): Promise<PublicDialogEntity> {
    const dialog = await this.getDialogByPublicToken(token);
    dialog.publicFeedback = feedback.trim() || null;
    dialog.publicFeedbackUpdatedAt = new Date();
    dialog.publicFeedbackUpdatedBy = 'public';
    await dialog.save();

    return this.toPublicEntity(dialog);
  }

  async getByIds(ids: string[]): Promise<DialogEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const dialogs = await this.dialogModel.findAll({
      where: {
        id: ids
      },
      order: [['updatedAt', 'DESC']]
    });

    return dialogs.map((dialog) => this.toEntity(dialog));
  }

  async update(id: string, params: {
    status?: DialogStatus;
    currentStep?: DialogStep;
    context?: DialogContext;
  }): Promise<DialogEntity> {
    const dialog = await this.dialogModel.findByPk(id);
    if (!dialog) {
      throw new NotFoundException('Dialog not found');
    }

    if (params.status) {
      dialog.status = params.status;
    }
    if (params.currentStep) {
      dialog.currentStep = params.currentStep;
    }
    if (params.context) {
      dialog.context = normalizeDialogContext(params.context);
    }

    await dialog.save();
    return this.toEntity(dialog);
  }

  async softDelete(id: string): Promise<void> {
    const dialog = await this.dialogModel.findByPk(id);
    if (!dialog) {
      throw new NotFoundException('Dialog not found');
    }

    await dialog.destroy();
  }

  toEntity(dialog: DialogModel): DialogEntity {
    const publicAccessUrl = this.buildPublicUrlFromDialog(dialog);

    return {
      id: dialog.id,
      status: dialog.status,
      currentStep: dialog.currentStep,
      context: normalizeDialogContext(dialog.context),
      publicAccess: dialog.publicAccessCreatedAt || dialog.publicAccessExpiresAt ? {
        url: publicAccessUrl,
        createdAt: this.dateToIso(dialog.publicAccessCreatedAt),
        expiresAt: this.dateToIso(dialog.publicAccessExpiresAt),
        isActive: this.isPublicLinkActive(dialog)
      } : null,
      publicFeedback: {
        text: dialog.publicFeedback ?? null,
        updatedAt: this.dateToIso(dialog.publicFeedbackUpdatedAt),
        updatedBy: dialog.publicFeedbackUpdatedBy ?? null
      },
      createdAt: dialog.createdAt.toISOString(),
      updatedAt: dialog.updatedAt.toISOString()
    };
  }

  private async assignPublicLink(dialog: DialogModel): Promise<PublicDialogLinkResult> {
    const token = this.generatePublicToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.publicLinkTtlMs());

    dialog.publicAccessTokenId = this.extractPublicTokenId(token);
    dialog.publicAccessTokenHash = hashToken(token);
    dialog.publicAccessCreatedAt = now;
    dialog.publicAccessExpiresAt = expiresAt;
    await dialog.save();

    return {
      dialog: this.toEntity(dialog),
      publicUrl: this.buildPublicUrl(token),
      expiresAt: expiresAt.toISOString()
    };
  }

  private async getDialogByPublicToken(token: string): Promise<DialogModel> {
    const tokenHash = hashToken(token.trim());
    const dialog = await this.dialogModel.findOne({
      where: {
        publicAccessTokenHash: tokenHash
      }
    });

    if (!dialog) {
      throw new NotFoundException('Public dialog link not found');
    }

    if (!this.isPublicLinkActive(dialog)) {
      throw new GoneException('Public dialog link expired');
    }

    return dialog;
  }

  private toPublicEntity(dialog: DialogModel): PublicDialogEntity {
    const context = normalizeDialogContext(dialog.context);

    return {
      status: dialog.status,
      currentStep: dialog.currentStep,
      messages: context.messages,
      feedback: dialog.publicFeedback ?? null,
      expiresAt: dialog.publicAccessExpiresAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: dialog.updatedAt.toISOString()
    };
  }

  private generatePublicToken(): string {
    const tokenId = randomUUID();
    const signature = createHmac('sha256', this.publicTokenSecret())
      .update(tokenId)
      .digest('base64url');
    return `${tokenId}.${signature}`;
  }

  private buildPublicUrlFromDialog(dialog: DialogModel): string | null {
    if (!this.isPublicLinkActive(dialog) || !dialog.publicAccessTokenId) {
      return null;
    }

    const signature = createHmac('sha256', this.publicTokenSecret())
      .update(dialog.publicAccessTokenId)
      .digest('base64url');

    return this.buildPublicUrl(`${dialog.publicAccessTokenId}.${signature}`);
  }

  private buildPublicUrl(token: string): string {
    const baseUrl = (process.env.PUBLIC_APP_BASE_URL || '').trim().replace(/\/$/, '');
    const path = `/public/${encodeURIComponent(token)}`;
    return baseUrl ? `${baseUrl}${path}` : path;
  }

  private extractPublicTokenId(token: string): string {
    return token.split('.')[0];
  }

  private publicTokenSecret(): string {
    return (process.env.PUBLIC_LINK_SECRET || process.env.AUTH_ACCESS_SECRET || '').trim();
  }

  private publicLinkTtlMs(): number {
    const hours = Number(process.env.PUBLIC_LINK_TTL_HOURS || 4);
    return Math.max(1, hours) * 60 * 60 * 1000;
  }

  private isPublicLinkActive(dialog: DialogModel): boolean {
    return Boolean(
      dialog.publicAccessTokenHash
      && dialog.publicAccessExpiresAt
      && dialog.publicAccessExpiresAt.getTime() > Date.now()
    );
  }

  private dateToIso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }
}
