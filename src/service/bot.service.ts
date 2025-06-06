import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../model/user.entity';

const wallets: string[] = require('../data/users.js');

@Injectable()
export class BotService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async addAllBots(): Promise<number> {
    await this.userRepo
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(
        wallets.map((w) => ({
          walletAddress: w,
          balance: 2_000_000,
        })),
      )
      .orIgnore()
      .execute();

    return wallets.length;
  }

  async removeAllBots(): Promise<number> {
    const res = await this.userRepo
      .createQueryBuilder()
      .delete()
      .from(User)
      .where('walletAddress IN (:...wallets)', { wallets })
      .execute();

    return res.affected ?? 0;
  }
}
