import { IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackDto {
  @IsString()
  @MaxLength(4000)
  feedback!: string;
}
