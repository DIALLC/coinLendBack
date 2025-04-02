import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../model/user.entity';
import { SlotPurchase } from '../model/slot-purchase.entity';
import { AuthService } from './auth.service';

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
    private authService: AuthService, // чтобы вызвать addReferralBonus и т.д.
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

  /**
   * Возвращает цену за слот (BNB) + данные слота,
   * но НЕ помечает слот купленным.
   */
  async getPriceForSlot(slotId: number, buyer: string) {
    const user = await this.userRepo.findOne({
      where: { walletAddress: buyer },
    });
    if (!user) {
      throw new Error('User not found');
    }

    const slot = this.slots.find((el) => el.id === slotId);
    if (!slot) {
      throw new Error('Slot not found');
    }
    if (slot.usedSlot >= slot.count) {
      throw new Error('No slots available');
    }

    // Проверим, не покупал ли он этот слот уже
    const existingPurchase = await this.slotPurchaseRepo.findOne({
      where: { user: { id: user.id }, slotId: slot.id },
    });
    if (existingPurchase) {
      throw new Error('User has already purchased this slot');
    }

    // Считаем цену BNB
    const totalPrice = slot.coinCount * slot.pricePerToken;
    // Возвращаем фронту
    return { price: totalPrice, slot };
  }

  /**
   * Подтверждаем покупку слота, если транзакция прошла успешно
   */
  async confirmPurchase(slotId: number, buyer: string, txHash: string) {
    const user = await this.userRepo.findOne({
      where: { walletAddress: buyer },
    });
    if (!user) {
      throw new Error('User not found');
    }

    const slot = this.slots.find((el) => el.id === slotId);
    if (!slot) {
      throw new Error('Slot not found');
    }
    if (slot.usedSlot >= slot.count) {
      throw new Error('No slots available');
    }

    const existingPurchase = await this.slotPurchaseRepo.findOne({
      where: { user: { id: user.id }, slotId: slot.id },
    });
    if (existingPurchase) {
      throw new Error('User has already purchased this slot');
    }

    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new Error('Transaction not found or failed');
    }

    const tx = await this.provider.getTransaction(txHash);
    if (tx.from.toLowerCase() !== buyer.toLowerCase()) {
      throw new Error('Tx sender does not match buyer address');
    }

    const totalPrice = slot.coinCount;
    const buyerBalance = await this.provider.getBalance(buyer);
    const neededWei = ethers.parseEther(String(totalPrice));
    if (buyerBalance < neededWei) {
      throw new Error('Insufficient BNB balance (on chain) to buy the slot');
    }

    slot.usedSlot += 1;
    const slotPurchase = this.slotPurchaseRepo.create({
      user,
      slotId: slot.id,
    });
    await this.slotPurchaseRepo.save(slotPurchase);

    const bonusBnb = totalPrice * 0.1;
    await this.authService.addReferralBonus(buyer, bonusBnb);

    return {
      success: true,
      message: `Slot #${slot.id} purchased successfully`,
    };
  }

  /**
   * Возвращает список id слотов, которые пользователь уже купил
   */
  async getUserPurchasedSlotIds(wallet: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress: wallet } });
    if (!user) {
      throw new Error('User not found');
    }

    const purchases = await this.slotPurchaseRepo.find({
      where: { user: { id: user.id } },
    });

    // Возвращаем просто массив slotId
    return purchases.map((p) => p.slotId);
  }
}
