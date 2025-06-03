import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Planet } from './planets.entity';
import { Session } from './session.entity';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  time: number;

  @ManyToOne(() => Planet, (planet) => planet.cities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planet_id' })
  planet: Planet;

  @OneToMany(() => Session, (s) => s.city)
  sessions: Session[];
}
