import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../model/user.entity';
import {
  HistoryItemDto,
  HistoryResponseDto,
} from '../dto/users/history-item.dto';
import { ParticipantHistory } from '../model/participant-history.entity';
import { City } from '../model/cities.entity';
import { Planet } from '../model/planets.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,

    @InjectRepository(ParticipantHistory)
    private readonly phRepo: Repository<ParticipantHistory>,
  ) {}

  findByWallet(walletAddress: string) {
    return this.repo.findOne({ where: { walletAddress } });
  }

  create(data: Partial<User>) {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async getForUser(userId: string): Promise<HistoryResponseDto> {
    /* основная выборка */
    const rows = await this.phRepo
      .createQueryBuilder('ph')
      .leftJoin('ph.sessionHistory', 'sh')
      .leftJoin(City, 'c', 'c.id = sh.cityId')
      .leftJoin(Planet, 'p', 'p.id = sh.planetId')
      .select([
        'ph.id           AS id',
        'p.name          AS planet',
        'c.name          AS city',
        'ph.team         AS team',
        `CASE 
           WHEN ph.result = 'WIN'    THEN 'victory'
           WHEN ph.result = 'LOSE'   THEN 'defeat'
           ELSE 'draw' 
         END                AS result`,
        'ph.amount       AS amount',
        'sh.finishTime   AS date',
      ])
      .where('ph.userId = :uid', { uid: userId })
      .orderBy('sh.finishTime', 'DESC')
      .getRawMany<HistoryItemDto>();

    /* агрегаты */
    const totals = rows.reduce(
      (acc, r) => {
        if (r.amount >= 0) acc.rewards += r.amount;
        else acc.losses += Math.abs(r.amount);
        return acc;
      },
      { rewards: 0, losses: 0 },
    );

    return {
      totalRewards: totals.rewards,
      totalLosses: totals.losses,
      items: rows,
    };
  }
}
