import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum WithdrawalStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

@Entity('cpc_withdrawal')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() walletAddress: string;
  @Column() amount: string;
  @Column({ nullable: true }) feeBnb: string | null;
  @Column({ nullable: true }) txHash: string | null;

  @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
  status: WithdrawalStatus;

  @CreateDateColumn() createdAt: Date;
}