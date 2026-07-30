import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DialogModel } from './dialog.model';
import { createEmptyDialogContext, normalizeDialogContext } from './dialog-context.utils';
import type { DialogContext, DialogEntity, DialogStatus, DialogStep } from './dialog.types';

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
    return {
      id: dialog.id,
      status: dialog.status,
      currentStep: dialog.currentStep,
      context: normalizeDialogContext(dialog.context),
      createdAt: dialog.createdAt.toISOString(),
      updatedAt: dialog.updatedAt.toISOString()
    };
  }
}
