import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  DIALOG_RATE_LIMIT_SCOPE
} from '../rate-limit/constants/rate-limit.constants';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import { DialogsService } from './dialogs.service';

@Controller('dialogs')
export class DialogsController {
  constructor(private readonly dialogsService: DialogsService) {}

  @RateLimit({
    limit: 10,
    windowMs: 60_000,
    cooldownMs: 60_000,
    keyMode: 'ip',
    scope: DIALOG_RATE_LIMIT_SCOPE
  })
  @Post()
  create() {
    return this.dialogsService.create();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.dialogsService.getById(id);
  }
}
