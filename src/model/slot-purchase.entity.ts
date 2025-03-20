import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * Запись о покупке конкретного слота
 */
@Entity()
export class SlotPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.purchases)
  user: User;

  @Column()
  slotId: number; // ID из SlotEntity

  @CreateDateColumn()
  createdAt: Date;
}
