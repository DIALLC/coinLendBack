import { Controller, Post, Body, Get } from '@nestjs/common';
import { SlotService } from '../service/slot.service';

@Controller('slots')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  @Get()
  async getSlots() {
    return this.slotService.getSlots();
  }

  @Post('buy-request')
  async buyRequest(@Body() body: { slotId: number; userId: string }) {
    return this.slotService.buySlot(body.slotId, body.userId);
  }
}
