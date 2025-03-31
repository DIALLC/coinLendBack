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

  async registerUser(walletAddress: string, referredBy?: string) {
    let user = await this.userRepo.findOne({ where: { walletAddress } });
    if (user) {
      return user;
    }

    const referralCode = Math.random().toString(36).substr(2, 8);

    user = this.userRepo.create({
      walletAddress,
      referralCode,
      referredBy,
    });
    await this.userRepo.save(user);

    if (referredBy) {
      const referrer = await this.userRepo.findOne({
        where: { referralCode: referredBy },
      });
      if (referrer) {
        const tx = await this.contract.setReferrer(
          walletAddress,
          referrer.walletAddress,
        );
        await tx.wait();
      }
    }

    return user;
  }

  async addReferralBonus(buyer: string, amount: number) {
    const user = await this.userRepo.findOne({
      where: { walletAddress: buyer },
    });
    if (user?.referredBy) {
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

  async getReferralLink(walletAddress: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new Error('User not found');
    }
    const domain = 'https://test.coin.cryppush.net';
    return { link: `${domain}?ref=${user.referralCode}` };
  }

  async getReferralsStats(walletAddress: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new Error('User not found');
    }
    const referralsCount = await this.userRepo.count({
      where: { referredBy: user.referralCode },
    });
    const earned = user.referralBalance;

    return {
      referralsCount,
      referralBalance: earned,
    };
  }

  async getReferrerAddress(refCode: string) {
    const user = await this.userRepo.findOne({ where: { referralCode: refCode } });
    if (!user) {
      throw new Error('User not found');
    }
    return { address: user.walletAddress };
  }
}
