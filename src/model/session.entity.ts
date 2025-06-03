import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn, OneToMany
} from "typeorm";
import { City } from './cities.entity';
import { Planet } from './planets.entity';
import { SessionStatus } from '../enam/session-status.enum';
import { SessionParticipant } from "./session-participant.entity";

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  time: number;

  @Column({ type: 'numeric' })
  price: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  finishTime: Date;

  @Column({ type: 'enum', enum: SessionStatus })
  status: SessionStatus;

  @ManyToOne(() => City, { eager: true })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @ManyToOne(() => Planet, { eager: true })
  @JoinColumn({ name: 'planet_id' })
  planet: Planet;

  @OneToMany(() => SessionParticipant, (p) => p.session)
  participants: SessionParticipant[];
}
