import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePlanetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  alt: string;

  @IsString()
  @IsNotEmpty()
  price: string;
}
