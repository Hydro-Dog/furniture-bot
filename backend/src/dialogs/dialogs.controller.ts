import { Controller, Get, Param, Post } from '@nestjs/common';
import { DialogsService } from './dialogs.service';

@Controller('dialogs')
export class DialogsController {
  constructor(private readonly dialogsService: DialogsService) {}

  @Post()
  create() {
    return this.dialogsService.create();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.dialogsService.getById(id);
  }
}

