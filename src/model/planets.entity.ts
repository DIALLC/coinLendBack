import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { City } from './cities.entity';

@Entity('planets')
export class Planet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  alt: string;

  @Column()
  price: string;

  @OneToMany(() => City, (city) => city.planet)
  cities: City[];
}
