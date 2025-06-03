import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SessionHistory } from './session-history.entity';
import { ParticipantTeam } from '../enam/participant-team.enum';
import { ParticipantStatus } from '../enam/participant-status.enum';

@Entity('participant_history')
export class ParticipantHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SessionHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_history_id' })
  sessionHistory: SessionHistory;

  @Column()
  sessionId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ParticipantTeam })
  team: ParticipantTeam;

  @Column({ type: 'enum', enum: ParticipantStatus })
  result: ParticipantStatus;

  @Column({ type: 'numeric' })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}
