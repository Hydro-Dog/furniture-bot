import {
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from 'sequelize-typescript';

@Table({
  tableName: 'app_prompts',
  underscored: true,
  timestamps: true
})
export class AppPromptModel extends Model {
  @PrimaryKey
  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare key: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare content: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'updated_by'
  })
  declare updatedBy: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  declare updatedAt: Date;
}
