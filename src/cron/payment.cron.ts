import { Injectable } from '@nestjs/common';
import { WalletService } from '../service/wallet.service';

@Injectable()
export class PaymentCron {
  constructor(private wall: WalletService) {}
}
