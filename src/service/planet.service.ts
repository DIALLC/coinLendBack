import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Planet } from '../model/planets.entity';
import { CreatePlanetDto } from '../dto/planets/create-planet.dto';
import { UpdatePlanetDto } from '../dto/planets/update-planet.dto';
import { SessionStatus } from '../enam/session-status.enum';

@Injectable()
export class PlanetsService {
  constructor(
    @InjectRepository(Planet)
    private readonly planetRepo: Repository<Planet>,
  ) {}

  async create(dto: CreatePlanetDto): Promise<Planet> {
    const planet = this.planetRepo.create(dto);
    return this.planetRepo.save(planet);
  }

  findAll(): Promise<Planet[]> {
    return this.planetRepo.find({ relations: ['cities'] });
  }

  async findOne(id: string): Promise<Planet> {
    const planet = await this.planetRepo.findOne({
      where: { id },
      relations: ['cities'],
    });
    if (!planet) throw new NotFoundException('Planet not found');
    return planet;
  }

  async getDashboardPlanets() {
    return this.planetRepo
      .createQueryBuilder('p')
      .leftJoin('p.cities', 'c')
      .leftJoin('c.sessions', 's', 's.status = :active', {
        active: SessionStatus.ACTIVE,
      })
      .leftJoin('s.participants', 'sp')
      .addSelect('COUNT(sp.id)', 'userCount')
      .groupBy('p.id')
      .orderBy('p.price', 'ASC')
      .getRawAndEntities()
      .then(({ entities, raw }) =>
        entities.map((pl, idx) => ({
          id: pl.id,
          name: pl.name,
          alt: pl.alt,
          price: Number(pl.price),
          user: Number(raw[idx].userCount) || 0,
        })),
      );
  }

  async update(id: string, dto: UpdatePlanetDto): Promise<Planet> {
    await this.planetRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.planetRepo.delete(id);
  }
}
