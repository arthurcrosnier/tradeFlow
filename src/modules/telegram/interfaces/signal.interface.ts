// src/modules/telegram/interfaces/signal.interface.ts
export interface TradingSignal {
  id: string;
  type: 'LONG' | 'SHORT';
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: Date;
  processed: boolean;
}
