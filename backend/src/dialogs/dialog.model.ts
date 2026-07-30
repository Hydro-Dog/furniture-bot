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
