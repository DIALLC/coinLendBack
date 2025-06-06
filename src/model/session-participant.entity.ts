import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';
import { ParticipantStatus } from '../enam/participant-status.enum';
import { ParticipantTeam } from '../enam/participant-team.enum';

@Entity('session_participants')
@Unique(['user', 'session'])
export class SessionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.participations, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Session, (s) => s.participants, { eager: true })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'timestamp' })
  joinedAt: Date;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING
  })
  status: ParticipantStatus;

  @Column({ type: 'enum', enum: ParticipantTeam })
  team: ParticipantTeam;

  @Column({ default: false }) // 👈 добавляем поле
  viewed: boolean;
}
