import { Controller, Post, Body, UseGuards, Req, Get, Param } from "@nestjs/common";
import { SessionParticipantsService } from '../service/session-participants.service';
import { ParticipantTeam } from '../enam/participant-team.enum';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@Controller('sessions/participants')
export class SessionParticipantsController {
  constructor(private readonly svc: SessionParticipantsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('join')
  join(@Req() req, @Body() body: { team: ParticipantTeam; cityId: string }) {
    const userId = req.user.sub;
    return this.svc.join(userId, body.cityId, body.team);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  getMyActive(@Req() req) {
    return this.svc.getActiveForUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/me/:id')
  meInCity(@Param('id') cityId: string, @Req() req) {
    return this.svc.joinedInfo(req.user.sub, cityId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':sessionId/result')
  async getSessionResult(@Param('sessionId') sessionId: string, @Req() req) {
    return this.svc.getSessionResult(sessionId, req.user.sub);
  }
}
