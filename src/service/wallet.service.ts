import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../model/user.entity';
import { Transaction } from '../model/transaction.entity';
import { Deposit } from '../model/deposit.entity';
import { EtherService } from './ether.service';
import { Withdrawal } from '../model/withdrawal.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Deposit) private dep: Repository<Deposit>,
    private ether: EtherService,
    @InjectRepository(Withdrawal) private withdr: Repository<Withdrawal>,
  ) {}

  async getBalance(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId },
      select: ['balance'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      amount: Number(user.balance),
    };
  }

  async handleDeposit(walletAddress: string, txHash: string) {
    // ⏳ Ждём подтверждения до 60 сек, шаг 5 сек
    const maxRetries = 12;
    let status: 'pending' | 'confirmed' | 'failed' = 'pending';

    for (let i = 0; i < maxRetries; i++) {
      status = await this.ether.getTransactionStatus(txHash);
      if (status === 'confirmed' || status === 'failed') break;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (status !== 'confirmed') {
      throw new BadRequestException('Транзакция не подтверждена');
    }

    const tx = await this.ether.getTransaction(txHash);
    if (
      !tx ||
      tx.to.toLowerCase() !== '0xbd8ea4b15060f195a2ae2d45e68ca6ab2c560c6e'.toLowerCase()
    ) {
      throw new BadRequestException('Неверный адрес получателя');
    }

    if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new BadRequestException('Отправитель не совпадает');
    }

    const amount = await this.ether.parseCpcAmountFromTx(txHash);

    await this.users.increment({ walletAddress }, 'balance', Number(amount));
    return { success: true, amount };
  }

  async prepareWithdraw(walletAddress: string, amount: string) {
    const user = await this.users.findOneBy({ walletAddress });
    if (!user || Number(user.balance) < Number(amount)) {
      throw new BadRequestException('Недостаточно CPC');
    }

    const fee = await this.ether.estimateFee(walletAddress, amount);
    return {
      fee,
      amount,
      to: walletAddress,
    };
  }

  async confirmWithdraw(
    walletAddress: string,
    amount: string,
    feeTxHash: string,
  ) {
    // ⏳ Ждём подтверждения до 60 сек, с шагом 5 сек
    const maxRetries = 12;
    let status: 'pending' | 'confirmed' | 'failed' = 'pending';

    for (let i = 0; i < maxRetries; i++) {
      status = await this.ether.getTransactionStatus(feeTxHash);
      if (status === 'confirmed' || status === 'failed') break;
      await new Promise((resolve) => setTimeout(resolve, 2000)); // ждём 5 сек
    }

    if (status !== 'confirmed') {
      throw new BadRequestException('BNB оплата не подтверждена');
    }

    const tx = await this.ether.getTransaction(feeTxHash);

    if (
      !tx ||
      tx.to.toLowerCase() !== '0x7917206D6632b00c64a0e3391264d8800e7Df87e'.toLowerCase()
    ) {
      throw new BadRequestException('Неверный адрес получателя комиссии');
    }

    if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new BadRequestException('Хэш комиссии не совпадает с пользователем');
    }

    // 💸 Списываем CPC
    const user = await this.users.findOneBy({ walletAddress });
    if (!user || Number(user.balance) < Number(amount)) {
      throw new BadRequestException('Недостаточно CPC');
    }

    user.balance -= Number(amount);
    await this.users.save(user);

    // 🚀 Отправляем CPC на кошелёк пользователя
    const txHash = await this.ether.sendTokens(walletAddress, amount);
    return { txHash };
  }

}
