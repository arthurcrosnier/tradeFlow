import { Injectable, Logger } from '@nestjs/common';
import { Spot } from '@binance/connector';
import * as fs from 'fs';
import * as path from 'path';
import { TimeInterval } from './binance.types';

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);
  private readonly client: Spot;
  private readonly dataDir = 'data/binance';
  private readonly symbol = 'BTCUSDT';

  // Mapping des périodes historiques par timeframe
  private readonly timeframeHistoryMap: Record<TimeInterval, number> = {
    '1m': 2,
    '5m': 4,
    '15m': 7,
    '30m': 10,
    '1h': 30,
    '4h': 90,
    '12h': 180,
    '1d': 365,
    '3d': 500,
    '1w': 730,
    all: 730,
  };

  constructor() {
    this.client = new Spot(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_API_SECRET,
      {
        baseURL: 'https://api.binance.com',
      },
    );

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getStartTimeForInterval(interval: TimeInterval): number {
    const days = this.timeframeHistoryMap[interval];
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  async fetchHistoricalData(interval: TimeInterval): Promise<string> {
    if (interval === 'all') {
      const files = await this.fetchAllTimeframes();
      return files.join('\n');
    }

    try {
      const endTime = Date.now();
      const startTime = this.getStartTimeForInterval(interval);
      const filename = path.join(this.dataDir, `BTC_${interval}.csv`);
      const writeStream = fs.createWriteStream(filename);

      // Write CSV header
      writeStream.write(
        'timestamp,open,high,low,close,volume,close_time,quote_volume,trades,taker_buy_volume,taker_buy_quote_volume\n',
      );

      let currentStartTime = startTime;
      let hasMoreData = true;

      while (hasMoreData && currentStartTime < endTime) {
        try {
          const { data } = await this.client.klines(this.symbol, interval, {
            startTime: currentStartTime,
            endTime,
            limit: 1000,
          });

          if (!data || data.length === 0) {
            break;
          }

          for (const candle of data) {
            const line = candle.join(',') + '\n';
            writeStream.write(line);
          }

          if (data.length < 1000) {
            hasMoreData = false;
          } else {
            currentStartTime = data[data.length - 1][0] + 1;

            const delayMs = this.getDelayForInterval(interval);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          if (error.response?.status === 429) {
            // Rate limit hit - wait longer
            await new Promise((resolve) => setTimeout(resolve, 60000));
            continue;
          }
          throw error;
        }
      }

      await new Promise((resolve) => writeStream.end(resolve));
      this.logger.log(`Historical data saved to ${filename}`);
      return filename;
    } catch (error) {
      this.logger.error(`Error fetching historical data: ${error.message}`);
      throw error;
    }
  }

  private getDelayForInterval(interval: TimeInterval): number {
    const baseDelay = 500;
    switch (interval) {
      case '1m':
      case '5m':
        return baseDelay * 2;
      case '15m':
      case '30m':
        return baseDelay * 1.5;
      default:
        return baseDelay;
    }
  }

  async fetchAllTimeframes(): Promise<string[]> {
    const timeframes: TimeInterval[] = [
      '1m',
      '5m',
      '15m',
      '30m',
      '1h',
      '4h',
      '12h',
      '1d',
      '3d',
      '1w',
    ];

    const promises = timeframes.map(async (interval, index) => {
      try {
        await new Promise((resolve) => setTimeout(resolve, index * 1000));
        const filename = await this.fetchHistoricalData(interval);
        return filename;
      } catch (error) {
        this.logger.error(
          `Error fetching ${interval} timeframe: ${error.message}`,
        );
        return null;
      }
    });

    const results = await Promise.all(promises);

    return results.filter((result) => result !== null);
  }
}
