import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Регистрация пользователя:
   * - walletAddress (обязательно)
   * - referredBy (опционально)
   */
  @Post('register')
  async registerUser(
    @Body() body: { walletAddress: string; referredBy?: string },
  ) {
    return this.authService.registerUser(body.walletAddress, body.referredBy);
  }

  /**
   * Начисление бонусов (для примера).
   * Если пользователь купил токены, можно вызвать этот метод,
   * чтобы начислить реф.бонус (через смарт-контракт).
   */
  @Post('bonus')
  async addBonus(@Body() body: { buyer: string; amount: number }) {
    return this.authService.addReferralBonus(body.buyer, body.amount);
  }

  /**
   * Получить реферальную ссылку для пользователя.
   * Пример: http://your-site.com?ref=<referralCode>
   */
  @Get('ref-link')
  async getReferralLink(@Query('walletAddress') wallet: string) {
    return this.authService.getReferralLink(wallet);
  }

  /**
   * Получить статистику:
   * - количество рефералов
   * - сколько CPC пользователь заработал
   */
  @Get('referrals-stats')
  async getReferralsStats(@Query('walletAddress') wallet: string) {
    return this.authService.getReferralsStats(wallet);
  }

  @Get('referrer-address')
  async getReferrerAddress(@Query('refCode') refCode: string) {
    return this.authService.getReferrerAddress(refCode);
  }
}
