// config/interfaces/config.interface.ts
export interface TelegramConfig {
  channels: {
    production: string;
    test: string;
  };
  signals: {
    buy: string;
    sell: string;
  };
}

export interface TradingConfig {
  pairs: {
    default: string;
    allowed: string[];
  };
  position: {
    portfolioPercentage: number;
    leverage: number;
  };
  stopLoss: {
    long: number;
    short: number;
  };
  takeProfit: {
    long: number;
    short: number;
  };
}
