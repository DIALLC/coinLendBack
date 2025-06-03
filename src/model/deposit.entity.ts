import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum DepositStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

@Entity('cpc_deposit')
export class Deposit {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() walletAddress: string;
  @Column() amount: string;
  @Column({ nullable: true }) txHash: string | null;

  @Column({ type: 'enum', enum: DepositStatus, default: DepositStatus.PENDING })
  status: DepositStatus;

  @CreateDateColumn() createdAt: Date;
}
