// src/modules/database/redis.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { BybitOrder } from '../modules/bybit/bybit.service';

@Injectable()
export class RedisService {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async saveOrder(order: BybitOrder): Promise<void> {
    try {
      const key = `order:${order.id}`;
      await this.redis.hmset(key, {
        ...order,
        timestamp: order.timestamp.toISOString(),
      });
      await this.redis.sadd('orders', order.id);
      this.logger.log(`Ordre sauvegardé: ${order.id}`);
    } catch (error) {
      this.logger.error('Erreur sauvegarde ordre:', error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<BybitOrder | null> {
    try {
      const key = `order:${orderId}`;
      const order = await this.redis.hgetall(key);

      if (!Object.keys(order).length) {
        return null;
      }

      return {
        ...order,
        timestamp: new Date(order.timestamp),
        price: parseFloat(order.price),
        quantity: parseFloat(order.quantity),
        stopLoss: parseFloat(order.stopLoss),
        takeProfit: parseFloat(order.takeProfit),
      } as BybitOrder;
    } catch (error) {
      this.logger.error('Erreur récupération ordre:', error);
      throw error;
    }
  }

  async getAllOrders(): Promise<BybitOrder[]> {
    try {
      const orderIds = await this.redis.smembers('orders');
      const orders = await Promise.all(orderIds.map((id) => this.getOrder(id)));
      return orders.filter(Boolean) as BybitOrder[];
    } catch (error) {
      this.logger.error('Erreur récupération ordres:', error);
      throw error;
    }
  }
}
