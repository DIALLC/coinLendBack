import { Controller, Post, Body, Get, Query } from '@nestjs/common';
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
    return this.slotService.getPriceForSlot(body.slotId, body.userId);
  }

  @Post('confirm-purchase')
  async confirmPurchase(@Body() body: { slotId: number; buyer: string; txHash: string }) {
    return this.slotService.confirmPurchase(
      body.slotId,
      body.buyer,
      body.txHash
    );
  }

  @Get('user-purchases')
  async getUserPurchases(@Query('walletAddress') wallet: string) {
    return this.slotService.getUserPurchasedSlotIds(wallet);
  }
}
