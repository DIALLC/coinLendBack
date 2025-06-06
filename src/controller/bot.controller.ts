import { Controller, Delete, Post } from '@nestjs/common';
import { BotService } from '../service/bot.service';

@Controller('bots')
export class BotController {
  constructor(private readonly svc: BotService) {}

  /** POST /bots/add  — добавляет всех из data.js */
  @Post('add')
  async add() {
    const total = await this.svc.addAllBots();
    return { addedFromFile: total };
  }

  /** DELETE /bots/remove  — удаляет всех из data.js */
  @Delete('remove')
  async remove() {
    const removed = await this.svc.removeAllBots();
    return { removedFromFile: removed };
  }
}
