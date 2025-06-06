import {
  Injectable,
  Inject,
  forwardRef,
  OnApplicationBootstrap,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThanOrEqual } from 'typeorm';

import { Session } from '../model/session.entity';
import { City } from '../model/cities.entity';
import { SessionParticipant } from '../model/session-participant.entity';
import { User } from '../model/user.entity';
import { SessionHistory } from '../model/session-history.entity';
import { ParticipantHistory } from '../model/participant-history.entity';

import { SessionsGateway } from '../gateway/sessions.gateway';
import { SessionStatus } from '../enam/session-status.enum';
import { ParticipantTeam } from '../enam/participant-team.enum';
import { ParticipantStatus } from '../enam/participant-status.enum';

import { evenRandom, shiftBy, EVEN } from '../utils/bot.utils';
import {
  MIN_START_BOTS,
  MAX_START_BOTS,
  MIN_SHIFT,
  MAX_SHIFT,
  INJECTION_STEPS,
} from '../constant/sessions.constant';

const TEN_SEC = 10_000;

@Injectable()
export class SessionsService implements OnApplicationBootstrap {
  constructor(
    /* repositories */
    @InjectRepository(Session) private readonly sRepo: Repository<Session>,
    @InjectRepository(City) private readonly cRepo: Repository<City>,
    @InjectRepository(SessionParticipant)
    private readonly pRepo: Repository<SessionParticipant>,
    @InjectRepository(User) private readonly uRepo: Repository<User>,
    @InjectRepository(SessionHistory)
    private readonly shRepo: Repository<SessionHistory>,
    @InjectRepository(ParticipantHistory)
    private readonly phRepo: Repository<ParticipantHistory>,
    /* gateway & scheduler */
    @Inject(forwardRef(() => SessionsGateway))
    private readonly ws: SessionsGateway,
    private readonly sched: SchedulerRegistry,
  ) {}

  /* ─────────────  APP START  ───────────── */
  async onApplicationBootstrap() {
    await this.ensureSessionsPerCity();
    await this.broadcastState();
  }

  private async ensureSessionsPerCity() {
    const cities = await this.cRepo.find({ relations: ['planet'] });
    for (const city of cities) {
      const active = await this.sRepo.findOne({
        where: { city: { id: city.id }, status: SessionStatus.ACTIVE },
      });
      if (!active) {
        const bots = evenRandom(MIN_START_BOTS, MAX_START_BOTS);
        await this.createForCity(city, null, bots);
      }
    }
  }

  /* ─────────────  SESSION CREATION  ───────────── */
  private async createForCity(
    city: City,
    manager: EntityManager | null,
    botCount: number,
  ): Promise<Session> {
    const repo = manager ? manager.getRepository(Session) : this.sRepo;

    const now = new Date();
    const finish = new Date(now.getTime() + city.time * 60_000);

    const session = await repo.save(
      repo.create({
        time: city.time,
        price: Number(city.planet.price),
        startTime: now,
        finishTime: finish,
        status: SessionStatus.ACTIVE,
        botsPlanned: botCount,
        city,
        planet: city.planet,
      }),
    );

    this.scheduleBotInjection(session, botCount);
    return session;
  }

  /* ─────────────  BOT INJECTION  ───────────── */
  private scheduleBotInjection(session: Session, total: number) {
    const slice = EVEN(Math.floor(total / INJECTION_STEPS));
    const stepMs = (session.time * 60_000) / INJECTION_STEPS;

    for (let i = 0; i < INJECTION_STEPS; i++) {
      const delay = stepMs * i + 1_000;
      const id = `bot:${session.id}:${i}`;
      const timeout = setTimeout(async () => {
        try {
          await this.injectBotsSlice(session.city.id, slice);
        } finally {
          this.sched.deleteTimeout(id);
        }
      }, delay);
      this.sched.addTimeout(id, timeout);
    }
  }

  /** добавляет slice ботов, деля их 50/50 */
  private async injectBotsSlice(cityId: string, slice: number) {
    if (slice === 0) return;

    const freeBots = await this.uRepo
      .createQueryBuilder('u')
      .where('u.is_bot = true')
      .andWhere(
        `NOT EXISTS (
           SELECT 1 FROM session_participant p
           JOIN session s ON s.id = p.session_id
           WHERE p.user_id = u.id AND s.status = :act
         )`,
        { act: SessionStatus.ACTIVE },
      )
      .limit(slice)
      .getMany();

    const half = Math.floor(slice / 2);
    for (let i = 0; i < freeBots.length; i++) {
      const team = i < half ? ParticipantTeam.BULLS : ParticipantTeam.BEARS;
      await this.join(freeBots[i].id, cityId, team).catch(() => undefined);
    }
  }

