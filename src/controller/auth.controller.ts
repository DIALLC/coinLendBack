import { Controller, Post, Body, Get, Query, UseGuards, Req } from "@nestjs/common";
import { AuthService } from '../service/auth.service';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { UsersService } from '../service/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('register')
  async registerUser(
    @Body() body: { walletAddress: string; referredBy?: string },
  ) {
    return this.authService.registerUser(body.walletAddress, body.referredBy);
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

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getMyHistory(@Req() req) {
    return this.userService.getForUser(req.user.sub);
  }
}
