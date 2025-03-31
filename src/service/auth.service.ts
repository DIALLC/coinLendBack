import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { User } from '../model/user.entity';

@Injectable()
export class AuthService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private ownerWallet: ethers.Wallet;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {
    // Подключаемся к BSC testnet
    this.provider = new ethers.JsonRpcProvider(
      configService.get<string>('BSC_TESTNET_RPC'),
    );
    // Создаём кошелёк владельца
    this.ownerWallet = new ethers.Wallet(
      configService.get<string>('PRIVATE_KEY'),
      this.provider,
    );
    // Смарт-контракт
    this.contract = new ethers.Contract(
      configService.get<string>('CONTRACT_ADDRESS'),
      JSON.parse(configService.get<string>('CONTRACT_ABI')),
      this.ownerWallet,
    );
  }

  /**
   * Регистрируем юзера, если ещё нет.
   * Если есть `referredBy` (это рефКОД, не адрес), то
   * вызываем setReferrer(...) в контракте,
   * передавая (walletAddress, referrer.walletAddress).
   */
  async registerUser(walletAddress: string, referredBy?: string) {
    let user = await this.userRepo.findOne({ where: { walletAddress } });
    if (user) {
      return user; // уже есть, просто возвращаем
    }

    // Генерируем реферальный код
    const referralCode = Math.random().toString(36).substr(2, 8);

    user = this.userRepo.create({
      walletAddress,
      referralCode,
      referredBy, // сохраняем строку (чужой referralCode)
    });
    await this.userRepo.save(user);

    if (referredBy) {
      // Находим рефера по referralCode
      const referrer = await this.userRepo.findOne({
        where: { referralCode: referredBy },
      });
      if (referrer) {
        // Если реферер найден, вызовем setReferrer(...) в контракте
        const tx = await this.contract.setReferrer(
          walletAddress,
          referrer.walletAddress,
        );
        await tx.wait();
      }
    }

    return user;
  }

  /**
   * Начисляем бонус (например, в BNB).
   * Увеличиваем referralBalance у реферера.
   */
  async addReferralBonus(buyer: string, amount: number) {
    // buyer – тот, кто купил
    const user = await this.userRepo.findOne({
      where: { walletAddress: buyer },
    });
    if (!user) return { success: false, reason: 'User not found' };

    if (user?.referredBy) {
      // user.referredBy – это рефКОД, а не адрес
      const referrer = await this.userRepo.findOne({
        where: { referralCode: user.referredBy },
      });
      if (referrer) {
        referrer.referralBalance = Number(referrer.referralBalance) + amount;
        await this.userRepo.save(referrer);
      }
    }
    return { success: true };
  }

  /**
   * Возвращаем пользователю ссылку вида: https://test.coin.cryppush.net?ref=CODE
   */
  async getReferralLink(walletAddress: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new Error('User not found');
    }
    const domain = 'https://test.coin.cryppush.net';
    return { link: `${domain}?ref=${user.referralCode}` };
  }

  /**
   * Сколько у юзера рефералов, сколько он заработал
   */
  async getReferralsStats(walletAddress: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new Error('User not found');
    }
    const referralsCount = await this.userRepo.count({
      where: { referredBy: user.referralCode },
    });
    const earned = user.referralBalance || 0;

    return {
      referralsCount,
      referralBalance: earned,
    };
  }

  /**
   * Получаем адрес рефера по его реферальному коду
   */
  async getReferrerAddress(refCode: string) {
    const user = await this.userRepo.findOne({
      where: { referralCode: refCode },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return { address: user.walletAddress };
  }

  async getUserCount() {
    const count = await this.userRepo.count({});
    return { userCount: count };
  }
}
