import { TelegramConfig, TradingConfig } from './interfaces/config.interface';

export const telegram: TelegramConfig = {
  channels: {
    production: 'yourProductionChannel',
    test: 'yourTestChannel',
  },
  signals: {
    buy: 'BOUGHT',
    sell: 'SOLD',
  },
};

export const trading: TradingConfig = {
  pairs: {
    default: 'BTCUSDT',
    allowed: ['BTCUSDT'],
  },
  position: {
    portfolioPercentage: 20,
    leverage: 5,
  },
  stopLoss: {
    long: -2,
    short: 2,
  },
  takeProfit: {
    long: 4,
    short: -4,
  },
};
