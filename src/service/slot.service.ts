import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../model/user.entity';
import { SlotPurchase } from '../model/slot-purchase.entity';

@Injectable()
export class SlotService {
  private provider: ethers.JsonRpcProvider;
  private slots = [
    { id: 1, coinCount: 20000, pricePerToken: 0.0000000028, count: 500, usedSlot: 0 },
    { id: 2, coinCount: 12500, pricePerToken: 0.0000328, count: 800, usedSlot: 0 },
    { id: 3, coinCount: 10000, pricePerToken: 0.00003727, count: 1000, usedSlot: 0 },
    { id: 4, coinCount: 8000, pricePerToken: 0.000042, count: 1250, usedSlot: 0 },
    { id: 5, coinCount: 6250, pricePerToken: 0.0000466, count: 1600, usedSlot: 0 },
  ];

  constructor(
    private configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SlotPurchase)
    private slotPurchaseRepo: Repository<SlotPurchase>,
  ) {
    this.provider = new ethers.JsonRpcProvider(
      this.configService.get<string>('BSC_TESTNET_RPC'),
    );
  }

  getSlots() {
    return this.slots;
  }

  async buySlot(slotIndex: number, buyer: string) {
    const user = await this.userRepo.findOne({
      where: { walletAddress: buyer },
    });
    if (!user) {
      throw new Error('User not found');
    }

    const slot = this.slots.find((el) => el.id === slotIndex);
    if (slot.usedSlot >= slot.count) {
      throw new Error('No slots available');
    }

    // Проверяем, купил ли пользователь уже этот слот
    const existingPurchase = await this.slotPurchaseRepo.findOne({
      where: { user: { id: user.id }, slotId: slot.id },
    });
    if (existingPurchase) {
      throw new Error('User has already purchased this slot');
    }

    const totalPrice = slot.coinCount * slot.pricePerToken;

    slot.usedSlot++;

    // Сохраняем информацию о покупке слота
    const slotPurchase = this.slotPurchaseRepo.create({
      user,
      slotId: slot.id,
    });
    await this.slotPurchaseRepo.save(slotPurchase);

    return { price: totalPrice, slot };
  }
}
