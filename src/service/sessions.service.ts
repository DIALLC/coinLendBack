import {
  Injectable,
  OnApplicationBootstrap,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { EntityManager, Repository, LessThanOrEqual } from 'typeorm';

import { Session } from '../model/session.entity';
import { City } from '../model/cities.entity';
import { SessionParticipant } from '../model/session-participant.entity';
import { User } from '../model/user.entity';
import { SessionHistory } from '../model/session-history.entity';
import { ParticipantHistory } from '../model/participant-history.entity';

import { SessionStatus } from '../enam/session-status.enum';
import { ParticipantTeam } from '../enam/participant-team.enum';
import { ParticipantStatus } from '../enam/participant-status.enum';

import { SessionsGateway } from '../gateway/sessions.gateway';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SessionsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Session) private readonly sRepo: Repository<Session>,
    @InjectRepository(City) private readonly cRepo: Repository<City>,
    @InjectRepository(SessionParticipant)
    private readonly pRepo: Repository<SessionParticipant>,
    @InjectRepository(User) private readonly uRepo: Repository<User>,
    @InjectRepository(SessionHistory)
    private readonly shRepo: Repository<SessionHistory>,
    @InjectRepository(ParticipantHistory)
    private readonly phRepo: Repository<ParticipantHistory>,

    @Inject(forwardRef(() => SessionsGateway))
    private readonly ws: SessionsGateway,

    private readonly sched: SchedulerRegistry,
  ) {}

  /* ───────────── App start ───────────── */
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
      if (!active) await this.createForCity(city, null);
    }
  }

  /* ───────────── Session creation ───────────── */
  private async createForCity(
    city: City,
    manager: EntityManager | null,
  ): Promise<Session> {
    const repo = manager ? manager.getRepository(Session) : this.sRepo;
    const linkedPlanet = city.planet;

    const now = new Date();
    const finish = new Date(now.getTime() + city.time * 60_000);

    return repo.save(
      repo.create({
        time: city.time,
        price: Number(linkedPlanet.price),
        startTime: now,
        finishTime: finish,
        status: SessionStatus.ACTIVE,
        city,
        planet: linkedPlanet,
      }),
    );
  }

  /* ───────────── Rollover + payouts ───────────── */
  private async rolloverSession(old: Session) {
    await this.sRepo.manager.transaction(async (mngr) => {
      /* ── 1. locked participants ── */
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
        winners = parts; // ничья / рефанд
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

      /* ── 2. session_history ── */
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

      /* ── 3. payouts + participant_history ── */
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
        const totalGain = bonus + stake;
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

      /* ── 4. закрываем старую и создаём новую ── */
      old.status = SessionStatus.INACTIVE;
      await mngr.save(old);
      await this.createForCity(old.city, mngr);
    });
  }

  /* ───────────── Broadcasting ───────────── */
  private async broadcastState() {
    this.ws.sendDashboard();
  }

  /* ───────────── Cron: every 10 s check ───────────── */
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

    for (const s of expired) {
      await this.rolloverSession(s);
    }

    if (expired.length) await this.broadcastState();
  }
}
