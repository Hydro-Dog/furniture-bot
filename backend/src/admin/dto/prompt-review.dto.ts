import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class PromptReviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  dialogIds!: string[];
}

