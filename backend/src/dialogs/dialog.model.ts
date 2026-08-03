import {
  Column,
  CreatedAt,
  DataType,
  DeletedAt,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from 'sequelize-typescript';
import type { DialogContext, DialogStatus, DialogStep } from './dialog.types';

@Table({
  tableName: 'dialogs',
  underscored: true,
  timestamps: true,
  paranoid: true
})
export class DialogModel extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'active'
  })
  declare status: DialogStatus;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'current_step',
    defaultValue: 'first_contact'
  })
  declare currentStep: DialogStep;

  @Column({
    type: DataType.JSONB,
    allowNull: false
  })
  declare context: DialogContext;

  @Column({ type: DataType.UUID, allowNull: true, field: 'public_access_token_id' })
  declare publicAccessTokenId: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'public_access_token_hash' })
  declare publicAccessTokenHash: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'public_access_expires_at' })
  declare publicAccessExpiresAt: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'public_access_created_at' })
  declare publicAccessCreatedAt: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'public_feedback' })
  declare publicFeedback: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'public_feedback_updated_at' })
  declare publicFeedbackUpdatedAt: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'public_feedback_updated_by' })
  declare publicFeedbackUpdatedBy: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  declare updatedAt: Date;

  @DeletedAt
  @Column({ type: DataType.DATE, field: 'deleted_at' })
  declare deletedAt: Date | null;
}
