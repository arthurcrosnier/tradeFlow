// src/modules/bybit/bybit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RestClientV5 } from 'bybit-api';
import { RedisService } from '../../database/redis.service';

export interface BybitOrder {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
  status: 'NEW' | 'FILLED' | 'CANCELED' | 'REJECTED';
}

@Injectable()
export class BybitService {
  private client: RestClientV5;
  private readonly logger = new Logger(BybitService.name);

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    const testnet: boolean = this.configService.get('BYBIT_TESTNET') === 'true';
    this.client = new RestClientV5({
      testnet: testnet,
      key: this.configService.get(
        testnet ? 'BYBIT_API_KEY_TEST' : 'BYBIT_API_KEY',
      ),
      secret: this.configService.get(
        testnet ? 'BYBIT_API_SECRET_TEST' : 'BYBIT_API_SECRET',
      ),
    });
  }

  async closeAllPositions(symbol: string = 'BTCUSDT'): Promise<void> {
    try {
      const positions = await this.client.getPositionInfo({
        category: 'linear',
        symbol,
        settleCoin: 'USDT',
      });

      for (const position of positions.result.list) {
        if (position.size !== '0') {
          await this.client.submitOrder({
            category: 'linear',
            symbol,
            side: position.side === 'Buy' ? 'Sell' : 'Buy',
            orderType: 'Market',
            qty: Math.abs(parseFloat(position.size)).toString(),
            reduceOnly: true,
          });
        }
      }

      this.logger.log(`Toutes les positions ${symbol} fermées`);
    } catch (error) {
      this.logger.error('Erreur fermeture positions:', error);
      throw error;
    }
  }

  async getBTCPrice(): Promise<number> {
    try {
      const ticker = await this.client.getTickers({
        category: 'linear',
        symbol: 'BTCUSDT',
      });
      return parseFloat(ticker.result.list[0].lastPrice);
    } catch (error) {
      this.logger.error('Erreur récupération prix BTC:', error);
      throw error;
    }
  }

  async getPortfolioValue(): Promise<number> {
    try {
      const wallet = await this.client.getWalletBalance({
        accountType: 'UNIFIED',
        coin: 'USDT',
      });
      return parseFloat(wallet.result.list[0].totalEquity);
    } catch (error) {
      this.logger.error('Erreur récupération valeur portfolio:', error);
      throw error;
    }
  }

  async openPosition(params: {
    type: 'LONG' | 'SHORT';
    symbol: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    portfolioPercentage?: number;
    leverage?: number;
  }): Promise<BybitOrder> {
    try {
      const {
        type,
        symbol,
        stopLoss,
        takeProfit,
        portfolioPercentage,
        leverage,
      } = params;
      const [portfolioValue, btcPrice] = await Promise.all([
        this.getPortfolioValue(),
        this.getBTCPrice(),
      ]);
      const usdtToTrade =
        portfolioValue * (portfolioPercentage / 100) * leverage;
      const btcQuantity = usdtToTrade / btcPrice;

      this.logger.log('Trading values:', {
        portfolioValue: `${portfolioValue} USDT`,
        usdtToTrade: `${usdtToTrade} USDT`,
        btcPrice: `${btcPrice} USDT`,
        btcQuantity: `${btcQuantity} BTC`,
      });

      await this.client.setLeverage({
        category: 'linear',
        symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString(),
      });

      const order = await this.client.submitOrder({
        category: 'linear',
        symbol,
        side: type === 'LONG' ? 'Buy' : 'Sell',
        orderType: 'Market',
        qty: btcQuantity.toFixed(3),
        stopLoss: stopLoss.toFixed(2),
        takeProfit: takeProfit.toFixed(2),
        timeInForce: 'GTC',
        positionIdx: 0,
      });
      if (order.retCode !== 0) {
        throw new Error(order.retMsg);
      } else {
        this.logger.log(`Ordre : ${JSON.stringify(order)}`);

        const bybitOrder: BybitOrder = {
          id: order.result.orderId,
          symbol,
          side: type === 'LONG' ? 'Buy' : 'Sell',
          orderType: 'Market',
          price: params.entryPrice,
          quantity: Number(btcQuantity.toFixed(3)),
          stopLoss,
          takeProfit,
          timestamp: new Date(),
          status: 'NEW',
        };

        await this.redisService.saveOrder(bybitOrder);
        return bybitOrder;
      }
    } catch (error) {
      this.logger.error('Erreur ouverture position:', error);
      throw error;
    }
  }

  async getStoredOrderHistory() {
    const orders = await this.redisService.getAllOrders();
    return {
      total: orders.length,
      orders: orders.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    };
  }
}
