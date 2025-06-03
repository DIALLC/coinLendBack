import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { SessionParticipant } from './session-participant.entity';
import { Transaction } from './transaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ default: 0 })
  balance: number;

  @Column({ unique: true, nullable: true })
  referralCode: string;

  @Column({ nullable: true })
  referredBy: string;

  @Column({ type: 'decimal', default: 0 })
  referralBalance: number;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ unique: true, nullable: true })
  telegramLogin: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => SessionParticipant, (p) => p.user)
  participations: SessionParticipant[];

  @OneToMany(() => Transaction, (t) => t.user)
  transactions: Transaction[];
}
