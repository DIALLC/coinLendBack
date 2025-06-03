import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { CitiesService } from '../service/city.service';
import { CreateCityDto } from '../dto/cities/create-city.dto';
import { UpdateCityDto } from '../dto/cities/update-city.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.citiesService.findAll();
  }

  @Get(':id')
  getPlanetCities(@Param('id') id: string) {
    return this.citiesService.getCitiesByPlanet(id);
  }

  @Get('session/:id')
  getCitySession(@Param('id') id: string) {
    return this.citiesService.getInfo(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.citiesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.citiesService.remove(id);
  }
}
