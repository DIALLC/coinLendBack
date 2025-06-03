export class HistoryItemDto {
  id: string;
  planet: string;
  city: string;
  team: 'bulls' | 'bears';
  result: 'victory' | 'defeat' | 'draw';
  amount: number;
  date: string;
}

export class HistoryResponseDto {
  totalRewards: number;
  totalLosses: number;
  items: HistoryItemDto[];
}