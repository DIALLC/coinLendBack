import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { PlanetsService } from '../service/planet.service';
import { CreatePlanetDto } from '../dto/planets/create-planet.dto';
import { UpdatePlanetDto } from '../dto/planets/update-planet.dto';

@Controller('planets')
export class PlanetsController {
  constructor(private readonly planetsService: PlanetsService) {}

  @Post()
  create(@Body() dto: CreatePlanetDto) {
    return this.planetsService.create(dto);
  }

  @Get()
  findAll() {
    return this.planetsService.findAll();
  }

  @Get('dashboard')
  getDashboardPlanets() {
    return this.planetsService.getDashboardPlanets();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planetsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanetDto) {
    return this.planetsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planetsService.remove(id);
  }
}
