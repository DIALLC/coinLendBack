import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionParticipant } from '../model/session-participant.entity';
import { Session } from '../model/session.entity';
import { User } from '../model/user.entity';
import { ParticipantStatus } from '../enam/participant-status.enum';
import { ParticipantTeam } from '../enam/participant-team.enum';
import { SessionStatus } from '../enam/session-status.enum';
import { SessionHistory } from '../model/session-history.entity';
import { ParticipantHistory } from '../model/participant-history.entity';

const TEN_SEC = 10_000;

export type SessionResult = 'win' | 'lose' | 'draw' | null;

export interface VisibleSessionDto {
  id: string;
  city: { id: string; name: string };
  planet: { id: string; name: string };
  price: number;
  time: number;
  finishTime: Date;
  status: SessionStatus;
  team: ParticipantTeam;
  viewed: boolean;
  result: SessionResult;
}

@Injectable()
export class SessionParticipantsService {
  constructor(
    @InjectRepository(SessionParticipant)
    private readonly partRepo: Repository<SessionParticipant>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SessionHistory)
    private readonly sessionHistoryRepo: Repository<SessionHistory>,
    @InjectRepository(ParticipantHistory)
    private readonly participantHistoryRepo: Repository<ParticipantHistory>,
  ) {}

  async join(
    userId: string,
    cityId: string,
    team: ParticipantTeam,
  ): Promise<SessionParticipant> {
    return this.partRepo.manager.transaction(async (mngr) => {
      const session = await mngr.findOne(Session, {
        where: {
          city: { id: cityId },
          status: SessionStatus.ACTIVE,
        },
        relations: ['city', 'planet'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!session) {
        throw new BadRequestException('No active session for this city');
      }

      const now = Date.now();
      if (session.finishTime.getTime() - now <= TEN_SEC) {
        throw new BadRequestException('Too late to join (≤10 s to finish)');
      }

      const user = await mngr.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User not found');

      const already = await mngr.findOne(SessionParticipant, {
        where: { user: { id: userId }, session: { id: session.id } },
      });
      if (already) throw new BadRequestException('Already joined');

      const price = Number(session.price);
      if (user.balance < price) {
        throw new BadRequestException('Insufficient balance');
      }
      user.balance -= price;
      await mngr.save(user);

      const participant = mngr.create(SessionParticipant, {
        user,
        session,
        team,
        joinedAt: new Date(now),
        status: ParticipantStatus.PENDING,
      });
      return mngr.save(participant);
    });
  }

  async joinedInfo(userId: string, cityId: string) {
    const session = await this.sessionRepo.findOne({
      where: { city: { id: cityId }, status: SessionStatus.ACTIVE },
    });
    if (!session) return { status: false };

    const participant = await this.partRepo.findOne({
      where: { user: { id: userId }, session: { id: session.id } },
      select: ['id', 'team'],
    });
    if (!participant) return { status: false };

    return {
      status: true,
      id: session.id,
      team: participant.team,
    };
  }

  async getActiveForUser(userId: string): Promise<VisibleSessionDto[]> {
    const rows = await this.partRepo
      .createQueryBuilder('p')
      .innerJoin('p.session', 's')
      .leftJoin('s.city', 'c')
      .leftJoin('s.planet', 'pl')
      .leftJoin('session_history', 'sh', 'sh.sessionId = s.id') // camelCase!
      .select([
        's.id               AS "id"',
        'c.id               AS "cityId"',
        'c.name             AS "cityName"',
        'pl.id              AS "planetId"',
        'pl.name            AS "planetName"',
        's.price            AS "price"',
        's.time             AS "time"',
        's.finishTime       AS "finishTime"',
        's.status           AS "status"',
        'sh.winnerTeam      AS "winnerTeam"',
        'p.team             AS "team"',
        'p.viewed           AS "viewed"',
      ])
      .where('p.user_id = :uid', { uid: userId })
      .andWhere(
        `(s.status = :active OR (s.status = :inactive AND p.viewed = false))`,
        { active: SessionStatus.ACTIVE, inactive: SessionStatus.INACTIVE },
      )
      .orderBy(
        `CASE 
           WHEN s.status = :active   THEN 0
           WHEN s.status = :inactive THEN 1
           ELSE 2
         END`,
        'ASC',
      )
      .setParameters({
        active: SessionStatus.ACTIVE,
        inactive: SessionStatus.INACTIVE,
      })
      .getRawMany<{
        id: string;
        cityId: string;
        cityName: string;
        planetId: string;
        planetName: string;
        price: string;
        time: number;
        finishTime: Date;
        status: SessionStatus;
        team: ParticipantTeam;
        viewed: boolean;
        winnerTeam: ParticipantTeam | null;
      }>();

    return rows.map<VisibleSessionDto>((r) => {
      let result: SessionResult = null;

      if (r.status === SessionStatus.INACTIVE) {
        if (!r.winnerTeam) result = 'draw';
        else if (r.winnerTeam === r.team) result = 'win';
        else result = 'lose';
      }

      return {
        id: r.id,
        city: { id: r.cityId, name: r.cityName },
        planet: { id: r.planetId, name: r.planetName },
        price: Number(r.price),
        time: r.time,
        finishTime: r.finishTime,
        status: r.status,
        team: r.team,
        viewed: r.viewed,
        result,
      };
    });
  }

  async markSessionAsViewed(sessionId: string, userId: string): Promise<void> {
    await this.partRepo.update(
      {
        session: { id: sessionId },
        user: { id: userId },
      },
      { viewed: true },
    );
  }

  async getSessionResult(sessionId: string, userId: string) {
    const history = await this.sessionHistoryRepo.findOne({
      where: { sessionId },
    });

    if (!history) return { status: false };

    const participant = await this.participantHistoryRepo.findOne({
      where: { sessionId, userId },
    });

    if (!participant) {
      return { status: false }; // пользователь не участвовал
    }

    let result: 'win' | 'defeat' | 'drow' = 'drow';
    if (history.winnerTeam === 'bulls' || history.winnerTeam === 'bears') {
      result = participant.team === history.winnerTeam ? 'win' : 'defeat';
    }

    return {
      status: true,
      id: history.sessionId,
      bulls: history.bullsCount,
      bears: history.bearsCount,
      result,
      amount: Number(participant.amount),
    };
  }
}
