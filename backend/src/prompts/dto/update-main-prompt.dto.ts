import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMainPromptDto {
  @IsString()
  @MinLength(20)
  @MaxLength(50000)
  content!: string;
}
