import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../model/cities.entity';
import { Planet } from '../model/planets.entity';
import { UpdateCityDto } from '../dto/cities/update-city.dto';
import { CreateCityDto } from '../dto/cities/create-city.dto';
import { Session } from '../model/session.entity';
import { SessionStatus } from '../enam/session-status.enum';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(Planet)
    private readonly planetRepo: Repository<Planet>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /** Создание города с привязкой к планете */
  async create(dto: CreateCityDto): Promise<City> {
    const planet = await this.planetRepo.findOneBy({ id: dto.planetId });
    if (!planet) throw new NotFoundException('Planet not found');

    const city = this.cityRepo.create({ ...dto, planet });
    return this.cityRepo.save(city);
  }

  async getCitiesByPlanet(planetId: string) {
    return this.cityRepo
      .createQueryBuilder('c')
      .where('c.planet_id = :pid', { pid: planetId })
      .leftJoin(Session, 's', 's.city_id = c.id AND s.status = :status', {
        status: SessionStatus.ACTIVE,
      })
      .leftJoin('s.participants', 'sp')
      .addSelect([
        's.finishTime   AS "finishTime"',
        'COUNT(sp.id)   AS "userCount"',
      ])
      .groupBy('c.id, s.finishTime')
      .orderBy('c.time', 'ASC')
      .getRawAndEntities()
      .then(({ entities, raw }) =>
        entities.map((city, i) => ({
          id: city.id,
          name: city.name,
          time: city.time,
          finishTime: raw[i].finishTime ?? null,
          userCount: Number(raw[i].userCount) || 0,
        })),
      );
  }

  findAll(): Promise<City[]> {
    return this.cityRepo.find({ relations: ['planet'] });
  }

  async findOne(id: string): Promise<City> {
    const city = await this.cityRepo.findOne({
      where: { id },
      relations: ['planet'],
    });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async update(id: string, dto: UpdateCityDto): Promise<City> {
    if (dto.planetId) {
      const planet = await this.planetRepo.findOneBy({ id: dto.planetId });
      if (!planet) throw new NotFoundException('Planet not found');
      await this.cityRepo.update(id, { ...dto, planet });
    } else {
      await this.cityRepo.update(id, dto);
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.cityRepo.delete(id);
  }

  async getInfo(cityId: string) {
    const city = await this.cityRepo.findOne({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');

    const raw = await this.sessionRepo
      .createQueryBuilder('s')
      .leftJoin('s.participants', 'sp')
      .addSelect(['s.price', 's.finishTime', 'COUNT(sp.id)'])
      .addSelect('s.price', 'price')
      .addSelect('s.finishTime', 'finishTime')
      .addSelect('COUNT(sp.id)', 'userCount')
      .where('s.city_id = :cid', { cid: cityId })
      .andWhere('s.status = :status', { status: SessionStatus.ACTIVE })
      .groupBy('s.id')
      .getRawOne<{ finishTime: string; userCount: string; price: string }>();

    if (!raw) {
      return {
        id: city.id,
        name: city.name,
        userCount: 0,
        price: 0,
        finishTime: null,
      };
    }

    const finish = new Date(raw.finishTime);

    return {
      id: city.id,
      name: city.name,
      userCount: Number(raw.userCount),
      price: raw.price,
      finishTime: finish.toISOString(),
    };
  }
}
