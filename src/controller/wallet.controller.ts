import { Controller, Get, UseGuards, Req, Post, Body } from "@nestjs/common";
import { WalletService } from '../service/wallet.service';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  deposit(@Body() dto: { hash: string }, @Req() req) {
    return this.wallet.handleDeposit(req.user.walletAddress, dto.hash);
  }

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  getMyBalance(@Req() req) {
    const userId = req.user.sub;
    return this.wallet.getBalance(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdraw/prepare')
  async prepareWithdraw(@Body() dto: { amount: string }, @Req() req) {
    return this.wallet.prepareWithdraw(req.user.walletAddress, dto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdraw/confirm')
  async confirmWithdraw(@Body() dto: { amount: string, feeTxHash: string }, @Req() req) {
    return this.wallet.confirmWithdraw(req.user.walletAddress, dto.amount, dto.feeTxHash);
  }
}
