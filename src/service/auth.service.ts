import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import { User } from '../model/user.entity';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private ownerWallet: ethers.Wallet;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private configService: ConfigService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
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

  async registerUser(walletAddress: string, referredBy?: string) {
    let user = await this.users.findByWallet(walletAddress);

    // 1) создаём, если нет
    if (!user) {
      const referralCode = crypto.randomBytes(4).toString('hex'); // 8-символьный
      user = await this.users.create({
        walletAddress,
        referralCode,
        referredBy,
      });
    }

    // 2) формируем payload
    const payload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      email: user.email,
      telegram: user.telegramLogin,
      createdAt: user.createdAt,
    };

    // 3) подписываем JWT
    const token = this.jwt.sign(payload);

    // 4) возвращаем токен
    return { accessToken: token };
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
    const earned = user.referralBalance || 0;

    return {
      referralsCount,
      referralBalance: earned,
    };
  }

  async getReferrerAddress(refCode: string) {
    const user = await this.userRepo.findOne({
      where: { referralCode: refCode },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return { address: user.walletAddress };
  }

  async getTgUserCount() {
    try {
      const token = process.env.BOT_TOKEN;
      const chatId = process.env.CHAT_ID;
      if (!token || !chatId) {
        console.log('TOKEN or CHAT_ID is empty');
        return { count: 0 };
      }

      const url = `https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`;
      const tgRes = await fetch(url).then((r) => r.json());

      if (!tgRes.ok) {
        console.log(`${tgRes.error_code} ${tgRes.description}`);
        return { count: 0 };
      }
      return { count: tgRes.result };
    } catch (err) {
      console.error('TG API error:', err.message);
      return { count: 0 };
    }
  }

  async getUserCount() {
    const count = await this.userRepo.count({});
    return { userCount: count };
  }
}
