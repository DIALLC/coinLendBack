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
    // Подключаемся к BSC testnet (или другой сети)
    this.provider = new ethers.JsonRpcProvider(
      configService.get<string>('BSC_TESTNET_RPC'),
    );
    // Создаём кошелёк владельца
    this.ownerWallet = new ethers.Wallet(
      configService.get<string>('PRIVATE_KEY'),
      this.provider,
    );
    // Подключаемся к смарт-контракту
    this.contract = new ethers.Contract(
      configService.get<string>('CONTRACT_ADDRESS'),
      JSON.parse(configService.get<string>('CONTRACT_ABI')),
      this.ownerWallet,
    );
  }

  /**
   * Регистрация пользователя.
   * - Если есть referredBy, ищем реферера (по referralCode).
   * - Генерируем уникальный referralCode для нового пользователя.
   * - Если реферер существует, вызываем setReferrer(...) в контракте.
   */
  async registerUser(walletAddress: string, referredBy?: string) {
    let user = await this.userRepo.findOne({ where: { walletAddress } });
    if (user) {
      // Уже зарегистрирован, возвращаем
      return user;
    }

    // Генерируем referralCode
    const referralCode = Math.random().toString(36).substr(2, 8);

    user = this.userRepo.create({
      walletAddress,
      referralCode,
      referredBy,
    });
    await this.userRepo.save(user);

    if (referredBy) {
      // Проверяем, есть ли реферер
      const referrer = await this.userRepo.findOne({ where: { referralCode: referredBy } });
      if (referrer) {
        // Привязываем в смарт-контракте
        const tx = await this.contract.setReferrer(
          walletAddress, // newUser
          referrer.walletAddress // ref
        );
        await tx.wait();
      }
    }

    return user;
  }

  /**
   * Начислить реферальный бонус через смарт-контракт (demо).
   * В твоём контракте была функция distributeReferralBonus(...) —
   * но сейчас в новом контракте всё немного иначе.
   * Для примера оставим этот вызов, если хочешь вручную вызывать.
   */
  async addReferralBonus(buyer: string, amount: number) {
    const user = await this.userRepo.findOne({ where: { walletAddress: buyer } });
    if (user?.referredBy) {
      const referrer = await this.userRepo.findOne({
        where: { referralCode: user.referredBy },
      });
      if (referrer) {
        // Допустим, в контракте у нас есть distributeReferralBonus(buyer, amount)
        // Или можно вручную mint:
        // const tx = await this.contract.distributeReferralBonus(buyer, amount);
        // await tx.wait();

        // Для примера обновим referralBalance локально
        referrer.referralBalance = Number(referrer.referralBalance) + amount;
        await this.userRepo.save(referrer);
      }
    }
    return { success: true };
  }

  /**
   * Генерация реферальной ссылки:
   * Например: https://example.com?ref=<referralCode>
   */
  async getReferralLink(walletAddress: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new Error('User not found');
    }
    // Допустим, домен нашего сайта "https://example.com"
    const domain = 'https://example.com';
    return { link: `${domain}?ref=${user.referralCode}` };
  }

  /**
   * Узнать, сколько рефералов и сколько CPC он заработал
   * - Число рефералов = сколько User имеют referredBy = мой referralCode
   * - referralBalance = поле, в котором храним CPC
   */
  async getReferralsStats(walletAddress: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new Error('User not found');
    }
    // Считаем рефералов
    const referralsCount = await this.userRepo.count({
      where: { referredBy: user.referralCode },
    });
    // Сколько CPC заработал
    const earned = user.referralBalance;

    return {
      referralsCount,
      referralBalance: earned,
    };
  }
}
