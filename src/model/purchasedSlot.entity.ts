// src/model/purchasedSlot.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class PurchasedSlotEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  slotId: number;

  @ManyToOne(() => User, (user) => user.id, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  createdAt: Date;
}
