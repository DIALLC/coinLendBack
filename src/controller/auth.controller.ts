import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async registerUser(
    @Body() body: { walletAddress: string; referredBy?: string },
  ) {
    return this.authService.registerUser(body.walletAddress, body.referredBy);
  }

  /**
   * Если хотите вручную вызывать добавление бонуса (необязательно),
   * можно оставить как есть.
   */
  @Post('bonus')
  async addBonus(@Body() body: { buyer: string; amount: number }) {
    return this.authService.addReferralBonus(body.buyer, body.amount);
  }

  @Get('ref-link')
  async getReferralLink(@Query('walletAddress') wallet: string) {
    return this.authService.getReferralLink(wallet);
  }

  @Get('referrals-stats')
  async getReferralsStats(@Query('walletAddress') wallet: string) {
    return this.authService.getReferralsStats(wallet);
  }

  @Get('referrer-address')
  async getReferrerAddress(@Query('refCode') refCode: string) {
    return this.authService.getReferrerAddress(refCode);
  }

  @Get('user-count')
  async getUserCount() {
    return this.authService.getUserCount();
  }

  @Get('tg/user-count')
  async getTgUserCount() {
    return this.authService.getTgUserCount();
  }
}