  /* ─────────────  ROLLOVER + PAYOUT  ───────────── */
  private async rolloverSession(old: Session) {
    await this.sRepo.manager.transaction(async (mngr) => {
      /* 1. locked participants */
      const parts = await mngr.find(SessionParticipant, {
        where: { session: { id: old.id } },
        relations: ['user'],
        lock: { mode: 'pessimistic_write' },
      });

      const bulls = parts.filter((p) => p.team === ParticipantTeam.BULLS);
      const bears = parts.filter((p) => p.team === ParticipantTeam.BEARS);

      let winnerTeam: ParticipantTeam | null = null;
      let winners: SessionParticipant[] = [];
      let losers: SessionParticipant[] = [];

      if (
        bulls.length === 0 ||
        bears.length === 0 ||
        bulls.length === bears.length
      ) {
        winners = parts;
      } else if (bulls.length < bears.length) {
        winnerTeam = ParticipantTeam.BULLS;
        winners = bulls;
        losers = bears;
      } else {
        winnerTeam = ParticipantTeam.BEARS;
        winners = bears;
        losers = bulls;
      }

      const stake = Number(old.price);
      const prizePool = losers.length * stake;
      const bonus = winners.length ? prizePool / winners.length : 0;

      /* 2. session_history */
      const sh = await mngr.getRepository(SessionHistory).save(
        mngr.getRepository(SessionHistory).create({
          sessionId: old.id,
          cityId: old.city.id,
          planetId: old.planet.id,
          price: stake,
          time: old.time,
          startTime: old.startTime,
          finishTime: old.finishTime,
          winnerTeam,
          bullsCount: bulls.length,
          bearsCount: bears.length,
          totalUsers: parts.length,
        }),
      );

      /* 3. payouts + participant_history */
      const phRepo = mngr.getRepository(ParticipantHistory);
      const payWinner = async (
        p: SessionParticipant,
        amount: number,
        res: ParticipantStatus,
      ) => {
        p.user.balance += amount;
        await mngr.save(p.user);
        await phRepo.save(
          phRepo.create({
            sessionHistory: sh,
            sessionId: old.id,
            userId: p.user.id,
            team: p.team,
            result: res,
            amount: amount - stake,
          }),
        );
      };

      for (const w of winners) {
        const totalGain = bonus * 0.9 + stake;
        const status = winnerTeam
          ? ParticipantStatus.WIN
          : ParticipantStatus.CANCEL;
        await payWinner(w, totalGain, status);
      }
      for (const l of losers) {
        await phRepo.save(
          phRepo.create({
            sessionHistory: sh,
            sessionId: old.id,
            userId: l.user.id,
            team: l.team,
            result: ParticipantStatus.LOSE,
            amount: -stake,
          }),
        );
      }

      /* 4. закрываем старую, считаем N для новой */
      old.status = SessionStatus.INACTIVE;
      await mngr.save(old);

      const shifted = shiftBy(old.botsPlanned, MIN_SHIFT, MAX_SHIFT);
      const planned = EVEN(
        Math.max(MIN_START_BOTS, Math.min(shifted, MAX_START_BOTS)),
      );

      await this.createForCity(old.city, mngr, planned);
    });
  }

  /* ─────────────  BROADCAST  ───────────── */
  private async broadcastState() {
    this.ws.sendDashboard();
  }

  /* ─────────────  CRON 10 сек  ───────────── */
  @Cron('*/10 * * * * *')
  async checkExpired() {
    const now = new Date();
    const expired = await this.sRepo.find({
      where: {
        status: SessionStatus.ACTIVE,
        finishTime: LessThanOrEqual(now),
      },
      relations: ['city', 'city.planet', 'planet'],
    });

    for (const s of expired) await this.rolloverSession(s);
    if (expired.length) await this.broadcastState();
  }

  /* ─────────────  PUBLIC join (без изменений)  ───────────── */
  async join(
    userId: string,
    cityId: string,
    team: ParticipantTeam,
  ): Promise<SessionParticipant> {
    return this.pRepo.manager.transaction(async (mngr) => {
      const session = await mngr.findOne(Session, {
        where: { city: { id: cityId }, status: SessionStatus.ACTIVE },
        relations: ['city', 'planet'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!session)
        throw new BadRequestException('No active session for this city');

      const now = Date.now();
      if (session.finishTime.getTime() - now <= TEN_SEC)
        throw new BadRequestException('Too late to join (≤10 s to finish)');

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
      if (user.balance < price)
        throw new BadRequestException('Insufficient balance');
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
}
