import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PublicMessageDto } from '../dialogs/dto/public-message.dto';
import { UpdateFeedbackDto } from '../dialogs/dto/update-feedback.dto';
import {
  DEFAULT_PUBLIC_DIALOG_MESSAGE_RATE_LIMIT,
  PUBLIC_DIALOG_RATE_LIMIT_SCOPE
} from '../rate-limit/constants/rate-limit.constants';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { PublicDialogsService } from './public-dialogs.service';

@Public()
@Controller('public/dialogs')
export class PublicDialogsController {
  constructor(private readonly publicDialogsService: PublicDialogsService) {}

  @RateLimit({
    limit: 30,
    windowMs: 60_000,
    cooldownMs: 60_000,
    keyMode: 'ip_public_token',
    scope: PUBLIC_DIALOG_RATE_LIMIT_SCOPE
  })
  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.publicDialogsService.getByToken(token);
  }

  @RateLimit(DEFAULT_PUBLIC_DIALOG_MESSAGE_RATE_LIMIT)
  @Post(':token/messages')
  appendMessage(@Param('token') token: string, @Body() body: PublicMessageDto) {
    return this.publicDialogsService.appendMessage(token, body.content);
  }

  @RateLimit({
    limit: 5,
    windowMs: 60_000,
    cooldownMs: 120_000,
    keyMode: 'ip_public_token',
    scope: PUBLIC_DIALOG_RATE_LIMIT_SCOPE
  })
  @Put(':token/feedback')
  updateFeedback(@Param('token') token: string, @Body() body: UpdateFeedbackDto) {
    return this.publicDialogsService.updateFeedback(token, body.feedback);
  }
}
