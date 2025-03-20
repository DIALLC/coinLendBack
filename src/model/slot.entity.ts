import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Сущность, описывающая пресейл-слот:
 * - coinCount: сколько CPC получает пользователь
 * - pricePerCoin (необязательно, можно totalPrice)
 * - totalPrice: общая цена в BNB/другой валюте
 * - count: сколько слотов есть
 * - usedSlot: сколько уже куплено
 */
@Entity()
export class SlotEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  coinCount: number;

  @Column()
  pricePerCoin: number;

  @Column()
  totalPrice: number;

  @Column()
  count: number;

  @Column()
  usedSlot: number;
}
