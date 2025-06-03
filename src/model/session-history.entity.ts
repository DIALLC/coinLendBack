import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ParticipantTeam } from '../enam/participant-team.enum';

@Entity('session_history')
export class SessionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  cityId: string;

  @Column()
  planetId: string;

  @Column()
  price: number;

  @Column()
  time: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  finishTime: Date;

  @Column({ type: 'enum', enum: ParticipantTeam, nullable: true })
  winnerTeam: ParticipantTeam | null;

  @Column()
  bullsCount: number;

  @Column()
  bearsCount: number;

  @Column()
  totalUsers: number;

  @CreateDateColumn()
  createdAt: Date;
}
