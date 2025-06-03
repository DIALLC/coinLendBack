import { IsNotEmpty, IsString, IsNumber, IsUUID } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  time: number;

  @IsUUID()
  planetId: string;
}
