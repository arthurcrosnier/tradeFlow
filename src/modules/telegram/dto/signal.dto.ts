// src/modules/telegram/dto/signal.dto.ts
import { TradingSignal } from '../interfaces/signal.interface';

export class SignalResponseDto implements Partial<TradingSignal> {
  id: string;
  type: 'LONG' | 'SHORT';
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: Date;
  processed: boolean;
}
