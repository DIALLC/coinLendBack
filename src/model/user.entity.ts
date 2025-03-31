import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { SlotPurchase } from './slot-purchase.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ unique: true })
  referralCode: string;

  @Column({ nullable: true })
  referredBy: string; // referralCode того, кто пригласил

  @Column({ type: 'decimal', default: 0 })
  referralBalance: number; // Сколько CPC заработал от рефералов

  @OneToMany(() => SlotPurchase, (purchase) => purchase.user)
  purchases: SlotPurchase[];

  @CreateDateColumn()
  createdAt: Date;
}
